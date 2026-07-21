# Agent guidance layout

This repository is used with multiple coding agents (Cursor, Codex, Claude Code,
and others). Keep **one** prose source of truth and thin tool entrypoints.

## Source of truth

| Path                                                                          | Role                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`AGENTS.md`](../../AGENTS.md)                                                | **Canonical** cross-tool agent defaults                          |
| [`docs/conventions/`](./)                                                     | Detailed human/agent policies (public refs, git, Storybook, npm) |
| [`docs/conventions/public-reference-policy.md`](./public-reference-policy.md) | Public package + secrets boundary                                |

Put shared rules in `AGENTS.md` (short) or `docs/conventions/` (long). Do not
maintain parallel full copies per tool.

## Tool entrypoints (thin)

| Path                  | Tool                                    | Rule                                                  |
| --------------------- | --------------------------------------- | ----------------------------------------------------- |
| `AGENTS.md`           | Codex (native), others that read AGENTS | Edit shared defaults here                             |
| `CLAUDE.md`           | Claude Code                             | Imports `@AGENTS.md`; Claude-only notes only          |
| `.cursor/rules/*.mdc` | Cursor                                  | Mirror **critical** defaults; link to docs for detail |
| `.cursor/hooks.json`  | Cursor                                  | Shell gate for commit/push safety (backstop only)     |

When a Cursor rule and `AGENTS.md` disagree, update **both** in the same change.

## Mandatory checks (all tools)

Before every `git commit` / `git push`:

```powershell
pnpm check:commit-safety
```

Editor hooks (Cursor) are optional backstops. Codex and Claude Code must run the
script themselves.

## UI verification

Routine UI checks may use the active tool’s browser or preview. Playwright /
`pnpm validate:ui` is not required unless CI parity is requested.

## Do not

- Put internal company knowledge or secrets in any agent file (see public
  reference policy)
- Grow `CLAUDE.md` or Cursor rules into a second full policy document
- Add tool-specific copies of npm/git/Storybook policy—link to conventions
