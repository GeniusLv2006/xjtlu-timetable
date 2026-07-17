#!/usr/bin/env bash
# Add must_change_pwd boolean field to users collection
# Usage: ./setup-must-change-pwd.sh [pb_url] [admin_email]
# The password is read from a hidden prompt or PB_ADMIN_PASS.

set -euo pipefail

PB_URL="${1:-http://localhost:8091}"
ADMIN_EMAIL="${2:-${PB_ADMIN_EMAIL:-}}"
if [ -z "$ADMIN_EMAIL" ]; then
  read -r -p "Admin email: " ADMIN_EMAIL
fi
ADMIN_PASSWORD="${PB_ADMIN_PASS:-}"
if [ -z "$ADMIN_PASSWORD" ]; then
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  echo
fi

echo "→ Authenticating with PocketBase at $PB_URL ..."
TOKEN=$(curl -sf "$PB_URL/api/admins/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Admin authentication failed"
  exit 1
fi
echo "✓ Authenticated"

# Fetch users collection to detect PocketBase version (v0.20 uses schema[], v0.22+ uses fields[])
COLLECTION=$(curl -sf "$PB_URL/api/collections/users" \
  -H "Authorization: $TOKEN")

# Check if field already exists
if echo "$COLLECTION" | grep -q '"must_change_pwd"'; then
  echo "✓ must_change_pwd field already exists — nothing to do"
  exit 0
fi

# Detect API format
if echo "$COLLECTION" | grep -q '"fields"'; then
  echo "→ Detected PocketBase v0.22+ (fields format)"
  FIELD_JSON='{"type":"bool","name":"must_change_pwd","required":false}'
  PATCH_KEY="fields"
else
  echo "→ Detected PocketBase v0.20 (schema format)"
  FIELD_JSON='{"type":"bool","name":"must_change_pwd","required":false,"options":{}}'
  PATCH_KEY="schema"
fi

# Build patch payload: append the new field to existing array
EXISTING_FIELDS=$(echo "$COLLECTION" | python3 -c "
import json, sys
data = json.load(sys.stdin)
key = '$PATCH_KEY'
fields = data.get(key, [])
new_field = json.loads('$FIELD_JSON')
fields.append(new_field)
print(json.dumps({key: fields}))
")

echo "→ Patching users collection ..."
RESULT=$(curl -sf -X PATCH "$PB_URL/api/collections/users" \
  -H "Authorization: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$EXISTING_FIELDS")

if echo "$RESULT" | grep -q '"must_change_pwd"'; then
  echo "✓ must_change_pwd field added successfully"
else
  echo "✗ Patch may have failed. Response:"
  echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
  exit 1
fi
