# Claude Code entry

Cross-tool agent defaults live in [`AGENTS.md`](./AGENTS.md). Treat that file as
the source of truth.

@AGENTS.md

## Claude-only notes

- Prefer repository scripts (`pnpm …`) over ad-hoc toolchains.
- Before every commit: `pnpm check:commit-safety`.
- Do not duplicate long policy here—update `AGENTS.md` or
  `docs/conventions/` instead.
