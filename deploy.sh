#!/usr/bin/env bash
# Deploy an exact reviewed main revision on the VPS.
set -Eeuo pipefail

REVISION="${1:-${DEPLOY_REVISION:-}}"
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BACKUP_ROOT="${BACKUP_ROOT:-$(dirname "$REPO_DIR")/xjtlu-timetable-backups}"
DATA_DIR="$REPO_DIR/backend/pb_data"
DB_PATH="$DATA_DIR/data.db"
IMAGE_REPOSITORY="ghcr.io/geniuslv2006/xjtlu-timetable"
APP_CONTAINER="xjtlu-timetable"
RUNTIME_UID_GID="10001:10001"
COMPOSE_FILES=(
  -f "$REPO_DIR/docker-compose.yml"
  -f "$REPO_DIR/docker-compose.official.yml"
)

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

compose_with_tag() {
  local tag="$1"
  shift
  env IMAGE_TAG="$tag" docker compose "${COMPOSE_FILES[@]}" "$@"
}

if [[ ! "$REVISION" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash deploy.sh <40-character-main-commit>" >&2
  exit 2
fi

for command in curl docker git sqlite3 sha256sum; do
  command -v "$command" >/dev/null || {
    echo "Missing required command: $command" >&2
    exit 2
  }
done

cd "$REPO_DIR"

export IMAGE_REPOSITORY
export IMAGE_TAG="$REVISION"
export BIND_ADDRESS="172.17.0.1"
export HOST_PORT="8091"
export DATA_DIR
export COMPOSE_PROJECT_NAME="xjtlu-timetable"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy from a modified tracked working tree." >&2
  exit 2
fi

echo "==> Fetching and validating reviewed revision..."
git fetch origin main
REMOTE_MAIN="$(git rev-parse origin/main)"
if [ "$REVISION" != "$REMOTE_MAIN" ]; then
  echo "Revision must exactly match current origin/main ($REMOTE_MAIN)." >&2
  exit 2
fi
if [ "$(git branch --show-current)" != "main" ] || [ "$(git rev-parse HEAD)" != "$REVISION" ]; then
  echo "The local main checkout must already be at $REVISION." >&2
  exit 2
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/pre-${REVISION:0:12}-$STAMP"
ROLLBACK_TAG="rollback-$STAMP"
ROLLBACK_ARMED=0
HAD_DATABASE=0
HAD_PREVIOUS_IMAGE=0

rollback() {
  local status=$?
  trap - ERR

  if [ "$ROLLBACK_ARMED" -eq 1 ]; then
    set +e
    echo "!! Deployment failed; restoring the previous database and image." >&2
    compose stop app

    if [ "$HAD_DATABASE" -eq 1 ]; then
      rm -f "$DB_PATH-shm" "$DB_PATH-wal"
      cp "$BACKUP_DIR/data.db" "$DB_PATH"
    fi
    chown -R "$RUNTIME_UID_GID" "$DATA_DIR"

    if [ "$HAD_PREVIOUS_IMAGE" -eq 1 ]; then
      compose_with_tag "$ROLLBACK_TAG" up -d --no-build --pull never
    else
      compose rm -f app
    fi
    echo "!! Rollback attempted with backup: $BACKUP_DIR" >&2
  fi

  exit "$status"
}
trap rollback ERR

echo "==> Creating a consistent SQLite backup..."
mkdir -p "$BACKUP_DIR" "$DATA_DIR"
if [ -f "$DB_PATH" ]; then
  HAD_DATABASE=1
  sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/data.db'"
  test "$(sqlite3 "$BACKUP_DIR/data.db" 'PRAGMA integrity_check;')" = "ok"
  sha256sum "$BACKUP_DIR/data.db" > "$BACKUP_DIR/SHA256SUMS"
else
  : > "$BACKUP_DIR/NEW_INSTALL"
fi

if docker inspect "$APP_CONTAINER" >/dev/null 2>&1; then
  HAD_PREVIOUS_IMAGE=1
  PREVIOUS_IMAGE_ID="$(docker inspect "$APP_CONTAINER" --format '{{.Image}}')"
  docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE_REPOSITORY:$ROLLBACK_TAG"
  printf '%s\n' "$IMAGE_REPOSITORY:$ROLLBACK_TAG" > "$BACKUP_DIR/ROLLBACK_IMAGE"
fi

echo "==> Validating configuration and pulling the exact image..."
compose config -q
compose pull

# The production image runs as uid/gid 10001 and the bind mount must be
# writable before Docker starts the non-root process.
chown -R "$RUNTIME_UID_GID" "$DATA_DIR"

echo "==> Starting $REVISION..."
ROLLBACK_ARMED=1
compose up -d --no-build

for _ in $(seq 1 90); do
  STATUS="$(docker inspect "$APP_CONTAINER" --format '{{.State.Status}}' 2>/dev/null || true)"
  HEALTH="$(
    docker inspect "$APP_CONTAINER" \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
      2>/dev/null || true
  )"

  if [ "$STATUS" = "running" ] && [ "$HEALTH" = "healthy" ]; then
    break
  fi
  if [ "$STATUS" = "exited" ] || [ "$STATUS" = "dead" ] || [ "$HEALTH" = "unhealthy" ]; then
    docker logs --tail 50 "$APP_CONTAINER" >&2 || true
    false
  fi
  sleep 1
done

test "$STATUS" = "running"
test "$HEALTH" = "healthy"
test "$(docker inspect "$APP_CONTAINER" --format '{{.Config.User}}')" = "$RUNTIME_UID_GID"
docker exec "$APP_CONTAINER" wget -q -O /dev/null http://127.0.0.1:8080/api/health
test "$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')" = "ok"

# The application and database are now safe. A later reverse-proxy hardening
# error should be reported without replacing a healthy reviewed deployment.
ROLLBACK_ARMED=0

echo "==> Reapplying reverse-proxy and ingress hardening..."
bash backend/harden-deployment.sh

printf '%s\n' "$REVISION" > "$BACKUP_DIR/DEPLOYED_REVISION"
printf '%s\n' "$IMAGE_REPOSITORY:$REVISION" > "$BACKUP_DIR/DEPLOYED_IMAGE"

echo "==> Deployment complete."
compose ps
echo "    Backup and rollback record: $BACKUP_DIR"
