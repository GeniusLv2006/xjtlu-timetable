# Changelog

All notable project releases are documented here.

## Unreleased

Release notes are finalized in a `release/vX.Y.Z` pull request.

### Changed

- Clarified the supported self-host release channel, corrected the v0.2.0 fresh
  installation instructions, and added checksum-backed manual restore steps.
- Added role-based documentation navigation, architecture and contribution
  guides, and focused GitHub issue and pull request templates.

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

- Official production operations now use a dedicated Compose override and keep
  deploying exact reviewed `main` SHA images.
- iCal URLs now use the current instance origin instead of the official
  deployment domain.
- Schema and safe first-install defaults are managed entirely by migrations.

### Security

- New installations start with registration closed, invitation codes required,
  and iCal abuse controls enabled.
- CI verifies initialization, rollback, production-baseline upgrades, hardened
  containers, dependency audits, CodeQL, and Trivy results.
- Automated dependency pull requests are disabled; maintainers consolidate
  reviewed dependency changes in human-authored branches.
