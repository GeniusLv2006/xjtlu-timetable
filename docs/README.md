# Documentation

Use this page to choose the document for your role. The public deployment path
and the official-instance path are intentionally separate.

## Third-party self-hosters

- [Self-hosting](SELF_HOSTING.md): supported installation, HTTPS proxy,
  validation, backup, restore, upgrade, rollback, and troubleshooting.
- [Architecture](ARCHITECTURE.md): components, request paths, persistent state,
  trust boundaries, and repository layout.
- [Security Policy](../.github/SECURITY.md): supported versions and private
  vulnerability reporting.
- [Release notes](releases/): version-specific installation and upgrade
  information.

Start with the latest GitHub Release rather than cloning `main` onto a
deployment host.

## Contributors

- [Contributing](../CONTRIBUTING.md): branch, commit, validation, and pull
  request expectations.
- [Architecture](ARCHITECTURE.md): implementation boundaries and data flow.
- [Changelog](../CHANGELOG.md): released and unreleased user-visible changes.

## Project maintainers

- [Official production operations](OPERATIONS.md): deployment and rollback for
  `timetable.xjtlu.uk` only.
- [Release process](RELEASE.md): SemVer preparation, image publication, and
  release verification.

Do not use official production scripts or commit-addressed `main` images as a
generic third-party deployment interface.
