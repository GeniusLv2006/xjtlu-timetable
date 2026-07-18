# Release process

Releases use Semantic Versioning and immutable `vMAJOR.MINOR.PATCH` tags.
Floating `latest` or `stable` image tags are not published.

1. Create `release/vX.Y.Z` from synchronized `main`.
2. Update `frontend/package.json`, `CHANGELOG.md`, and
   `docs/releases/vX.Y.Z.md`.
3. Open a pull request titled `chore(release): prepare vX.Y.Z`.
4. Require backend tests, frontend tests/build/audit, Compose validation,
   runtime smoke testing, and vulnerability scanning to pass.
5. Squash merge the release PR.
6. Tag the merged `main` commit as `vX.Y.Z` and push the tag.
7. Wait for the Release workflow to build and smoke-test amd64 and arm64,
   publish the exact GHCR tag with SBOM/provenance, verify anonymous pull, and
   publish the GitHub Release and checksummed self-host bundle.
8. For the official instance, back up production data and deploy the exact
   reviewed `main` SHA through `deploy.sh`; never build on the VPS.
9. Verify public health, login, timetable display, and an existing iCal
   subscription. Preserve the rollback backup until verification is complete.

Dependency-bot pull requests are never merged directly. Recreate or consolidate
their changes in a human-authored branch so external bots do not become commit
contributors.
