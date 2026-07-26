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

- `packages/*` — publishable `@workbench-kit/*` packages (all on npm via `NPM_PUBLISH_ORDER`)
- `scripts/` — build, validation, and release automation
- `.github/workflows/` — CI including `publish.yml` (npm) and Pages deploy
- `docs/conventions/` — human-readable policies
- `.cursor/rules/` — Cursor agent rules (mirror critical conventions)

## Release & npm (high priority)

Full detail: [`docs/conventions/npm-release.md`](docs/conventions/npm-release.md)

| Topic                   | Rule                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| Public publish set      | `NPM_PUBLISH_ORDER` in `scripts/npm-publish-config.mjs` (19 packages) |
| CI publish set          | Same as `NPM_PUBLISH_ORDER` — do not maintain a smaller allowlist     |
| Not published           | `extensions/*` (repo-local only)                                      |
| First release / updates | Push tag `v<version>` → `publish.yml` (npm OIDC trusted publishing)   |
| Local fallback          | `pnpm publish:packages:local` only when Trusted Publisher unavailable |
| Consumer install tag    | `@prototype` (CI does not move `latest`)                              |
| Auth                    | OIDC only in CI; clear npmrc tokens between publishes                 |

Common failure modes to avoid:

- Shrinking `NPM_CI_PUBLISH_PACKAGES` so some public packages never get CI updates
- Assuming `npm view … version` reflects the CI release (check `@prototype`)
- Using `NPM_TOKEN` in CI publish (breaks OIDC)
- Leaving `_authToken` in npmrc during batch publish (401 mid-run)
- Publishing `react` without sibling packages at the same version on npm

## GitHub issues (IssueOps)

Follow [`docs/conventions/github-issues.md`](docs/conventions/github-issues.md).
Use `.github/ISSUE_TEMPLATE/*` (blank issues disabled). Prefer **Consumer
extract** for host-proven promotions. Issue/PR/comment text is public — same
public-reference rules as commits.

Executable Cursor Automation prompt (keep in sync when editing protocol):
[`docs/conventions/issueops-autohandler-instructions.md`](docs/conventions/issueops-autohandler-instructions.md).

### When agents file or update issues

1. Meet the full quality bar (API sketch, behavior contract, non-goals,
   acceptance, verification). No thin wishlists.
2. Prefer the correct template; expand every section.
3. Link existing kit paths under `packages/` / `docs/`; never private hosts.

### When agents comment (local or automation)

Use the **request envelope** so humans and automations can route:

```text
type: feat | fix | security | question | docs | extract
intent: implement | discuss | clarify
```

| Situation                 | Do                                                                               |
| ------------------------- | -------------------------------------------------------------------------------- |
| Simple usage/API question | `type: question` — answer from public kit sources; no PR                         |
| Ambiguous / thin request  | Do **not** guess — one structured reverse-question comment; `status:needs-human` |
| Want implementation       | Quality bar first, then `run agent` **or** label `status:queued`                 |
| `type: security`          | No public PoC / no drive-by fix — advisory / private channel                     |
| Parent/child links        | Read linked `#N` issues; summarize dependencies in the comment                   |
| Idle hours (automation)   | If queue empty, cron may open one small internal refactor PR — see IssueOps docs |

Status labels: `status:queued` · `in-progress` · `pr-open` · `needs-human` ·
`skipped`. Automation posts use the HTML marker documented in
`github-issues.md`. Never auto-close issues from automation; never push `main`.

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
