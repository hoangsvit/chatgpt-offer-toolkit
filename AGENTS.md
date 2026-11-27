# AGENTS.md

## Branching and pull request workflow

The required delivery flow is:

```text
feature/* or fix/* -> dev -> main
```

- Start every independent feature or fix from the latest remote `dev` branch.
- Use `feature/<topic>` (or `feat/<topic>`) for features, `fix/<topic>` for bug fixes, and `docs/<topic>` or `chore/<topic>` for documentation or maintenance.
- Target `dev` for all ordinary pull requests, including documentation, maintenance, dependencies, and hotfixes. Never target `main` directly from a working branch.
- Keep changes scoped and independent; do not branch from unmerged pull requests.
- Open draft PRs by default for agent-authored changes. Describe changes, validation, limitations, and any browser-specific behavior.
- Do not push directly to `dev` or `main`, force-push shared branches, bypass required checks, or merge without explicit authorization.
- Only promote tested changes from `dev` to `main` using a separate release PR. Do not create a release from an ordinary feature/fix branch.
- If `dev` is behind `main`, inspect divergence and use a safe, non-destructive synchronization before starting work; do not overwrite commits. Report conflicts or blockers.

## Validation

- Follow the commands in [CONTRIBUTING.md](CONTRIBUTING.md) and current `package.json`.
- Run type checking, unit tests, browser builds, and manifest validation for all supported build targets.
- Use synthetic test data for sessions, offers, and checkout. Never expose real credentials, tokens, or payment information.
- Report any checks that could not be run. Do not claim CI passed unless verified.
- Resolve failing checks and review feedback before merging to `dev`. Revalidate the integrated changes before promoting `dev` to `main`.

## Release policy

- Bump the version on the development path before opening a release PR from `dev` to `main`.
- A release requires a successful release PR and the existing release workflow on `main`. Do not create tags or publish releases without authorization.
- Preserve browser-specific package naming, installation instructions, checksums, and Firefox update compatibility.
- Do not change permissions, offer eligibility or checkout behavior as part of unrelated maintenance.
- Never add telemetry, store session credentials, or submit payments automatically.

## Reporting

Include the PR URL, source and target branches, validation results, and remaining blockers. Clearly distinguish proposed changes, merged changes, and published releases.
