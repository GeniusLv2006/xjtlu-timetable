# Architecture

## System overview

XJTLU Timetable is a single-container web application:

```text
Browser
  |
  | HTTPS
  v
Trusted reverse proxy
  |
  | HTTP on a private or loopback interface
  v
PocketBase :8080
  |-- static Vue application
  |-- PocketBase REST API and authentication
  |-- JavaScript hooks and custom iCal route
  `-- SQLite data in /pb/pb_data

Browser ---- HTTPS ----> XJTLU TimetablePlus API
Calendar client ---- HTTPS ----> /api/ical/<token>/timetable.ics
```

The browser fetches timetable data from XJTLU TimetablePlus by using the HASH
provided by the user, then stores normalized timetable records through the
PocketBase API. The application server does not proxy production timetable
imports. Vite provides a development-only proxy for local frontend work.

## Runtime components

### Vue frontend

`frontend/` contains the Vue 3 application, Pinia stores, router, user and admin
views, and timetable comparison and synchronization logic. Vite builds it into
static files copied to `/pb/pb_public` in the runtime image.

In production, the frontend uses the current browser origin for PocketBase API
and iCal URLs. This keeps third-party deployments independent from the official
domain.

### PocketBase application

PocketBase serves the frontend, REST API, authentication, admin dashboard, and
SQLite database. `backend/pb_hooks/` adds application behavior such as:

- registration and invitation enforcement;
- authentication checks and access logging;
- the iCal subscription route and risk controls;
- cache headers and periodic cleanup.

`backend/pb_migrations/` is the source of truth for collections, access rules,
indexes, and safe initial instance settings. A new instance applies migrations
when PocketBase first starts.

### Persistent state

The container root filesystem is read-only. All persistent application state is
under `/pb/pb_data`, mounted from `DATA_DIR` on the host. It includes the SQLite
database, PocketBase runtime state, and any PocketBase-managed backups.

The frontend build, hooks, migrations, and PocketBase binary are immutable image
content. Replacing the image changes application code; replacing `DATA_DIR`
changes instance state.

## Network and trust boundaries

The generic Compose file binds PocketBase to `127.0.0.1:8091` by default.
Operators must place an HTTPS reverse proxy in front and must not publish the
PocketBase port directly to the internet.

The reverse proxy is responsible for:

- TLS termination;
- preserving the original `Host`;
- forwarding the request protocol;
- forwarding the real client address through the documented headers;
- restricting direct access to the backend port.

The application trusts these forwarded headers for request context. Only a
controlled proxy should be able to connect to the backend listener.

Timetable HASH values and iCal subscription URLs act as credentials. They must
not appear in issue reports, command output, proxy access logs, screenshots, or
public troubleshooting material.

## Deployment profiles

### Third-party self-hosting

Third-party operators download the checksummed bundle from the latest GitHub
Release and run the exact SemVer image through `docker-compose.yml` and
`self-host.sh`. Deployment hosts pull images and never build source.

### Official instance

The official instance uses `docker-compose.official.yml`, `deploy.sh`, and an
exact commit-addressed image from reviewed `main`. Its repository checks,
network assumptions, and reverse-proxy hardening are specific to
`timetable.xjtlu.uk`.

These profiles share the application image but have separate release and
operations contracts.

## Initialization and upgrades

On a fresh database, migrations create the schema and seed one safe site
configuration. `self-host.sh init` then creates or authenticates the first
superuser and guides the operator through instance identity, registration,
semester, and invitation setup.

Release upgrades stop the application, archive the complete data directory,
start the target immutable image, allow migrations to run, and verify health
and SQLite integrity. A failed upgrade restores both the previous data archive
and the previous image tag.

## Repository map

| Path | Responsibility |
|---|---|
| `frontend/` | Vue application, frontend tests, and production build |
| `backend/pb_hooks/` | PocketBase hooks and custom routes |
| `backend/pb_migrations/` | Schema, rules, indexes, and seeded configuration |
| `backend/tests/` | Runtime, security, and regression assertions |
| `docker-compose.yml` | Supported third-party runtime contract |
| `self-host.sh` | Third-party initialization and lifecycle operations |
| `docker-compose.official.yml` | Official-instance Compose override |
| `deploy.sh` | Official-instance deployment and rollback automation |
| `examples/proxy/` | Supported reverse-proxy configuration examples |
| `.github/workflows/` | CI, image publication, and release automation |
