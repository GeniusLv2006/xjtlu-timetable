#!/usr/bin/env bash
# verify-rules.sh — 验证权限规则是否生效
# 用法：./verify-rules.sh <friends_visibility 的 timetable_id>
#
# 前提：已在本地创建以下三个测试用户并建立好友关系：
#   owner   = 课表所有者
#   friend  = 已建立 accepted friendship 的好友
#   stranger = 无关系的用户

set -euo pipefail

PB_URL="${PB_URL:-http://127.0.0.1:8091}"
TIMETABLE_ID="${1:-}"

if [ -z "$TIMETABLE_ID" ]; then
  echo "用法：$0 <timetable_id>"
  echo "请传入一条 visibility=friends 的课表记录 ID"
  exit 1
fi

# ── 工具 ─────────────────────────────────────────────────────────────────────

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "需要安装 $1"; exit 1; }; }
need_cmd curl; need_cmd jq

green()  { printf '\033[32m✓ %s\033[0m\n' "$*"; }
red()    { printf '\033[31m✗ %s\033[0m\n' "$*"; }
yellow() { printf '\033[33m? %s\033[0m\n' "$*"; }
section(){ printf '\n\033[1m── %s ──\033[0m\n' "$*"; }

login() {
  local email="$1" pass="$2"
  curl -sf -X POST "$PB_URL/api/collections/users/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$email\",\"password\":\"$pass\"}" \
    | jq -r '.token'
}

fetch_timetable() {
  local token="${1:-}"
  local auth_header=""
  [ -n "$token" ] && auth_header="-H \"Authorization: $token\""
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    ${token:+-H "Authorization: $token"} \
    "$PB_URL/api/collections/timetables/records/$TIMETABLE_ID")
  echo "$status"
}

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "$label → HTTP $actual（预期 $expected）"
  else
    red   "$label → HTTP $actual（预期 $expected）"
  fi
}

# ── 获取测试账号 ──────────────────────────────────────────────────────────────

echo "请输入测试账号信息（课表所有者、好友、陌生人各一个）"
echo "提示：可先在 Admin UI 手动创建这三个测试用户"
echo

read -rp "所有者 email: "   OWNER_EMAIL
read -rsp "所有者 password: " OWNER_PASS;   echo
read -rp "好友 email: "     FRIEND_EMAIL
read -rsp "好友 password: "  FRIEND_PASS;   echo
read -rp "陌生人 email: "   STRANGER_EMAIL
read -rsp "陌生人 password: " STRANGER_PASS; echo

echo
echo "→ 登录获取 token..."
OWNER_TOKEN=$(login "$OWNER_EMAIL" "$OWNER_PASS")
FRIEND_TOKEN=$(login "$FRIEND_EMAIL" "$FRIEND_PASS")
STRANGER_TOKEN=$(login "$STRANGER_EMAIL" "$STRANGER_PASS")
echo "  token 获取完成"

# ── 测试 timetables（visibility = friends）────────────────────────────────────

section "timetables — visibility=friends"
echo "课表 ID：$TIMETABLE_ID"
echo "（确保此课表 visibility=friends，且 friend 和 owner 之间有 accepted friendship）"
echo

check "未登录访问" "403" "$(fetch_timetable '')"
check "本人访问" "200" "$(fetch_timetable "$OWNER_TOKEN")"
check "好友访问" "200" "$(fetch_timetable "$FRIEND_TOKEN")"
check "陌生人访问" "403" "$(fetch_timetable "$STRANGER_TOKEN")"

# ── 测试 courses 写权限 ───────────────────────────────────────────────────────

section "courses — 陌生人写权限"
# 取该课表第一条课程记录
COURSE_ID=$(curl -sf "$PB_URL/api/collections/courses/records?filter=timetable='$TIMETABLE_ID'&perPage=1" \
  -H "Authorization: $OWNER_TOKEN" | jq -r '.items[0].id // empty')

if [ -z "$COURSE_ID" ]; then
  yellow "该课表暂无课程记录，跳过 courses 写权限测试"
else
  echo "课程 ID：$COURSE_ID"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "$PB_URL/api/collections/courses/records/$COURSE_ID" \
    -H "Authorization: $STRANGER_TOKEN")
  check "陌生人 DELETE course" "403" "$STATUS"
fi

# ── 测试 friendships Update 规则 ─────────────────────────────────────────────

section "friendships — 只有 to_user 能接受"
# 查找 owner → friend 的 pending friendship
FRIENDSHIP_ID=$(curl -sf \
  "$PB_URL/api/collections/friendships/records?filter=from_user.id='$(curl -sf "$PB_URL/api/collections/users/records?filter=email='$OWNER_EMAIL'" -H "Authorization: $OWNER_TOKEN" | jq -r '.items[0].id')'" \
  -H "Authorization: $OWNER_TOKEN" | jq -r '.items[0].id // empty')

if [ -z "$FRIENDSHIP_ID" ]; then
  yellow "未找到 friendship 记录，跳过此测试"
  yellow "可手动测试：从 owner 向 friend 发送好友请求后再运行"
else
  # 发起方（owner）尝试自己接受
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    "$PB_URL/api/collections/friendships/records/$FRIENDSHIP_ID" \
    -H "Authorization: $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"accepted"}')
  check "发起方自己接受（应拒绝）" "403" "$STATUS"

  # 被邀请方（friend）接受
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    "$PB_URL/api/collections/friendships/records/$FRIENDSHIP_ID" \
    -H "Authorization: $FRIEND_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"accepted"}')
  check "被邀请方接受（应允许）" "200" "$STATUS"
fi

# ── 测试 semesters 公开读 ─────────────────────────────────────────────────────

section "semesters — 未登录公开读"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PB_URL/api/collections/semesters/records")
check "未登录读学期列表" "200" "$STATUS"

echo
echo "验证完成。"
