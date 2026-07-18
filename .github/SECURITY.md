# Security Policy

## Supported versions

| Channel | Supported | Intended use |
|---|---|---|
| Latest published GitHub Release | Yes | Third-party self-hosting |
| Current `main` branch and its project-operated production revision | Yes | Development and the project-operated instance |
| Older Releases and other commits | No, unless a security advisory says otherwise | Upgrade to the latest Release |

Third-party operators should deploy the latest immutable
`vMAJOR.MINOR.PATCH` Release and follow its release notes. Commit-addressed
images from `main` are part of the project-operated deployment channel and are
not the supported third-party installation interface.

Security fixes for self-hosters are released as a new SemVer version. The
project does not backport fixes to older Releases unless the corresponding
security advisory explicitly states otherwise.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting flow under the repository
Security tab. Do not open a public issue with exploit details, credentials,
tokens, personal data, or production logs.

Include the affected route or component, reproduction conditions, impact, and
any suggested mitigation. Maintainers will acknowledge a report as soon as
practical and coordinate disclosure after a fix is available.
