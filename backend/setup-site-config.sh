#!/bin/bash
# setup-site-config.sh — 一次性创建 site_config collection
#
# 用法: bash setup-site-config.sh [admin_email]
# 密码通过隐藏提示读取，也可使用 PB_ADMIN_PASS 环境变量。
# VPS PocketBase 地址: http://172.17.0.1:8091

set -e

BASE="http://172.17.0.1:8091"
ADMIN_EMAIL="${1:-${PB_ADMIN_EMAIL:-}}"
if [ -z "$ADMIN_EMAIL" ]; then
  read -r -p "管理员邮箱: " ADMIN_EMAIL
fi
ADMIN_PWD="${PB_ADMIN_PASS:-}"
if [ -z "$ADMIN_PWD" ]; then
  read -r -s -p "管理员密码: " ADMIN_PWD
  echo
fi

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
        "name": "require_invite",
        "type": "bool",
        "required": false,
        "options": {}
      },
      {
        "name": "site_notice",
        "type": "text",
        "required": false,
        "options": {"min": null, "max": null, "pattern": ""}
      },
      {
        "name": "ical_risk_enabled",
        "type": "bool",
        "required": false,
        "options": {}
      },
      {
        "name": "ical_rate_limit_enabled",
        "type": "bool",
        "required": false,
        "options": {}
      },
      {
        "name": "ical_ip_anomaly_enabled",
        "type": "bool",
        "required": false,
        "options": {}
      },
      {
        "name": "ical_rate_window_minutes",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      },
      {
        "name": "ical_rate_max_requests",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      },
      {
        "name": "ical_suspicious_ip_prefixes",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      },
      {
        "name": "ical_revoke_ip_prefixes",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      },
      {
        "name": "ical_suspicious_grace_hours",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      },
      {
        "name": "ical_empty_calendar_hours",
        "type": "number",
        "required": false,
        "options": {"min": 1, "max": null, "noDecimal": true}
      }
    ]
  }' > /dev/null && echo "    collection 创建成功" || echo "    (collection 可能已存在，跳过)"

# 3. 插入初始记录
echo "==> 插入初始配置记录..."
curl -sf -X POST "$BASE/api/collections/site_config/records" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"registration_open": true, "require_invite": true, "allowed_email_suffixes": "", "site_notice": "", "ical_risk_enabled": true, "ical_rate_limit_enabled": true, "ical_ip_anomaly_enabled": true, "ical_rate_window_minutes": 10, "ical_rate_max_requests": 5, "ical_suspicious_ip_prefixes": 4, "ical_revoke_ip_prefixes": 6, "ical_suspicious_grace_hours": 48, "ical_empty_calendar_hours": 48}' \
  > /dev/null && echo "    初始记录创建成功" || echo "    (记录可能已存在，跳过)"

echo "==> 完成！请在管理后台「系统设置」tab 中配置。"
