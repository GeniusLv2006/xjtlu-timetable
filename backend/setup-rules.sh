#!/usr/bin/env bash
# setup-rules.sh — 通过 PocketBase Admin API 批量配置 collection 权限规则
# 用法：
#   ./setup-rules.sh                      # 使用默认地址 http://127.0.0.1:8091
#   PB_URL=https://timetable.xjtlu.uk ./setup-rules.sh
#   PB_ADMIN_EMAIL=me@x.com PB_ADMIN_PASS=secret ./setup-rules.sh

set -euo pipefail

PB_URL="${PB_URL:-http://127.0.0.1:8091}"

# ── 获取 Admin 凭证 ──────────────────────────────────────────────────────────

if [ -z "${PB_ADMIN_EMAIL:-}" ]; then
  read -rp "Admin email: " PB_ADMIN_EMAIL
fi
if [ -z "${PB_ADMIN_PASS:-}" ]; then
  read -rsp "Admin password: " PB_ADMIN_PASS
  echo
fi

# ── 工具函数 ─────────────────────────────────────────────────────────────────

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "需要安装 $1"; exit 1; }; }
need_cmd curl
need_cmd jq

green()  { printf '\033[32m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

# ── 1. 获取 Admin token ──────────────────────────────────────────────────────

echo "→ 正在登录 Admin..."
AUTH_RESP=$(curl -sf -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  red "登录失败，请检查邮箱和密码"
  exit 1
fi
green "登录成功"

# ── 2. 获取所有 collection ID ────────────────────────────────────────────────

echo "→ 拉取 collection 列表..."
COLLECTIONS=$(curl -sf "$PB_URL/api/collections?perPage=100" \
  -H "Authorization: $ADMIN_TOKEN")

get_id() {
  echo "$COLLECTIONS" | jq -r ".items[] | select(.name == \"$1\") | .id"
}

ID_TIMETABLES=$(get_id "timetables")
ID_COURSES=$(get_id "courses")
ID_FRIENDSHIPS=$(get_id "friendships")
ID_SEMESTERS=$(get_id "semesters")
ID_ICAL_TOKENS=$(get_id "ical_tokens")

for name in timetables courses friendships semesters ical_tokens; do
  id_var="ID_$(echo "$name" | tr '[:lower:]' '[:upper:]')"
  if [ -z "${!id_var}" ]; then
    red "找不到 collection: $name（是否已通过 Admin UI 导入 schema.json？）"
    exit 1
  fi
  echo "  $name → ${!id_var}"
done

# ── 3. PATCH 规则的通用函数 ──────────────────────────────────────────────────

patch_rules() {
  local name="$1"
  local id="$2"
  local payload="$3"

  echo "→ 设置 $name 规则..."
  RESP=$(curl -sf -X PATCH "$PB_URL/api/collections/$id" \
    -H "Authorization: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload")

  # 验证返回的规则是否写入成功
  LIST_RULE=$(echo "$RESP" | jq -r '.listRule // "null"')
  yellow "  listRule → $LIST_RULE"
  green  "  $name ✓"
}

# ── 4. timetables ────────────────────────────────────────────────────────────
#
# List/View：自己 | public | 已接受的好友
# Create：已登录即可
# Update/Delete：仅所有者

TIMETABLES_RULE='@request.auth.id = user.id || visibility = "public" || (visibility = "friends" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= user.id && @collection.friendships.status ?= "accepted") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= user.id && @collection.friendships.status ?= "accepted")))'

patch_rules "timetables" "$ID_TIMETABLES" "$(jq -n \
  --arg lr "$TIMETABLES_RULE" \
  --arg vr "$TIMETABLES_RULE" \
  --arg cr '@request.auth.id != ""' \
  --arg ur '@request.auth.id = user.id' \
  --arg dr '@request.auth.id = user.id' \
  '{listRule:$lr, viewRule:$vr, createRule:$cr, updateRule:$ur, deleteRule:$dr}')"

# ── 5. courses ───────────────────────────────────────────────────────────────
#
# List/View：跟随所属课表可见性
# Create/Update/Delete：课表所有者

COURSES_RULE='@request.auth.id = timetable.user.id || timetable.visibility = "public" || (timetable.visibility = "friends" && ((@collection.friendships.from_user.id ?= @request.auth.id && @collection.friendships.to_user.id ?= timetable.user.id && @collection.friendships.status ?= "accepted") || (@collection.friendships.to_user.id ?= @request.auth.id && @collection.friendships.from_user.id ?= timetable.user.id && @collection.friendships.status ?= "accepted")))'
COURSES_WRITE='@request.auth.id = timetable.user.id'

patch_rules "courses" "$ID_COURSES" "$(jq -n \
  --arg lr "$COURSES_RULE" \
  --arg vr "$COURSES_RULE" \
  --arg cr "$COURSES_WRITE" \
  --arg ur "$COURSES_WRITE" \
  --arg dr "$COURSES_WRITE" \
  '{listRule:$lr, viewRule:$vr, createRule:$cr, updateRule:$ur, deleteRule:$dr}')"

# ── 6. friendships ───────────────────────────────────────────────────────────
#
# List/View：双方可见
# Create：发起方
# Update：只有被邀请方能接受（防止发起方自己接受）
# Delete：双方均可（撤回/解除）

patch_rules "friendships" "$ID_FRIENDSHIPS" "$(jq -n \
  --arg lr '@request.auth.id = from_user.id || @request.auth.id = to_user.id' \
  --arg vr '@request.auth.id = from_user.id || @request.auth.id = to_user.id' \
  --arg cr '@request.auth.id = from_user.id' \
  --arg ur '@request.auth.id = to_user.id' \
  --arg dr '@request.auth.id = from_user.id || @request.auth.id = to_user.id' \
  '{listRule:$lr, viewRule:$vr, createRule:$cr, updateRule:$ur, deleteRule:$dr}')"

# ── 7. semesters ─────────────────────────────────────────────────────────────
#
# List/View：所有人可读（含未登录）—— 空字符串 = allow all
# Create/Update/Delete：null = 仅 Admin

patch_rules "semesters" "$ID_SEMESTERS" \
  '{"listRule":"","viewRule":"","createRule":null,"updateRule":null,"deleteRule":null}'

# ── 8. ical_tokens ───────────────────────────────────────────────────────────
#
# List/View/Create/Delete：仅本人
# Update：禁止（token 只能删除后重建）

patch_rules "ical_tokens" "$ID_ICAL_TOKENS" "$(jq -n \
  --arg lr '@request.auth.id = user.id' \
  --arg vr '@request.auth.id = user.id' \
  --arg cr '@request.auth.id != ""' \
  --arg dr '@request.auth.id = user.id' \
  '{listRule:$lr, viewRule:$vr, createRule:$cr, updateRule:null, deleteRule:$dr}')"

# ── 完成 ─────────────────────────────────────────────────────────────────────

echo
green "═══════════════════════════════════════"
green " 所有权限规则已配置完成 ✓"
green "═══════════════════════════════════════"
echo
echo "验证命令（替换变量后运行）："
echo "  bash verify-rules.sh <timetable_id>"
