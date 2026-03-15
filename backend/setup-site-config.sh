#!/bin/bash
# setup-site-config.sh — 一次性创建 site_config collection
#
# 用法: bash setup-site-config.sh <admin_email> <admin_password>
# VPS PocketBase 地址: http://172.17.0.1:8091

set -e

BASE="http://172.17.0.1:8091"
ADMIN_EMAIL="${1:?请传入管理员邮箱，例: bash setup-site-config.sh admin@example.com password}"
ADMIN_PWD="${2:?请传入管理员密码}"

# 1. 获取 admin token
echo "==> 获取管理员 token..."
TOKEN=$(curl -sf -X POST "$BASE/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PWD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "    Token 获取成功"

# 2. 创建 site_config collection
echo "==> 创建 site_config collection..."
curl -sf -X POST "$BASE/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site_config",
    "type": "base",
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "schema": [
      {
        "name": "registration_open",
        "type": "bool",
        "required": false,
        "options": {}
      },
      {
        "name": "allowed_email_suffixes",
        "type": "text",
        "required": false,
        "options": {"min": null, "max": null, "pattern": ""}
      },
      {
        "name": "site_notice",
        "type": "text",
        "required": false,
        "options": {"min": null, "max": null, "pattern": ""}
      }
    ]
  }' > /dev/null && echo "    collection 创建成功" || echo "    (collection 可能已存在，跳过)"

# 3. 插入初始记录
echo "==> 插入初始配置记录..."
curl -sf -X POST "$BASE/api/collections/site_config/records" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"registration_open": true, "allowed_email_suffixes": "", "site_notice": ""}' \
  > /dev/null && echo "    初始记录创建成功" || echo "    (记录可能已存在，跳过)"

echo "==> 完成！请在管理后台「系统设置」tab 中配置。"
