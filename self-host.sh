#!/usr/bin/env bash
# Manage a release-based self-hosted XJTLU Timetable installation.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
HEALTH_ATTEMPTS="${SELF_HOST_HEALTH_ATTEMPTS:-90}"

die() {
  echo "Error: $*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

env_value() {
  local key="$1"
  local fallback="$2"
  local value=""
  if [ -f "$ENV_FILE" ]; then
    value="$(
      awk -F= -v key="$key" '
        $0 !~ /^[[:space:]]*#/ && $1 == key {
          sub(/^[^=]*=/, "")
          print
          exit
        }
      ' "$ENV_FILE"
    )"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
  fi
  printf '%s' "${value:-$fallback}"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.yml" "$@"
}

compose_with_tag() {
  local tag="$1"
  shift
  env IMAGE_TAG="$tag" \
    docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.yml" "$@"
}

resolve_data_dir() {
  local configured
  configured="$(env_value DATA_DIR ./data)"
  if [[ "$configured" = /* ]]; then
    printf '%s' "$configured"
  else
    printf '%s/%s' "$ROOT_DIR" "${configured#./}"
  fi
}

safe_data_dir() {
  local data_dir root_dir
  data_dir="$(resolve_data_dir)"
  [ -d "$data_dir" ] || die "data directory does not exist: $data_dir"
  data_dir="$(cd "$data_dir" && pwd -P)"
  root_dir="$(cd "$ROOT_DIR" && pwd -P)"
  [ "$data_dir" != "/" ] || die "refusing to operate on the filesystem root"
  [ "$data_dir" != "$root_dir" ] ||
    die "DATA_DIR must be a dedicated subdirectory, not the installation root"
  printf '%s' "$data_dir"
}

local_base_url() {
  local address port
  address="$(env_value BIND_ADDRESS 127.0.0.1)"
  port="$(env_value HOST_PORT 8091)"
  case "$address" in
    0.0.0.0 | "::" | "[::]") address="127.0.0.1" ;;
  esac
  printf 'http://%s:%s' "$address" "$port"
}

wait_for_health() {
  local base_url
  base_url="$(local_base_url)"
  for _ in $(seq 1 "$HEALTH_ATTEMPTS"); do
    if curl --fail --silent --show-error \
      "$base_url/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  compose logs --tail 80 app >&2 || true
  echo "Error: application did not become healthy at $base_url" >&2
  return 1
}

prepare_data_dir() {
  local data_dir
  data_dir="$(resolve_data_dir)"
  mkdir -p "$data_dir"
  data_dir="$(safe_data_dir)"
  compose run --rm --no-deps -T --user 0 --cap-add CHOWN --entrypoint sh app \
    -c 'chown -R 10001:10001 /pb/pb_data'
}

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "Created $ENV_FILE from .env.example"
  fi
}

require_release_tag() {
  local tag
  tag="$(env_value IMAGE_TAG "")"
  [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    die "IMAGE_TAG must be an exact vMAJOR.MINOR.PATCH release"
}

json_request() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local payload="${4:-}"
  local base_url
  base_url="$(local_base_url)"

  local args=(
    --fail
    --silent
    --show-error
    --request "$method"
    --header "Content-Type: application/json"
  )
  if [ -n "$token" ]; then
    args+=(--header "Authorization: $token")
  fi
  if [ -n "$payload" ]; then
    printf '%s' "$payload" |
      curl "${args[@]}" --data-binary @- "$base_url$path"
  else
    curl "${args[@]}" "$base_url$path"
  fi
}

authenticate_superuser() {
  local email="$1"
  local password="$2"
  local payload response
  payload="$(jq -cn --arg identity "$email" --arg password "$password" \
    '{identity:$identity,password:$password}')"
  response="$(
    json_request POST \
      "/api/collections/_superusers/auth-with-password" \
      "" \
      "$payload"
  )"
  printf '%s' "$response" | jq -er '.token'
}

prompt_secret() {
  local prompt="$1"
  local first second
  read -r -s -p "$prompt: " first
  echo
  read -r -s -p "Confirm password: " second
  echo
  [ "$first" = "$second" ] || die "passwords do not match"
  [ "${#first}" -ge 10 ] || die "password must contain at least 10 characters"
  REPLY="$first"
}

init_installation() {
  need docker
  need curl
  need jq
  need sqlite3
  need stat

  ensure_env
  require_release_tag
  compose config -q </dev/null
  compose pull </dev/null
  prepare_data_dir </dev/null
  compose up -d --no-build </dev/null
  wait_for_health

  local public_config initialization_stage
  echo "Application is healthy; checking initialization state."
  public_config="$(
    json_request GET "/api/collections/site_config/records?perPage=2"
  )"
  [ "$(printf '%s' "$public_config" | jq '.totalItems')" -eq 1 ] ||
    die "site_config must contain exactly one record"
  initialization_stage="$(printf '%s' "$public_config" |
    jq -r '.items[0].initialization_stage // 0')"
  if [ "$(printf '%s' "$public_config" |
    jq -r '.items[0].initialization_complete // false')" = "true" ]; then
    echo "Initialization is already complete; existing administrators and data were not changed."
    check_installation
    return
  fi

  local email password token
  read -r -p "Superuser email: " email
  [[ "$email" = *@* ]] || die "invalid superuser email"
  prompt_secret "Superuser password"
  password="$REPLY"
  echo "Checking the requested superuser account."

  if token="$(authenticate_superuser "$email" "$password" 2>/dev/null)"; then
    echo "Superuser already exists; keeping the existing account."
  else
    [ "$initialization_stage" -lt 1 ] ||
      die "use the credentials of the existing superuser to resume initialization"
    compose exec -T app ./pocketbase superuser create "$email" "$password"
    token="$(authenticate_superuser "$email" "$password")"
    echo "Superuser created."
  fi

  local config_response config_id
  config_response="$(
    json_request GET "/api/collections/site_config/records?perPage=2" "$token"
  )"
  [ "$(printf '%s' "$config_response" | jq '.totalItems')" -eq 1 ] ||
    die "site_config must contain exactly one record"
  config_id="$(printf '%s' "$config_response" | jq -er '.items[0].id')"
  if [ "$initialization_stage" -lt 1 ]; then
    json_request PATCH \
      "/api/collections/site_config/records/$config_id" \
      "$token" \
      '{"initialization_stage":1}' >/dev/null
    initialization_stage=1
  fi

  local registration_open require_invite
  if [ "$initialization_stage" -lt 2 ]; then
    local instance_name operator_name contact_email source_url legal_url
    read -r -p "Instance name [XJTLU Timetable]: " instance_name
    instance_name="${instance_name:-XJTLU Timetable}"
    read -r -p "Operator name (optional): " operator_name
    read -r -p "Operator contact email (optional): " contact_email
    if [ -n "$contact_email" ] && [[ "$contact_email" != *@* ]]; then
      die "invalid operator contact email"
    fi
    read -r -p \
      "Source code URL [https://github.com/GeniusLv2006/xjtlu-timetable]: " \
      source_url
    source_url="${source_url:-https://github.com/GeniusLv2006/xjtlu-timetable}"
    read -r -p "External legal notice URL (optional): " legal_url
    [[ "$source_url" =~ ^https?://[^[:space:]]+$ ]] ||
      die "source code URL must use HTTP or HTTPS"
    if [ -n "$legal_url" ] && [[ ! "$legal_url" =~ ^https?://[^[:space:]]+$ ]]; then
      die "legal notice URL must use HTTP or HTTPS"
    fi

    echo "Registration mode:"
    echo "  1) closed (recommended)"
    echo "  2) open with invitation code"
    echo "  3) open without invitation code"
    local registration_mode suffixes
    read -r -p "Choose [1]: " registration_mode
    registration_mode="${registration_mode:-1}"
    case "$registration_mode" in
      1) registration_open=false; require_invite=true ;;
      2) registration_open=true; require_invite=true ;;
      3) registration_open=true; require_invite=false ;;
      *) die "registration mode must be 1, 2, or 3" ;;
    esac
    read -r -p "Allowed email suffixes, comma separated (optional): " suffixes

    local config_payload
    config_payload="$(
      jq -cn \
        --arg instance_name "$instance_name" \
        --arg operator_name "$operator_name" \
        --arg contact_email "$contact_email" \
        --arg source_url "$source_url" \
        --arg legal_url "$legal_url" \
        --arg suffixes "$suffixes" \
        --argjson registration_open "$registration_open" \
        --argjson require_invite "$require_invite" \
        '{
          instance_name:$instance_name,
          operator_name:$operator_name,
          operator_contact_email:$contact_email,
          source_code_url:$source_url,
          legal_notice_url:$legal_url,
          allowed_email_suffixes:$suffixes,
          registration_open:$registration_open,
          require_invite:$require_invite,
          initialization_stage:2
        }'
    )"
    json_request PATCH \
      "/api/collections/site_config/records/$config_id" \
      "$token" \
      "$config_payload" >/dev/null
    initialization_stage=2
  else
    registration_open="$(printf '%s' "$config_response" |
      jq -r '.items[0].registration_open')"
    require_invite="$(printf '%s' "$config_response" |
      jq -r '.items[0].require_invite')"
    echo "Instance identity and registration policy are already configured."
  fi

  local semesters current_count
  semesters="$(
    json_request GET \
      "/api/collections/semesters/records?filter=is_current%3Dtrue&perPage=1" \
      "$token"
  )"
  current_count="$(printf '%s' "$semesters" | jq '.totalItems')"
  [ "$current_count" -le 1 ] || die "more than one current semester exists"
  if [ "$initialization_stage" -ge 3 ]; then
    echo "Current semester setup is already complete."
  elif [ "$current_count" -eq 0 ]; then
    local semester_name start_date weeks semester_payload
    read -r -p "Current semester name: " semester_name
    [ -n "$semester_name" ] || die "current semester name is required"
    read -r -p "Semester start date (YYYY-MM-DD): " start_date
    [[ "$start_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
      die "semester start date must use YYYY-MM-DD"
    read -r -p "Total teaching weeks [13]: " weeks
    weeks="${weeks:-13}"
    [[ "$weeks" =~ ^[1-9][0-9]*$ ]] || die "weeks must be a positive integer"
    semester_payload="$(
      jq -cn \
        --arg name "$semester_name" \
        --arg start_date "${start_date} 00:00:00.000Z" \
        --argjson weeks "$weeks" \
        '{name:$name,start_date:$start_date,weeks_total:$weeks,is_current:true}'
    )"
    json_request POST \
      "/api/collections/semesters/records" \
      "$token" \
      "$semester_payload" >/dev/null
  else
    echo "Current semester already exists; leaving it unchanged."
  fi
  if [ "$initialization_stage" -lt 3 ]; then
    json_request PATCH \
      "/api/collections/site_config/records/$config_id" \
      "$token" \
      '{"initialization_stage":3}' >/dev/null
    initialization_stage=3
  fi

  if [ "$require_invite" = "true" ] && [ "$initialization_stage" -lt 4 ]; then
    local invitations invitation_count
    invitations="$(
      json_request GET \
        "/api/collections/invite_codes/records?filter=is_active%3Dtrue&perPage=1" \
        "$token"
    )"
    invitation_count="$(printf '%s' "$invitations" | jq '.totalItems')"
    if [ "$invitation_count" -eq 0 ]; then
      local invite_code invite_payload
      read -r -p "Initial invitation code (4-32 characters): " invite_code
      [ "${#invite_code}" -ge 4 ] && [ "${#invite_code}" -le 32 ] ||
        die "invitation code must contain 4-32 characters"
      invite_payload="$(
        jq -cn --arg code "$invite_code" \
          '{code:$code,max_uses:0,uses:0,is_active:true,note:"Initial self-host invitation"}'
      )"
      json_request POST \
        "/api/collections/invite_codes/records" \
        "$token" \
        "$invite_payload" >/dev/null
      echo "Initial invitation code created."
    else
      echo "An active invitation already exists; leaving it unchanged."
    fi
  fi

  json_request PATCH \
    "/api/collections/site_config/records/$config_id" \
    "$token" \
    '{"initialization_complete":true,"initialization_stage":4}' >/dev/null
  password=""
  REPLY=""
  echo "Initialization complete. Admin UI: $(local_base_url)/admin"
  check_installation
}

check_installation() {
  need docker
  need curl
  need jq
  need sqlite3
  need stat
  [ -f "$ENV_FILE" ] || die ".env does not exist; run '$0 init' first"

  require_release_tag
  compose config -q
  wait_for_health

  local container image expected_image user health config semesters
  container="$(compose ps -q app)"
  [ -n "$container" ] || die "app container is not running"
  image="$(docker inspect "$container" --format '{{.Config.Image}}')"
  expected_image="$(
    printf '%s:%s' \
      "$(env_value IMAGE_REPOSITORY ghcr.io/geniuslv2006/xjtlu-timetable)" \
      "$(env_value IMAGE_TAG "")"
  )"
  user="$(docker inspect "$container" --format '{{.Config.User}}')"
  health="$(docker inspect "$container" --format '{{.State.Health.Status}}')"
  [ "$image" = "$expected_image" ] ||
    die "container image is $image, expected $expected_image"
  [ "$user" = "10001:10001" ] || die "container user is $user, expected 10001:10001"
  [ "$health" = "healthy" ] || die "container health is $health"

  config="$(json_request GET "/api/collections/site_config/records?perPage=2")"
  [ "$(printf '%s' "$config" | jq '.totalItems')" -eq 1 ] ||
    die "site_config does not contain exactly one record"
  printf '%s' "$config" | jq -e \
    '.items[0] | has("instance_name") and has("source_code_url")' >/dev/null ||
    die "site_config is missing self-host metadata fields"
  [ "$(printf '%s' "$config" |
    jq -r '.items[0].initialization_complete // false')" = "true" ] ||
    die "guided initialization is incomplete; run '$0 init'"
  [ "$(printf '%s' "$config" |
    jq -r '.items[0].initialization_stage // 0')" -eq 4 ] ||
    die "guided initialization stage is incomplete; run '$0 init'"

  semesters="$(
    json_request GET \
      "/api/collections/semesters/records?filter=is_current%3Dtrue&perPage=2"
  )"
  [ "$(printf '%s' "$semesters" | jq '.totalItems')" -eq 1 ] ||
    die "exactly one current semester is required"

  local data_dir
  data_dir="$(safe_data_dir)"
  [ -f "$data_dir/data.db" ] || die "PocketBase database is missing"
  [ "$(stat -c '%u:%g' "$data_dir")" = "10001:10001" ] ||
    die "data directory must be owned by uid/gid 10001:10001"
  [ "$(sqlite3 "$data_dir/data.db" 'PRAGMA integrity_check;')" = "ok" ] ||
    die "SQLite integrity check failed"
  [ "$(
    sqlite3 "$data_dir/data.db" \
      "SELECT COUNT(*) FROM _migrations WHERE file = '1784349726_seed_self_host_config.js';"
  )" -eq 1 ] || die "required self-host migration is not recorded"
  local registration_open require_invite active_invites registration_status
  registration_open="$(printf '%s' "$config" | jq -r '.items[0].registration_open')"
  require_invite="$(printf '%s' "$config" | jq -r '.items[0].require_invite')"
  if [ "$require_invite" = "true" ]; then
    active_invites="$(
      sqlite3 "$data_dir/data.db" \
        'SELECT COUNT(*) FROM invite_codes WHERE is_active = 1 AND (max_uses = 0 OR uses < max_uses);'
    )"
    [ "$active_invites" -gt 0 ] ||
      die "invitation mode is enabled but no usable invitation exists"
  fi
  if [ "$registration_open" != "true" ]; then
    registration_status="closed"
  elif [ "$require_invite" = "true" ]; then
    registration_status="open with invitation"
  else
    registration_status="open"
  fi

  echo "Self-host check passed."
  echo "  image: $image"
  echo "  health: $health"
  echo "  data: $data_dir"
  echo "  registration: $registration_status"
}

create_backup() {
  need docker
  need tar
  [ -f "$ENV_FILE" ] || die ".env does not exist"

  require_release_tag
  local data_dir parent base stamp archive
  data_dir="$(safe_data_dir)"
  parent="$(dirname "$data_dir")"
  base="$(basename "$data_dir")"
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  archive="$BACKUP_ROOT/pb_data-$stamp.tar.gz"
  mkdir -p "$BACKUP_ROOT"

  restart_after_backup_error() {
    local status=$?
    trap - ERR
    compose up -d --no-build >/dev/null 2>&1 || true
    exit "$status"
  }
  trap restart_after_backup_error ERR
  compose stop app
  tar -czf "$archive" -C "$parent" "$base"
  tar -tzf "$archive" >/dev/null
  compose up -d --no-build
  wait_for_health
  trap - ERR

  echo "$archive"
}

set_image_tag() {
  local target="$1"
  local temp
  temp="$(mktemp)"
  awk -F= -v target="$target" '
    BEGIN { updated = 0 }
    $1 == "IMAGE_TAG" {
      print "IMAGE_TAG=" target
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) print "IMAGE_TAG=" target
    }
  ' "$ENV_FILE" > "$temp"
  chmod 600 "$temp"
  mv "$temp" "$ENV_FILE"
}

upgrade_installation() {
  local target="${1:-}"
  [[ "$target" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    die "usage: $0 upgrade vMAJOR.MINOR.PATCH"
  need docker
  need curl
  need sqlite3
  need stat
  need tar
  [ -f "$ENV_FILE" ] || die ".env does not exist"

  local previous data_dir parent base backup_dir archive
  previous="$(env_value IMAGE_TAG "")"
  [[ "$previous" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    die "current IMAGE_TAG must be an exact SemVer release"
  [ "$target" != "$previous" ] || die "$target is already configured"

  compose_with_tag "$target" config -q
  compose_with_tag "$target" pull

  data_dir="$(safe_data_dir)"
  parent="$(dirname "$data_dir")"
  base="$(basename "$data_dir")"
  backup_dir="$BACKUP_ROOT/pre-${target}-$(date -u +%Y%m%dT%H%M%SZ)"
  archive="$backup_dir/pb_data.tar.gz"
  mkdir -p "$backup_dir"
  printf '%s\n' "$previous" > "$backup_dir/PREVIOUS_IMAGE_TAG"

  restart_previous_on_backup_error() {
    local status=$?
    trap - ERR
    compose_with_tag "$previous" up -d --no-build --pull never >/dev/null 2>&1 || true
    exit "$status"
  }
  trap restart_previous_on_backup_error ERR
  compose stop app
  tar -czf "$archive" -C "$parent" "$base"
  tar -tzf "$archive" >/dev/null

  rollback_upgrade() {
    local status=$?
    trap - ERR
    echo "Upgrade failed; restoring $previous and $archive" >&2
    compose_with_tag "$target" stop app >/dev/null 2>&1 || true
    rm -rf "$data_dir"
    tar -xzf "$archive" -C "$parent"
    compose_with_tag "$previous" run --rm --no-deps -T --pull never --cap-add CHOWN \
      --user 0 --entrypoint sh app \
      -c 'chown -R 10001:10001 /pb/pb_data' >/dev/null 2>&1 || true
    set_image_tag "$previous"
    compose_with_tag "$previous" up -d --no-build --pull never || true
    exit "$status"
  }
  trap rollback_upgrade ERR

  compose_with_tag "$target" up -d --no-build
  wait_for_health

  [ "$(sqlite3 "$data_dir/data.db" 'PRAGMA integrity_check;')" = "ok" ]

  set_image_tag "$target"
  (check_installation)
  trap - ERR
  echo "Upgrade complete: $previous -> $target"
  echo "Rollback backup: $archive"
}

usage() {
  cat <<'USAGE'
Usage:
  ./self-host.sh init
  ./self-host.sh check
  ./self-host.sh backup
  ./self-host.sh upgrade vMAJOR.MINOR.PATCH

The script only pulls prebuilt images. It never builds on the deployment host.
USAGE
}

case "${1:-}" in
  init) init_installation ;;
  check) check_installation ;;
  backup) create_backup ;;
  upgrade) upgrade_installation "${2:-}" ;;
  *) usage; exit 2 ;;
esac
