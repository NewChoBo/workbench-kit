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
3. Run the smallest validation lane that covers your change (`typecheck`, `lint`,
   `check:public-exports`, `validate:static` / `validate:fast`, etc.).
4. For UI, prefer the active tool’s browser/preview (Cursor browser MCP, IDE
   preview, Storybook UI, `pnpm dev`). **Do not treat Playwright /
   `pnpm validate:ui` as mandatory** for routine agent work—use it when CI
   parity or required Storybook play coverage is explicitly requested.

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

## GitHub issues

When filing or updating issues, follow
[`docs/conventions/github-issues.md`](docs/conventions/github-issues.md).
Use `.github/ISSUE_TEMPLATE/*` (blank issues disabled). Prefer the **Consumer
extract** template for promoting host-proven patterns. Issue bodies must meet
the full quality bar (API sketch, behavior contract, non-goals, acceptance,
verification) and stay product-neutral per public-reference policy.

## Git

Follow [`docs/conventions/git-workflow.md`](docs/conventions/git-workflow.md). Do not commit, push, or tag unless the user explicitly requests it.

**Commit messages are English-only.** Use Conventional Commits (`feat`, `fix`, `docs`, …) with an English title and body. Full format and examples: [`docs/conventions/language-policy.md`](docs/conventions/language-policy.md) and the **Commit Message** section in `git-workflow.md`.

Consumer applications may define their own commit language policy. This repository keeps English commits for public npm history and contributor consistency.

This repository does not ship a commit-msg helper script; write messages manually from the docs above.

## Public package boundary (mandatory)

This repository is a **public npm package**. Do **not** put internal company
knowledge, sibling-repo names, private host codenames, private clone paths, or
customer-specific identifiers into:

- source, comments, tests, stories, or samples
- `docs/`, `README.md`, `AGENTS.md`, or `.cursor/` rules and hooks
- commit messages or PR text

Also **never commit or hardcode secrets** in source, comments, docs, stories,
samples, or rules: API keys, tokens, passwords, private keys, real `.env`
files, npm/`_authToken`, or cloud credentials. Use `process.env` / host secret
storage and gitignored local files only. Docs may use obvious placeholders
(`YOUR_API_KEY`, `<token>`), never real values—even “for debugging.”

Use neutral terms (`integrating host`, `consumer app`, capability names). Keep
VS Code / OSS design references when they explain kit conventions.

### Before every commit (mandatory, all agents)

Run this **yourself** before any `git commit` / `git push` — including Codex,
Claude Code, Cursor, and humans. Do not rely on editor-specific hooks alone.

```powershell
pnpm check:commit-safety
```

That runs `check:public-references` (internal/sibling names) and `check:secrets`
(credential-looking material). Both are also part of `pnpm validate:static`.

- Policy: [`docs/conventions/public-reference-policy.md`](docs/conventions/public-reference-policy.md)
- Cursor additionally gates shell `git commit` / `git push` via
  `.cursor/hooks/gate-git-publish-safety.mjs` — treat that as a backstop, not
  the only control

## Agent tooling notes

Layout and ownership: [`docs/conventions/agent-guidance.md`](docs/conventions/agent-guidance.md).

| Path                                   | Scope                                                 |
| -------------------------------------- | ----------------------------------------------------- |
| `AGENTS.md` (this file)                | Cross-tool source of truth for agent defaults         |
| `CLAUDE.md`                            | Claude Code entry; imports this file via `@AGENTS.md` |
| `.cursor/rules/workbench-kit-core.mdc` | Cursor always-applied mirror of critical defaults     |
| `.cursor/rules/npm-release.mdc`        | Publish scripts, workflows, package publish metadata  |
| `.cursor/hooks.json`                   | Cursor-only shell gate for commit/push safety checks  |

When conventions and code disagree, update code **and** docs/rules together.
Do not duplicate long policy into `CLAUDE.md` or Cursor rules—edit this file or
`docs/conventions/` instead.
