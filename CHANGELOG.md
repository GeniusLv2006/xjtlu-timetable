# Changelog

All notable project releases are documented here.

## Unreleased

Release notes are finalized in a `release/vX.Y.Z` pull request.

## [0.2.1] - 2026-07-18

### Added

- Added configurable minimum-age and legal-notice versions with immutable,
  server-timestamped acceptance records and renewed confirmation when
  requirements change.
- Added legal acceptance history to the complete personal-data export.
- Added an official deployment check for the instance-specific `/privacy`
  endpoint, its security policy, Cloudflare email obfuscation, configured legal
  URL, and application health.

### Changed

- Clarified the supported self-host release channel, corrected the v0.2.0 fresh
  installation instructions, and added checksum-backed manual restore steps.
- Added role-based documentation navigation, architecture and contribution
  guides, and focused GitHub issue and pull request templates.
- Settings now opens the configured external legal notice, matching the login,
  import, and application-footer behavior.
- The application footer now uses the configured instance name instead of
  displaying the legal operator name as product identity.
- Replaced the browser-only import consent marker with account-level acceptance
  records that work across devices.

### Security

- User email visibility is disabled and profile access is restricted to the
  account owner and connected users.
- Removed public timetable visibility without deleting existing timetables;
  users retain private and friends-only sharing.
- Expanded personal-data exports to include previously omitted login, iCal
  access, invitation, and acceptance records.

## [0.2.0] - 2026-07-18

### Added

- A supported release-based self-hosting path with hardened generic Compose
  defaults, runtime instance identity, and Caddy and Nginx Proxy Manager
  examples.
- Idempotent guided initialization, installation checks, backups, explicit
  upgrades, verified migrations, and automatic failed-upgrade rollback.
- Multi-architecture release images for `linux/amd64` and `linux/arm64`, plus
  SBOM, provenance, image digest, self-host bundle, and checksums.

### Changed

- Project-operated production now uses a dedicated Compose override and keeps
  deploying exact reviewed `main` SHA images.
- iCal URLs now use the current instance origin instead of the project-operated
  deployment domain.
- Schema and safe first-install defaults are managed entirely by migrations.

### Security

- New installations start with registration closed, invitation codes required,
  and iCal abuse controls enabled.
- CI verifies initialization, rollback, production-baseline upgrades, hardened
  containers, dependency audits, CodeQL, and Trivy results.
- Automated dependency pull requests are disabled; maintainers consolidate
  reviewed dependency changes in human-authored branches.
