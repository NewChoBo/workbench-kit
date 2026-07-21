# Agent Guide — Workbench Kit

Instructions for coding agents working in `NewChoBo/workbench-kit`.

## Quick start

```powershell
pnpm install
pnpm validate:static
```

Package manager is **pnpm** only. Root scripts delegate tooling through pnpm.

## Workspace isolation (consumer apps)

Workbench Kit is a **library**; host applications consume published or linked packages. A **consumer monorepo must not include this repository’s `packages/*` in its own `pnpm-workspace.yaml`** — that merges installs and can symlink React, `@types/react`, and peers from the host into this repo’s `node_modules`.

- Run `pnpm install` only from the **workbench-kit repository root** when working on this repo.
- Host apps should depend on `@workbench-kit/*` via `link:` / `file:` / published npm versions, not by absorbing packages into the host workspace.
- `pnpm check:workspace-isolation` fails when any `node_modules` symlink resolves outside this repository.

## Before you change code

1. Read surrounding code and match existing naming, exports, and validation lanes.
2. Keep diffs focused — no drive-by refactors.
3. Run the smallest validation lane that covers your change (`typecheck`, `lint`, `check:public-exports`, etc.).

## Project layout

- `packages/*` — publishable and private-preview packages (`@workbench-kit/*`)
- `scripts/` — build, validation, and release automation
- `.github/workflows/` — CI including `publish.yml` (npm) and Pages deploy
- `docs/conventions/` — human-readable policies
- `.cursor/rules/` — Cursor agent rules (mirror critical conventions)

## Release & npm (high priority)

Full detail: [`docs/conventions/npm-release.md`](docs/conventions/npm-release.md)

| Topic                   | Rule                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| Public publish set      | `NPM_PUBLISH_ORDER` in `scripts/npm-publish-config.mjs` (13 packages) |
| CI publish set          | Same as `NPM_PUBLISH_ORDER` — do not maintain a smaller allowlist     |
| Private (never publish) | `monaco`, `workbench-core`, `shell-react`                             |
| First release           | Local: `pnpm publish:packages:local`                                  |
| Updates                 | Push tag `v<version>` → `publish.yml` (npm OIDC trusted publishing)   |
| Consumer install tag    | `@prototype` (CI does not move `latest`)                              |
| Auth                    | OIDC only in CI; clear npmrc tokens between publishes                 |

Common failure modes to avoid:

- Shrinking `NPM_CI_PUBLISH_PACKAGES` so some public packages never get CI updates
- Assuming `npm view … version` reflects the CI release (check `@prototype`)
- Using `NPM_TOKEN` in CI publish (breaks OIDC)
- Leaving `_authToken` in npmrc during batch publish (401 mid-run)
- Publishing `react` without sibling packages at the same version on npm

## Git

Follow [`docs/conventions/git-workflow.md`](docs/conventions/git-workflow.md). Do not commit, push, or tag unless the user explicitly requests it.

**Commit messages are English-only.** Use Conventional Commits (`feat`, `fix`, `docs`, …) with an English title and body. Full format and examples: [`docs/conventions/language-policy.md`](docs/conventions/language-policy.md) and the **Commit Message** section in `git-workflow.md`.

Consumer applications may define their own commit language policy. This repository keeps English commits for public npm history and contributor consistency.

This repository does not ship a commit-msg helper script; write messages manually from the docs above.

## Public reference policy

Public docs and rules must not name commercial, proprietary, or internal sibling
projects. Use neutral capability language and keep VS Code / OSS design
references where they explain kit conventions.

Full policy: [`docs/conventions/public-reference-policy.md`](docs/conventions/public-reference-policy.md).

## Cursor rules

| Rule                                   | Scope                                                |
| -------------------------------------- | ---------------------------------------------------- |
| `.cursor/rules/workbench-kit-core.mdc` | Always applied                                       |
| `.cursor/rules/npm-release.mdc`        | Publish scripts, workflows, package publish metadata |

When conventions and code disagree, update code **and** docs/rules together.
