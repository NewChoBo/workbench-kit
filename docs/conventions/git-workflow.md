# Git Workflow

Keep `main` as a validated baseline. Do product work on short-lived branches,
preserve logical commits, and verify both the selected validation lane and the
public boundary before merging.

## Branches

### main

- Keep it releasable.
- Do not use it for experiments.
- Run `pnpm validate` before merging into it.
- Confirm that public source does not contain private product names, customer
  names, server addresses, credentials, or private repository paths.

### staging

- Use as an integration buffer before `main`.
- Merge feature branches here when you need grouped validation or a release
  milestone boundary.
- Run the selected validation lane before merging `staging` into `main`.
- Keep only validated and coherent integration commits on `staging`.
- Use lowercase branch name exactly: `staging`.

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
git switch main
git pull --ff-only
git switch -c feature/codex/chatting-ui
```

1. Create a working branch.
2. Keep the changed surface narrow.
3. Commit by logical unit.
4. Write a body for each non-trivial commit.
5. Run the validation lane selected for the changed surface.
6. Review related docs and update stale status tables, sample READMEs, architecture
   notes, or plans in the same logical commit when behavior or public contracts
   changed.
7. Confirm that no private knowledge or internal sample data entered public source.
8. Merge by policy:
   - single-topic work can merge directly to `main`;
   - grouped work should merge through `staging` first.

```powershell
git switch main
git merge --ff-only feature/codex/chatting-ui
git branch -d feature/codex/chatting-ui
```

```powershell
git switch staging
git merge --ff-only feature/codex/chatting-ui
git switch main
git merge --no-ff staging
git branch -d feature/codex/chatting-ui
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
- The branch has not diverged from `main` at merge time.
- You are building an initial local baseline without a pull request.

```powershell
git switch main
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
- A planned merge from `staging` into `main` where preserving the milestone
  boundary is a deliverable signal.

When using a merge commit, pass `--no-ff` and explain why fast-forward was not
used in the merge commit body.

```powershell
git switch main
git merge --no-ff feature/codex/chatting-ui
```

Summary: fast-forward is the default, squash cleans up noisy branches, and merge
commits are reserved for integration events worth preserving.

## Staging Merge Pattern

Use `staging` when multiple feature branches should land together.

```text
1. Ensure `staging` is aligned with `main` (`git switch staging; git pull --ff-only`).
2. Merge topic branches into `staging`.
3. Validate the combined state on `staging`.
4. Merge `staging` into `main` with `--no-ff` to preserve the integration commit.
```

```powershell
git switch staging
git pull --ff-only
git merge --ff-only feature/codex/chat-service-hardening
git merge --ff-only feature/codex/save-service-tests
git merge --ff-only feature/codex/patch-service-edge-cases
pnpm validate
```

```powershell
git switch main
git merge --no-ff staging
pnpm validate
git tag -a milestone/2026-06-03 -m "chore: merge staging milestone"
```

For branches in `staging` that must keep internal structure, use `--no-ff` at
that specific merge.

```powershell
git switch staging
git merge --no-ff feature/codex/plugin-runtime
```

> If `staging` does not exist yet, create it once from `main`:

```powershell
git switch main
git pull --ff-only
git switch -c staging
git push -u origin staging
```

## Parallel Workspaces

When multiple tasks run at the same time, do not keep switching branches in the
same working tree. Use separate worktrees so each branch has its own files,
install state, build output, and dev server.

Recommended layout:

```text
<workspace-root>\newchobo-ui-package
<workspace-root>\newchobo-ui-package-worktrees\chatting-ui
<workspace-root>\newchobo-ui-package-worktrees\storybook-baseline
```

Create worktrees:

```powershell
git switch main
git pull --ff-only
git worktree add ..\newchobo-ui-package-worktrees\chatting-ui -b feature/codex/chatting-ui main
git worktree add ..\newchobo-ui-package-worktrees\storybook-baseline -b chore/storybook/react-vite-baseline main
```

Run install, dev servers, and validation inside each worktree independently.

```powershell
Set-Location ..\newchobo-ui-package-worktrees\chatting-ui
pnpm install
pnpm validate
```

Merge order:

1. Commit work in each worktree.
2. Run the selected validation lane in each worktree.
3. Return to the main workspace and select the branch to merge first.
4. Try `git merge --ff-only <branch>`.
5. If it fails, rebase or resolve conflicts in the branch worktree.
6. After merging, run `pnpm validate` again in the main workspace.
7. Remove the merged worktree and delete the branch.

```powershell
git switch main
git merge --ff-only feature/codex/chatting-ui
pnpm validate
git worktree remove ..\newchobo-ui-package-worktrees\chatting-ui
git branch -d feature/codex/chatting-ui
```

Use separate dev server ports for simultaneous worktrees. For example, keep the
main Storybook server on `6010` and run another worktree with
`storybook dev --port 6011`.

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
