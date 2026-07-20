# Changelog

All notable project releases are documented here.

## Unreleased

Release notes are finalized in a `release/vX.Y.Z` pull request.

### Added

- Added administrator-controlled restricted login for suspended accounts, exposing only self-service data export, password-confirmed account deletion, and sign-out.
- Added time-limited, keyed email digests that prevent deleted suspended accounts from re-registering, with administrator review, expiry, removal, and HMAC key rotation controls.

### Changed

- Personal-data exports are now collected by a dedicated server endpoint so restricted accounts can receive the same complete archive without gaining collection access.
- The generic legal notice, self-hosting guidance, and export processing information now describe suspended-account deletion, pseudonymous registration blocking, retention, and possible rights without representing the project as automatically compliant with the UK GDPR.

### Security

- Suspended sessions remain blocked from ordinary collections, profile updates, direct account deletion, access logs, timetables, friendships, invitations, and iCal management.
- Self-service account deletion now requires the current password and follows the same registration-blocking policy as administrator deletion.

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
- iCal product identifiers are deployment-neutral, and event identifiers use
  a stable operator-configured domain instead of the project-operated hostname.
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
