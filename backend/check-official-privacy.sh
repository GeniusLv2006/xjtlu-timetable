#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-https://timetable.xjtlu.uk}"
PRIVACY_URL="$BASE_URL/privacy"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

curl -fsS \
  --retry 2 \
  --connect-timeout 10 \
  --max-time 30 \
  -D "$WORK_DIR/headers" \
  -o "$WORK_DIR/privacy.html" \
  "$PRIVACY_URL"

grep -Fq '<title>Terms of Use and Privacy Notice | timetable.xjtlu.uk</title>' \
  "$WORK_DIR/privacy.html"
PAGE_VERSION="$(
  sed -n \
    's/.*<meta name="xjtlu-timetable-legal-notice-version" content="\([^"]*\)".*/\1/p' \
    "$WORK_DIR/privacy.html" |
    head -n 1
)"
test -n "$PAGE_VERSION"
grep -Eiq "^content-security-policy: .*script-src 'self'" "$WORK_DIR/headers"

if grep -Eiq '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' \
  "$WORK_DIR/privacy.html"; then
  echo "Privacy check failed: edge HTML contains a clear-text email address." >&2
  exit 1
fi

CFEMAIL_COUNT="$(
  grep -Eo 'data-cfemail=' "$WORK_DIR/privacy.html" | wc -l | tr -d '[:space:]'
)"
test "$CFEMAIL_COUNT" = "2"
grep -Fq 'email-decode.min.js' "$WORK_DIR/privacy.html"

curl -fsS \
  --retry 2 \
  --connect-timeout 10 \
  --max-time 30 \
  "$BASE_URL/api/collections/site_config/records?perPage=1&fields=legal_notice_url,legal_notice_version" \
  > "$WORK_DIR/site-config.json"
grep -Fq '"legal_notice_url":"https://timetable.xjtlu.uk/privacy"' \
  "$WORK_DIR/site-config.json"
CONFIG_VERSION="$(
  sed -n 's/.*"legal_notice_version":"\([^"]*\)".*/\1/p' \
    "$WORK_DIR/site-config.json"
)"
test -n "$CONFIG_VERSION"
test "$PAGE_VERSION" = "$CONFIG_VERSION"

curl -fsS \
  --retry 2 \
  --connect-timeout 10 \
  --max-time 30 \
  -o /dev/null \
  "$BASE_URL/api/health"

echo "Privacy endpoint validation passed: $PRIVACY_URL (version $PAGE_VERSION)"
