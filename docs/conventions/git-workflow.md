# Git Workflow

Keep `main` as a validated, releasable baseline. Integrate daily work on
`develop`, use short-lived topic branches, preserve logical commits, and verify
the selected validation lane plus the public boundary before merging.

## Branches

### main

- Keep it releasable (publish / tag source of truth).
- Do not use it for experiments.
- Promote from `develop` after validation (see Merge flow).
- Confirm that public source does not contain private product names, customer
  names, server addresses, credentials, or private repository paths.
- Run `pnpm check:commit-safety` before every commit (included in
  `pnpm validate:static` as `check:public-references` + `check:secrets`).

### develop

- Daily integration target. Feature / fix / docs PRs land here first.
- Keep it green: run the selected validation lane before merge.
- Promote to `main` when ready to release or keep `main` current.
- Use lowercase branch name exactly: `develop`.

There is **no** long-lived `staging` branch. Grouped validation happens on
`develop` (or a short-lived integration branch that merges into `develop`).

### Working Branches

Branch names use this format:

```text
<lane>/<owner-or-scope>/<topic>
```

- `lane`: `feature`, `fix`, `refactor`, `docs`, `chore`, `test`
- `owner-or-scope`: `codex`, `react`, `tokens`, `sample`, `storybook`, `docs`, `release`
- `topic`: one or two kebab-case words, or a short kebab-case phrase

Examples:

```text
feature/codex/chatting-ui
feature/react/dialog-positioning
docs/codex/workflow-conventions
chore/storybook/react-vite-baseline
fix/react/modal-accessible-name
```

Use `codex` for Codex-owned work branches. Use a package or area scope such as
`react`, `tokens`, or `storybook` when ownership is more important than the
actor.

## Work Loop

```powershell
git switch develop
git pull --ff-only
git switch -c feature/codex/chatting-ui
```

1. Create a working branch from `develop`.
2. Keep the changed surface narrow.
3. Commit by logical unit.
4. Write a body for each non-trivial commit.
5. Run the validation lane selected for the changed surface.
6. Review related docs and update stale status tables, sample READMEs, architecture
   notes, or plans in the same logical commit when behavior or public contracts
   changed.
7. Confirm that no private knowledge, credentials, or secret files entered
   public source (`pnpm check:commit-safety`).
8. Open a PR into `develop` (or merge locally per policy below).
9. After `develop` is validated, promote to `main` when releasing or syncing
   the release line.

```powershell
git switch develop
git merge --ff-only feature/codex/chatting-ui
git branch -d feature/codex/chatting-ui
```

```powershell
# Promote develop → main (single commit tip: prefer FF; otherwise --no-ff)
git switch main
git pull --ff-only
git merge --ff-only develop   # or: git merge --no-ff develop
pnpm validate:static          # or the lane required for the promote
git push origin main
```

If a branch has too many experiment, fixup, or revert commits, clean it up
before merging. Preserve logical commits by default. Squash only when a single
final explanation is clearer.

## Merge Policy

The default is linear history. In a small public UI package, the `main` log
should show the order of validated logical changes without unnecessary merge
noise.

### Fast-forward merge

Use `git merge --ff-only` when:

- The branch is short-lived and has one topic.
- The branch commits are meaningful logical units.
- The branch has not diverged from the integration tip (`develop` or `main`).
- You are building an initial local baseline without a pull request.

```powershell
git switch develop
git merge --ff-only feature/codex/chatting-ui
```

### Squash merge

Consider squash merge when:

- The branch contains many experiment, fixup, or revert commits.
- The final change can be explained as one unit.
- Keeping intermediate commits would make public history harder to read.

Even after squash, the final commit body must explain the change and validation.

### Merge commit

Merge commits are not the default. Use one intentionally only when at least one
of these is true:

- Multiple people worked on the same feature branch and the branch is the unit
  of integration.
- A long-running feature branch has internal structure that must be preserved.
- You need to record that multiple independent sub-workstreams were integrated.
- A release, milestone, or external pull request makes the merge event itself
  worth recording.
- A planned `develop` → `main` promote where preserving the boundary is a
  deliverable signal.

When using a merge commit, pass `--no-ff` and explain why fast-forward was not
used in the merge commit body.

```powershell
git switch main
git merge --no-ff develop
```

Summary: fast-forward is the default, squash cleans up noisy branches, and merge
commits are reserved for integration events worth preserving.

## Grouped landing on develop

When several topic branches should validate together before `main`:

```text
1. Ensure develop is up to date (`git switch develop; git pull --ff-only`).
2. Merge topic branches into develop (FF when possible).
3. Validate the combined state on develop.
4. Promote develop → main (FF or --no-ff as needed).
```

```powershell
git switch develop
git pull --ff-only
git merge --ff-only feature/codex/chat-service-hardening
git merge --ff-only feature/codex/save-service-tests
pnpm validate:static
```

```powershell
git switch main
git merge --ff-only develop
pnpm validate:static
git tag -a v0.0.2-prototype.x.y.z -m "Release …"
git push origin main --follow-tags
```

## Parallel Workspaces

When multiple tasks run at the same time, do not keep switching branches in the
same working tree. Use separate worktrees so each branch has its own files,
install state, build output, and dev server.

Recommended layout:

```text
<workspace-root>\workbench-kit
<workspace-root>\workbench-kit-worktrees\chatting-ui
<workspace-root>\workbench-kit-worktrees\storybook-baseline
```

Create worktrees:

```powershell
git switch develop
git pull --ff-only
git worktree add ..\workbench-kit-worktrees\chatting-ui -b feature/codex/chatting-ui develop
git worktree add ..\workbench-kit-worktrees\storybook-baseline -b chore/storybook/react-vite-baseline develop
```

Run install, dev servers, and validation inside each worktree independently.

```powershell
Set-Location ..\workbench-kit-worktrees\chatting-ui
pnpm install
pnpm validate:static
```

Merge order:

1. Commit work in each worktree.
2. Run the selected validation lane in each worktree.
3. Return to the main workspace and merge into `develop` first.
4. Try `git merge --ff-only <branch>`.
5. If it fails, rebase or resolve conflicts in the branch worktree.
6. After merging, run validation again on `develop`.
7. Remove the merged worktree and delete the branch.
8. Promote `develop` → `main` when ready.

```powershell
git switch develop
git merge --ff-only feature/codex/chatting-ui
pnpm validate:static
git worktree remove ..\workbench-kit-worktrees\chatting-ui
git branch -d feature/codex/chatting-ui
```

Use separate dev server ports for simultaneous worktrees. For example, keep the
main Storybook server on `61009` and run another worktree with
`storybook dev --port 61010`.

## Commit Message

Commit messages use Conventional Commits with English summaries and bodies.

```text
<type>(<scope>): <English summary>

<What changed and why>

<Behavioral difference, design decision, or tradeoff>

Validation: <commands and results>
```

- `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- `scope`: `workspace`, `tokens`, `react`, `sample`, `storybook`, `readme`, `docs`
- A commit without a body is allowed only for an obvious one-line change.
- UI changes should mention rendering, accessibility, or browser smoke results.
- Public-boundary changes should mention private-info search or manual review.
- Non-doc code changes should either include related documentation updates or
  state that no docs changed because no public behavior, status table, plan, or
  sample guidance was affected.

Example:

```text
feat(react): normalize dialog primitive state

Connect Modal and ConfirmDialog title ids so dialog accessible names cannot be
omitted accidentally.

Browser smoke confirmed opening the dialog, clicking confirm, and closing it.

Validation: pnpm --filter @workbench-kit/react typecheck passed.
```
