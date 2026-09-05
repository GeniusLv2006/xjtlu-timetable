# Contributing

Thank you for improving Timetable Toolkit for XJTLU Students. Keep changes
focused, protect user data, and use the current code, configuration, tests, and
verified runtime behavior as the source of truth.

## Before opening a change

- Search existing issues and pull requests.
- Use a private security report instead of a public issue for vulnerabilities,
  credentials, tokens, personal data, or exploitable production details.
- Do not commit `.env`, `data/`, `backend/pb_data/`, PocketBase binaries,
  dependency directories, or generated frontend output.
- Keep the project-operated deployment path separate from third-party
  self-hosting.

## Development setup

The pnpm version is pinned by `frontend/package.json`; use a Node.js version
supported by the current Vite release. For frontend-only work, a local backend
is not required. For a local backend, follow the release-based setup in
`docs/SELF_HOSTING.md`; do not install an unreviewed PocketBase binary.

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

When backend behavior is needed, initialize the local PocketBase instance with
`./self-host.sh init` before starting the frontend.

## Branches and commits

Use a branch named `<change-type>/<short-kebab-description>`, where the allowed
change types are `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `release`, and `security`.

Write English Conventional Commits:

```text
<type>(<optional-scope>): <imperative summary>
```

Keep each commit to one logical change. Mark breaking changes with `!` and a
`BREAKING CHANGE:` footer.

## Validation

Run checks appropriate to the change:

```bash
node --test backend/tests/*.test.mjs

cd frontend
pnpm test
pnpm build
```

For dependency changes, also run:

```bash
cd frontend
pnpm audit --prod
```

Pull request CI also runs the access-rule integration test against the freshly
built PocketBase image. The job creates isolated users, friendships, timetable,
and course fixtures on a loopback-only test instance, then removes the container
and its data volume.

Docker, PocketBase, deployment, migration, or release changes also require
container build and startup validation, successful hook and migration loading,
and a health endpoint check. Clearly mark anything that was not completed as
`Not verified`.

## Pull requests

Use an English Conventional Commit title and include:

```markdown
## Summary

## Validation

## Deployment impact

## Risks and rollback
```

Keep pull requests focused. Runtime, security, dependencies, CI, deployment,
schema, migration, and release changes require a pull request. Do not merge
until required validation succeeds.

Maintainers normally squash merge so the pull request title becomes the final
commit message.
