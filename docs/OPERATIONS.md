# Official production operations

This document is only for maintainers of `timetable.xjtlu.uk`. Third-party
operators must use [`SELF_HOSTING.md`](SELF_HOSTING.md); the official override,
NPM hardening script, repository remote checks, and `main` SHA channel are not a
generic self-hosting interface.

Production must run an exact reviewed commit image from `main`. Do not deploy
`latest`, a locally built image, or an uncommitted working tree.
Docker Compose is the only supported production runtime; the former root
systemd unit has been removed.

## Prerequisites

- Docker 24 or newer with Docker Compose v2
- Git, SQLite 3, and `sha256sum`
- a reverse proxy that can reach `172.17.0.1:8091`
- permission to change ownership of `backend/pb_data`

The container runs as uid/gid `10001:10001`, with a read-only root filesystem,
no Linux capabilities, and `no-new-privileges`.

## Deploy

Wait for the `CI` workflow on `main` to publish the commit-addressed GHCR
image. On the VPS:

```bash
cd /root/xjtlu-timetable
git fetch origin main
git switch main
git merge --ff-only origin/main
revision="$(git rev-parse HEAD)"
bash deploy.sh "$revision"
```

The deployment script:

1. verifies that the requested 40-character revision is both local `main` and
   current `origin/main`;
2. creates a consistent SQLite backup and verifies its integrity;
3. validates Compose configuration and pulls only the exact revision image;
4. fixes the bind-mount ownership for the non-root runtime;
5. waits for the container health check and verifies SQLite integrity;
6. automatically restores the prior database and image if application startup
   fails;
7. reapplies reverse-proxy headers and ingress firewall rules.

Backups and rollback metadata are stored in
`/root/xjtlu-timetable-backups/pre-<revision>-<UTC timestamp>/`.

## Verify

```bash
docker inspect xjtlu-timetable \
  --format 'image={{.Config.Image}} user={{.Config.User}} health={{.State.Health.Status}}'
docker exec xjtlu-timetable \
  wget -q -O /dev/null http://127.0.0.1:8080/api/health
curl --fail --silent --show-error \
  https://timetable.xjtlu.uk/api/health
sqlite3 backend/pb_data/data.db 'PRAGMA integrity_check;'
```

Also verify the login flow, timetable display, and an existing iCal
subscription without exposing credentials or subscription tokens in logs.

## Manual rollback

Use the backup directory created by the failed or previous deployment. Its
`ROLLBACK_IMAGE` file contains the local rollback image tag.

```bash
cd /root/xjtlu-timetable
backup=/root/xjtlu-timetable-backups/pre-REVISION-TIMESTAMP
rollback_image="$(cat "$backup/ROLLBACK_IMAGE")"
rollback_tag="${rollback_image##*:}"

export IMAGE_REPOSITORY=ghcr.io/geniuslv2006/xjtlu-timetable
export IMAGE_TAG="$rollback_tag"
export BIND_ADDRESS=172.17.0.1
export HOST_PORT=8091
export DATA_DIR="$PWD/backend/pb_data"
export COMPOSE_PROJECT_NAME=xjtlu-timetable
compose=(docker compose -f docker-compose.yml -f docker-compose.official.yml)

"${compose[@]}" stop app
rm -f backend/pb_data/data.db-shm backend/pb_data/data.db-wal
cp "$backup/data.db" backend/pb_data/data.db
chown -R 10001:10001 backend/pb_data
"${compose[@]}" up -d --no-build --pull never
```

Repeat the health, integrity, and user-facing checks after rollback. Retain at
least the two most recent verified backup directories; remove older backup
directories and rollback image tags only after a newer deployment and rollback
path have been verified.
