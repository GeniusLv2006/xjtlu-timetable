#!/usr/bin/env bash
# Harden the VPS deployment after docker compose has started the containers.
set -euo pipefail

NPM_CONTAINER="${NPM_CONTAINER:-npm}"
APP_CONTAINER="${APP_CONTAINER:-xjtlu-timetable}"
SERVER_NAME="${SERVER_NAME:-timetable.xjtlu.uk}"
APP_PORT="${APP_PORT:-8080}"
HOST_PORT="${HOST_PORT:-8091}"

echo "==> Applying Nginx security headers for ${SERVER_NAME}..."
CONF_PATH="$(
  docker exec "$NPM_CONTAINER" sh -c \
    "grep -R -l 'server_name ${SERVER_NAME};' /data/nginx/proxy_host/*.conf 2>/dev/null | head -n 1"
)"

if [ -z "$CONF_PATH" ]; then
  echo "!! Nginx Proxy Manager config for ${SERVER_NAME} not found" >&2
  exit 1
fi

TMP_CONF="$(mktemp)"
TMP_STRIPPED="$(mktemp)"
TMP_UPDATED="$(mktemp)"
cleanup() {
  rm -f "$TMP_CONF" "$TMP_STRIPPED" "$TMP_UPDATED"
}
trap cleanup EXIT

docker cp "${NPM_CONTAINER}:${CONF_PATH}" "$TMP_CONF"

awk '
  /# BEGIN XJTLU TIMETABLE SECURITY HEADERS/ { skip = 1; next }
  /# END XJTLU TIMETABLE SECURITY HEADERS/ { skip = 0; next }
  !skip { print }
' "$TMP_CONF" > "$TMP_STRIPPED"

awk '
  BEGIN {
    inserted = 0
    block = "    # BEGIN XJTLU TIMETABLE SECURITY HEADERS\n" \
            "    proxy_hide_header X-Frame-Options;\n" \
            "    proxy_hide_header X-Content-Type-Options;\n" \
            "    proxy_hide_header Referrer-Policy;\n" \
            "    proxy_hide_header Permissions-Policy;\n" \
            "    add_header X-Frame-Options \"DENY\" always;\n" \
            "    add_header X-Content-Type-Options \"nosniff\" always;\n" \
            "    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;\n" \
            "    add_header Permissions-Policy \"camera=(), microphone=(), geolocation=()\" always;\n" \
            "    # END XJTLU TIMETABLE SECURITY HEADERS\n"
  }
  /# Proxy!/ && !inserted {
    printf "%s", block
    inserted = 1
  }
  { print }
  END {
    if (!inserted) exit 2
  }
' "$TMP_STRIPPED" > "$TMP_UPDATED"

if cmp -s "$TMP_CONF" "$TMP_UPDATED"; then
  echo "    Nginx security headers already current; reload skipped"
else
  docker cp "$TMP_UPDATED" "${NPM_CONTAINER}:${CONF_PATH}"
  docker exec "$NPM_CONTAINER" nginx -t
  docker exec "$NPM_CONTAINER" nginx -s reload
fi

echo "==> Applying Docker ingress firewall rule for ${APP_CONTAINER}:${APP_PORT}..."
APP_IP="$(
  docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$APP_CONTAINER"
)"

if [ -z "$APP_IP" ]; then
  echo "!! Could not resolve ${APP_CONTAINER} container IP" >&2
  exit 1
fi

if iptables -C DOCKER-USER ! -s 172.16.0.0/12 -d "$APP_IP" -p tcp --dport "$APP_PORT" -j DROP 2>/dev/null; then
  echo "    firewall rule already present"
else
  iptables -I DOCKER-USER 1 ! -s 172.16.0.0/12 -d "$APP_IP" -p tcp --dport "$APP_PORT" -j DROP
  echo "    firewall rule inserted"
fi

if iptables -C INPUT ! -s 172.16.0.0/12 -p tcp --dport "$HOST_PORT" -j DROP 2>/dev/null; then
  echo "    host port rule already present"
else
  iptables -I INPUT 1 ! -s 172.16.0.0/12 -p tcp --dport "$HOST_PORT" -j DROP
  echo "    host port rule inserted"
fi

echo "==> Deployment hardening complete."
