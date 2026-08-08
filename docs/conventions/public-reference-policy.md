# Public Reference Policy

Workbench Kit is a **public open-source npm package** (`NewChoBo/workbench-kit`,
`@workbench-kit/*`). Anything that lands in this repository—including agent
guides, Cursor rules, commits, docs, comments, stories, and samples—must be safe
to publish and clone without exposing private company knowledge.

## Scope (everything tracked)

This policy applies to:

- Source and tests under `packages/`, `extensions/`, `examples/`, `scripts/`
- Human docs under `docs/`, `README.md`, `AGENTS.md`, `CLAUDE.md`
- Agent instructions under `.cursor/rules/`, `.cursor/hooks/`, and similar
- Commit messages and PR titles/bodies for this repository
- Storybook copy and sample-host UI strings

There is **no private docs lane** inside this repo. If material is internal-only,
keep it out of the tree (private notes, private monorepo, or an unpublished
gist)—do not commit it here “for later cleanup.”

## Allowed

- Open-source references (for example VS Code, Theia, Monaco, ComfyUI as a
  design metaphor)
- Generic terms: consumer app, integrating host, reference implementation,
  product shell, private monorepo
- This repository name (`NewChoBo/workbench-kit`) and published `@workbench-kit/*`
  packages

## Forbidden

- Internal or sibling repository names and clone paths
- Proprietary product or host codenames and customer-specific identifiers
- Paths into private monorepos (`../other-repo/...`)
- Commit-message or workflow contrasts that name a specific consumer repo
- Agent prompts, sticky notes, or “context dumps” that assume a private host
  codebase

When migration notes need a source, describe the **capability** (widget-tree
editor, launchpad preview bridge, content-hub navigation) without naming the
host product.

## Secrets and credentials

Never commit secrets to this repository, and never hardcode them in tracked
text—including **source, comments, markdown, stories, samples, and agent
rules**. A key in a `// TODO` comment or a README “example” that is a real
token is still a leak.

Forbidden examples:

- API keys, personal access tokens, OAuth client secrets, refresh tokens
- Cloud credentials (AWS/GCP/Azure keys), npm/`_authToken`, Slack/GitHub tokens
- Private keys (`*.pem`, SSH keys), `credentials.json`, real `.env` files
- Hard-coded passwords or connection strings with embedded secrets
- Pasting secrets into Cursor chat and then writing them into the tree

Allowed:

- `process.env.*` / host secret-storage APIs (no literal secret values)
- Placeholder docs values (`YOUR_API_KEY`, `<token>`, `changeme`)
- Committed templates only: `.env.example`, `.env.sample`, `.env.template`

Put real values in local-only files ignored by git (see root `.gitignore`) or in
OS/host secret storage. If a secret is committed by mistake, rotate it
immediately—removing the commit is not enough.

**Agent guidance:** Cursor always-applied rules (`AGENTS.md`,
`.cursor/rules/workbench-kit-core.mdc`) state this policy so agents avoid
introducing secrets; `pnpm check:secrets` is the automated backstop before
commit/push.

## Agent and contributor defaults

- Treat every edit as public surface area.
- Prefer capability language over host-product language.
- Never paste keys, tokens, or `.env` contents into source, docs, commits, or
  agent context that will be written into the tree.
- Write commit messages in English (see [language-policy.md](./language-policy.md)).
- Keep Storybook and README examples product-neutral.
- If a file still names a forbidden project, replace it with neutral language in
  the same change—do not leave it as cleanup debt on a public branch.

## Enforcement

```powershell
pnpm check:commit-safety
```

(`check:public-references` + `check:secrets`. Also inside `pnpm validate:static`.)

**Required before every commit** for all agents and humans. Cursor shell hooks
are an extra backstop (`.cursor/hooks/gate-git-publish-safety.mjs`); Codex,
Claude Code, and plain git do not get that hook, so they must run
`check:commit-safety` explicitly.

Internal-name denylist tokens live only in
`scripts/check-public-references.mjs`. Secret heuristics live in
`scripts/check-secrets.mjs`.

Consumer-branded protocol, MIME, sample, and UI identifiers are not valid public
Kit APIs. Use neutral capability names and keep product adapters in the integrating host.

Before merge to `develop` or `main`, confirm:

1. `pnpm check:public-references` and `pnpm check:secrets` pass
2. Commit messages and PR text do not name private hosts or sibling repos
3. No credentials, private keys, or real `.env` files were added
