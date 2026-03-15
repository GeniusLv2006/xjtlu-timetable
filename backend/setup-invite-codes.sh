#!/usr/bin/env bash
# setup-invite-codes.sh
# 用法：./setup-invite-codes.sh <admin-email> <admin-password>
#
# 功能：
#   1. 开启用户自注册（users collection createRule → ""）
#   2. 在 users collection 新增邀请码权限字段
#   3. 创建 invite_codes collection

set -e
cd "$(dirname "$0")"

ADMIN_EMAIL="${1:?请传入管理员邮箱}"
ADMIN_PWD="${2:?请传入管理员密码}"
BASE="http://127.0.0.1:8091"

echo "==> 获取管理员 token…"
TOKEN=$(curl -s -X POST "$BASE/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PWD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "    Token 获取成功"

python3 - <<PYEOF
import json, urllib.request, urllib.error, sys

token = "$TOKEN"
base  = "$BASE"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req  = urllib.request.Request(
        base + path, data=data, method=method,
        headers={"Authorization": token, "Content-Type": "application/json"}
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  HTTP {e.code}: {msg}", file=sys.stderr)
        raise

# ── 1. 修改 users collection ──────────────────────────────────────────────
print("==> 更新 users collection…")
col    = api("GET",  "/api/collections/users")
schema = col.get("schema", [])
existing = {f["name"] for f in schema}

new_fields = [
    {"type": "bool",   "name": "can_invite",          "required": False, "options": {}},
    {"type": "number", "name": "invite_quota",         "required": False,
     "options": {"min": 0, "max": None, "noDecimal": True}},
    {"type": "number", "name": "invite_max_uses",      "required": False,
     "options": {"min": 0, "max": None, "noDecimal": True}},
    {"type": "number", "name": "invite_validity_days", "required": False,
     "options": {"min": 0, "max": None, "noDecimal": True}},
]
added = 0
for f in new_fields:
    if f["name"] not in existing:
        schema.append(f)
        added += 1
        print(f"    + {f['name']}")
    else:
        print(f"    = {f['name']} (已存在)")

# 开启公开注册：createRule = "" (空字符串 = 所有人可创建，hook 校验邀请码)
col["schema"]     = schema
col["createRule"] = ""
api("PATCH", f"/api/collections/{col['id']}", col)
print(f"    Done — 新增 {added} 个字段，createRule 已设为空（允许注册）")

# ── 2. 创建 invite_codes collection ──────────────────────────────────────
print("==> 创建 invite_codes collection…")
try:
    api("GET", "/api/collections/invite_codes")
    print("    invite_codes 已存在，跳过。")
except urllib.error.HTTPError as e:
    if e.code != 404:
        raise

    # 先获取 users collection 的真实 ID，供 relation 使用
    users_col = api("GET", "/api/collections/users")
    users_id  = users_col["id"]

    new_col = {
        "name":       "invite_codes",
        "type":       "base",
        "listRule":   "created_by = @request.auth.id",
        "viewRule":   "created_by = @request.auth.id",
        "createRule": "@request.auth.id != \"\"",
        "updateRule": None,
        "deleteRule": "created_by = @request.auth.id",
        "schema": [
            {
                "type": "text", "name": "code", "required": True,
                "options": {"min": 4, "max": 32, "pattern": ""}
            },
            {
                "type": "relation", "name": "created_by", "required": False,
                "options": {
                    "collectionId": users_id,
                    "cascadeDelete": False,
                    "minSelect": None, "maxSelect": 1,
                    "displayFields": []
                }
            },
            {
                "type": "number", "name": "max_uses", "required": False,
                "options": {"min": 0, "max": None, "noDecimal": True}
            },
            {
                "type": "number", "name": "uses", "required": False,
                "options": {"min": 0, "max": None, "noDecimal": True}
            },
            {
                "type": "date", "name": "expires_at", "required": False,
                "options": {"min": "", "max": ""}
            },
            {
                "type": "bool", "name": "is_active", "required": False,
                "options": {}
            },
            {
                "type": "text", "name": "note", "required": False,
                "options": {"min": None, "max": 200, "pattern": ""}
            },
        ],
        "indexes": [
            "CREATE UNIQUE INDEX idx_invite_code ON invite_codes (code)"
        ]
    }
    result = api("POST", "/api/collections", new_col)
    print(f"    invite_codes 已创建，ID: {result['id']}")

print()
print("Setup 完成！")
print("  - 用户自注册已开启（invite hook 负责校验邀请码）")
print("  - users 新增字段：can_invite / invite_quota / invite_max_uses / invite_validity_days")
print("  - 新集合：invite_codes")
PYEOF
