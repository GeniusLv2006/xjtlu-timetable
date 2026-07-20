# Release process

Releases use Semantic Versioning and immutable `vMAJOR.MINOR.PATCH` tags. Floating `latest` or `stable` image tags are not published.

1. Create `release/vX.Y.Z` from synchronized `main`.
2. Update `frontend/package.json`, `CHANGELOG.md`, and `docs/releases/vX.Y.Z.md`. Keep each release-note paragraph and list item on one source line because GitHub Releases preserve manual line breaks.
3. Open a pull request titled `chore(release): prepare vX.Y.Z`.
4. Require backend tests, frontend tests/build/audit, Compose validation, runtime smoke testing, and vulnerability scanning to pass.
5. Squash merge the release PR.
6. Tag the merged `main` commit as `vX.Y.Z` and push the tag.
7. Wait for the Release workflow to build and smoke-test amd64 and arm64, publish the exact GHCR tag with SBOM/provenance, verify anonymous pull, and publish the GitHub Release and checksummed self-host bundle. Each architecture runs natively and is built exactly once; the publish job only combines the verified digests into the release manifest.
8. The release is complete when the tagged workflow and published artifacts succeed. Do not repeat its tests locally without a new state change.

Production rollout is a separate operation. When the release is approved for the project-operated instance, deploy the exact reviewed `main` SHA through `deploy.sh`; never build on the VPS. Reuse the successful PR, `main`, and tag workflow evidence, then run the core production acceptance check plus only the profiles affected by the release. Preserve the rollback backup until those checks complete.

Dependency-bot pull requests are never merged directly. Recreate or consolidate their changes in a human-authored branch so external bots do not become commit contributors.
