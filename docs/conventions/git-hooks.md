# Git Hooks

Local git hooks run fast checks before commit and broader checks before push.
CI still runs the full `pnpm validate:full` lane on pull requests.

## Setup

Hooks install automatically when dependencies are installed:

```powershell
pnpm install
```

If hooks are missing after clone, run:

```powershell
pnpm prepare
```

## Pre-commit

Runs on every `git commit`:

1. `lint-staged` — ESLint fix and Prettier on staged files
2. `typecheck-staged` — `tsc --noEmit` for workspace packages touched by staged TypeScript files, plus root Storybook config when relevant

Skip temporarily when needed:

```powershell
git commit --no-verify -m "chore: wip"
```

## Pre-push

Runs on every `git push`:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm format:check`

This is faster than `pnpm validate` because it skips Storybook build and launch-boundary checks. Run `pnpm validate` or `pnpm validate:full` before merging into `main` or `staging`.

Skip temporarily:

```powershell
git push --no-verify
```

## Manual commands

```powershell
pnpm precommit
pnpm prepush
pnpm validate
pnpm validate:full
```
