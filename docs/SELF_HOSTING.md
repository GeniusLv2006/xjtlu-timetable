# Self-hosting

This is the supported deployment path for third-party operators. It uses an
exact prebuilt release image and never builds on the deployment host.

Only the latest published GitHub Release receives third-party self-hosting
support and security fixes. See the
[Security Policy](../.github/SECURITY.md#supported-versions) for the complete
version policy.

## Five-minute start

### Requirements

- a Linux amd64 or arm64 host
- Docker 24 or newer with Docker Compose v2
- `curl`, `jq`, and `tar`
- `sqlite3` and GNU `stat` for integrity and data-permission verification
- a domain name and an HTTPS reverse proxy before exposing the service publicly

Download the self-host bundle attached to the selected GitHub Release and
verify its checksum:

```bash
release=v0.2.1
curl -fLO \
  "https://github.com/GeniusLv2006/xjtlu-timetable/releases/download/${release}/xjtlu-timetable-self-host-${release}.tar.gz"
curl -fLO \
  "https://github.com/GeniusLv2006/xjtlu-timetable/releases/download/${release}/xjtlu-timetable-self-host-${release}.tar.gz.sha256"
sha256sum -c "xjtlu-timetable-self-host-${release}.tar.gz.sha256"
tar -xzf "xjtlu-timetable-self-host-${release}.tar.gz"
cd "xjtlu-timetable-self-host-${release}"
```

Create the local configuration and start the guided initializer:

```bash
cp .env.example .env
chmod 600 .env
./self-host.sh init
```

The initializer:

1. validates Compose and pulls the exact release image;
2. prepares the persistent data directory for uid/gid `10001:10001`;
3. starts the container with `--no-build` and waits for health;
4. creates the first PocketBase superuser without storing its password;
5. configures the instance identity and registration policy;
6. creates the current semester and, whenever invitations are required, an
   initial invitation code;
7. runs the same checks available through `./self-host.sh check`.

The safe default is closed registration with invitation checks enabled.

## Configuration contract

`.env` supports these stable settings:

```dotenv
IMAGE_REPOSITORY=ghcr.io/geniuslv2006/xjtlu-timetable
IMAGE_TAG=v0.2.1
BIND_ADDRESS=127.0.0.1
HOST_PORT=8091
DATA_DIR=./data
COMPOSE_PROJECT_NAME=xjtlu-timetable
```

- Keep an exact SemVer `IMAGE_TAG`. `latest` is not published or supported.
- Keep `BIND_ADDRESS=127.0.0.1` when the proxy runs on the host.
- Never commit `.env` or `DATA_DIR`.
- Do not use `docker compose build` on a deployment host.

Instance name, operator contact, source URL, registration rules, iCal risk
controls, notices, semesters, and invitations are managed at `/admin`.

## HTTPS reverse proxy

PocketBase must receive the original `Host`, client IP, and request protocol
from a trusted reverse proxy. Do not publish port 8091 directly to the internet.

### Caddy on the host

Keep `BIND_ADDRESS=127.0.0.1`, copy
`examples/proxy/caddy/Caddyfile.example`, replace the domain, validate the Caddy
configuration, and reload Caddy.

### Nginx Proxy Manager

When NPM runs in Docker, set `BIND_ADDRESS` to a Docker-host address reachable
from the NPM container, such as `172.17.0.1`, and restrict that port with the
host firewall. Configure the proxy host for HTTP port 8091, enable WebSockets,
enable SSL and Force SSL, then paste
`examples/proxy/nginx-proxy-manager/advanced.conf` into its Advanced field.

Docker bridge addresses vary. Confirm the actual route rather than assuming
`172.17.0.1`.

After HTTPS is active:

```bash
curl --fail --silent --show-error https://timetable.example.com/api/health
```

Also verify login, registration policy, timetable import, and an iCal
subscription. Never place credentials or iCal tokens in logs.

## Backup and restore

`./self-host.sh backup` stops the application briefly, archives the complete
PocketBase data directory, verifies that the archive is readable, restarts the
same exact image, and waits for health. Backups are stored under `./backups/` by
default and must be copied to a separate machine or object store.

Record a checksum immediately after each backup, then copy both files off the
deployment host:

```bash
archive=./backups/pb_data-YYYYMMDDTHHMMSSZ.tar.gz
sha256sum "$archive" > "$archive.sha256"
sha256sum -c "$archive.sha256"
```

PocketBase also provides online backups in its dashboard under
Settings → Backups. These temporarily make the application read-only and can
use S3-compatible storage. Test restoration before relying on either method.

For manual restore:

1. copy the selected archive onto the deployment host and verify its checksum
   against the value recorded by your off-host backup system;
2. inspect the archive with `tar -tzf` and confirm that it contains one complete
   data directory rather than individual SQLite files;
3. validate Compose and stop the application;
4. move the current data directory aside instead of deleting it;
5. extract the archive, restore uid/gid `10001:10001`, and start the same exact
   image without pulling or building;
6. run `./self-host.sh check` and test login, timetable display, and iCal before
   removing the preserved directory.

For the default `DATA_DIR=./data` layout, run these commands from the extracted
self-host bundle directory:

```bash
archive=./backups/pb_data-YYYYMMDDTHHMMSSZ.tar.gz
preserved="./data.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"

test -f "$archive"
sha256sum -c "$archive.sha256"
tar -tzf "$archive"
docker compose --env-file .env -f docker-compose.yml config -q
docker compose --env-file .env -f docker-compose.yml stop app
mv ./data "$preserved"
tar -xzf "$archive" -C .
docker compose --env-file .env -f docker-compose.yml \
  run --rm --no-deps -T --pull never \
  --user 0 --cap-add CHOWN --entrypoint sh app \
  -c 'chown -R 10001:10001 /pb/pb_data'
docker compose --env-file .env -f docker-compose.yml \
  up -d --no-build --pull never
./self-host.sh check
```

If `DATA_DIR` is customized, preserve and restore that exact directory and
extract the archive into its parent directory. Do not use the default commands
unchanged. Keep the preserved directory until application checks and an
independent backup restore have succeeded.

Do not replace a live SQLite database by copying individual files while the
application is running.

## Upgrade and rollback

Read the target release notes first. Then run:

```bash
./self-host.sh upgrade vX.Y.Z
```

The command rejects floating tags, validates the target configuration, pulls
the prebuilt image, stops the service, creates and verifies a full data backup,
starts the target image, applies migrations, checks health and SQLite integrity,
and only then updates `.env`.

If startup or verification fails, it restores the old data archive and starts
the previous image with `--pull never`. Keep the generated `pre-vX.Y.Z-*`
directory until the new version and an independent restore have been verified.

If release notes announce a self-host bundle format change, download and verify
the target bundle first, replace only the tracked tooling/configuration files,
preserve `.env`, `data/`, and `backups/`, then run the upgrade command.

The first supported self-host release is `v0.2.0`; there is no supported
pre-`v0.2.0` installation for the upgrade command to migrate. New deployments
should install the latest published release. Existing supported installations
should use `upgrade` when moving to a newer release.

## Troubleshooting

### The container cannot write to `pb_data`

Run `./self-host.sh init` rather than `docker compose up` on a new installation.
It prepares bind-mount ownership with a temporary root process while the
long-running app remains uid/gid `10001:10001`.

### The site opens but registration fails

Run `./self-host.sh check`, then review `/admin` → System settings. A fresh
instance intentionally starts with registration closed. Invitation mode also
requires at least one active invitation.

### iCal returns 503

Create exactly one current semester in `/admin` → Semester management and check
that its start date and teaching-week count are correct.

### The proxy reports 502

Confirm the configured bind address is reachable from the proxy. A host proxy
uses `127.0.0.1`; a containerized proxy usually needs a Docker-host address or a
shared network. Do not solve this by exposing port 8091 to the public internet.

### Architecture or image pull errors

Release images support `linux/amd64` and `linux/arm64`. Confirm with
`uname -m`, verify the exact release exists, and check that the GHCR package can
be pulled anonymously. Do not fall back to a local VPS build.
