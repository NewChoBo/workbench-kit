# Git Workflow

Keep `main` as a validated, releasable baseline. Integrate daily work on
`develop`, use short-lived topic branches, preserve logical commits, and verify
the selected validation lane plus the public boundary before merging.

## Commit and merge authority

Within the authorized task and reviewed scope, agents may commit on non-main
branches and merge accepted changes into non-main targets, including `develop`,
without renewed user permission. Before updating `develop`, complete affected
input self-validation and a current-candidate code review by a reviewer distinct
from the producer; resolve all blockers. Reuse unchanged evidence when its
inputs are identical. Verify source and target, preserve unrelated work, and
satisfy applicable validation, independent review, and public-boundary checks.
In coordinated work, the lead alone integrates.

This includes merging an existing PR whose verified base is non-main. It does
not independently authorize publishing a branch with `git push`; standalone
pushes require existing explicit user or automation authorization. Any update
to `main`, including a local commit or merge, remote PR merge, or push, needs
specific user authorization. Tags, publishing, release, package, and deploy
operations remain separate gates requiring explicit authorization. This policy
grants no new scheduled-run, force-push, branch-deletion, or scope-expansion
authority.

## Branches

### main

- Keep it releasable (publish / tag source of truth).
- Do not use it for experiments.
- Promote from `develop` only with separate explicit user authorization (see
  Commit and merge authority).
- Confirm that public source does not contain private product names, customer
  names, server addresses, credentials, or private repository paths.
- Run `pnpm check:commit-safety` before every commit (included in
  `pnpm validate:static` as `check:public-references` + `check:secrets`).

### develop

- Daily integration target. Feature / fix / docs PRs land here first.
- Keep it green: run the selected validation lane before merge.
- Promote to `main` only with separate explicit user authorization (see Commit
  and merge authority).
- Use lowercase branch name exactly: `develop`.
- For ordinary new work, refresh remote refs and base the topic branch on the
  latest `origin/develop`.
- Update a local `develop` only with fast-forward after confirming its dirty and
  unique local work is accounted for. If it has diverged, reconcile it; never
  reset or force it to match the remote.

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

For Codex, use the managed `create_worktree` tool first and explicitly set
`ref: origin/develop` (or the exact different base requested by the user). The
manual shell example below is for human CLI use, and is a Codex fallback only
when the managed tool is unavailable or the user explicitly requests manual CLI.

```powershell
git fetch origin
git worktree add ..\workbench-kit-worktrees\chatting-ui -b feature/codex/chatting-ui origin/develop
```

1. Refresh remote refs, then create a `feature/codex/<topic>` branch from the
   latest `origin/develop` in an isolated worktree.
2. Keep the changed surface narrow.
3. Commit by logical unit.
4. Write a body for each non-trivial commit.
5. Run the validation lane selected for the changed surface.
6. Review related docs and update stale status tables, sample READMEs, architecture
   notes, or plans in the same logical commit when behavior or public contracts
   changed.
7. Confirm that no private knowledge, credentials, or secret files entered
   public source (`pnpm check:commit-safety`).
8. Prepare the current candidate for a PR into `develop` or local integration;
   do not update the target yet.
9. Before any develop ref update, finish affected-input self-validation and
   producer-distinct review of the exact current candidate with no blockers.
   Reuse evidence whose inputs are unchanged. If the candidate or target inputs
   change, refresh affected evidence. Main promotion is separately authorized
   only (see above).

```powershell
git switch develop
git merge --ff-only feature/codex/chatting-ui
```

Retire a branch only after verifying its exact ancestry or fully reviewed
equivalence, confirming there are no open PRs, active uses, or unique work, and
making a recovery backup. Recheck the fresh branch SHA and active checkout/use
leases immediately before deletion. Patch equivalence alone never authorizes
forced deletion.

```powershell
# Promote develop → main (single commit tip: prefer FF; otherwise --no-ff)
# Example for separately authorized main promotion only.
git switch main
git pull --ff-only
git merge --ff-only develop   # or: git merge --no-ff develop
pnpm validate                 # required before any release tag on this tip
git push origin main
# Tag/publish only after `pnpm validate` passes and the user explicitly
# authorizes this release operation.
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
# Example for separately authorized main promotion only.
git switch main
git merge --no-ff develop
```

Summary: fast-forward is the default, squash cleans up noisy branches, and merge
commits are reserved for integration events worth preserving.

## Grouped landing on develop

When several topic branches should validate together before `main`, accept the
candidate only after its combined state passes affected-input self-validation
and producer-distinct current-candidate review with no blockers. Reuse evidence
when its inputs are unchanged. Main promotion commands below are examples for
separately authorized promotion only.

```text
1. Ensure develop is current and its local work is accounted for.
2. Create a short-lived integration branch from the exact develop tip.
3. Merge the topic branches into that candidate branch (FF when possible).
4. Run affected-input self-validation on the combined candidate.
5. Have a reviewer distinct from the candidate producer review its exact diff;
   resolve every blocker. Reuse evidence when its inputs are unchanged.
6. Merge the accepted candidate into develop only after those gates pass. If
   the develop target or candidate inputs changed, refresh affected validation
   and review evidence before updating develop.
7. Main promotion (FF or --no-ff as needed) requires separate explicit user
   authorization.
```

```powershell
git switch develop
git pull --ff-only
git switch -c integration/codex/grouped-landing
git merge --ff-only feature/codex/chat-service-hardening
# The independent second branch diverges; record its integration explicitly.
git merge --no-ff feature/codex/save-service-tests
pnpm validate:fast  # Or choose the minimum lane for the changed combined surface.
# Have a reviewer distinct from the producer review this exact candidate diff.
git switch develop
git merge --ff-only integration/codex/grouped-landing
```

```powershell
# Example for separately authorized main promotion only.
git switch main
git merge --ff-only develop
pnpm validate
# Full validation on this exact release tip is required before tagging.
# Tagging and publishing also require explicit user release authorization.
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
git fetch origin
git worktree add ..\workbench-kit-worktrees\chatting-ui -b feature/codex/chatting-ui origin/develop
git worktree add ..\workbench-kit-worktrees\storybook-baseline -b chore/storybook/react-vite-baseline origin/develop
```

Prefer reusing a free checkout. Do not switch, reset, or advance a dirty or
in-use worktree, including a consumer checkout pinned to a fixed Kit source.
When updating a local `develop`, first account for dirty and unique local work,
then use fast-forward only; divergence requires reconciliation, never reset or
force. Managed Codex worktree creation may default to `main`, so explicitly pass
`ref: origin/develop` unless the user requested another base.

Run install, dev servers, and validation inside each worktree independently.

```powershell
Set-Location ..\workbench-kit-worktrees\chatting-ui
pnpm install
pnpm validate:static
```

Merge order (main promotion is separately authorized only):

1. Commit work in each worktree.
2. Run the selected validation lane in each worktree.
3. In an integration checkout, create a short-lived candidate branch from the
   exact `develop` tip and merge the completed topic branches into it.
4. Run affected-input self-validation on that combined candidate, then require
   producer-distinct review of its exact diff with no blockers. Reuse unchanged
   evidence.
5. Merge the accepted candidate into `develop` only after both gates pass. If
   the target or candidate inputs changed, refresh affected validation and
   review before updating `develop`.
6. Prefer reusing a free checkout. If a managed Codex worktree is no longer
   needed, archive it after ongoing use has stopped and dirty, untracked, and
   needed ignored files have been accounted for.
7. Promote `develop` → `main` only with separate explicit user authorization.

```powershell
git switch develop
git switch -c integration/codex/parallel-workspaces
git merge --ff-only feature/codex/chatting-ui
# The independent second branch diverges; record its integration explicitly.
git merge --no-ff chore/storybook/react-vite-baseline
pnpm validate:static
# Have a reviewer distinct from the candidate producer review this exact diff.
# Refresh affected evidence here if the candidate or develop target inputs changed.
git switch develop
git merge --ff-only integration/codex/parallel-workspaces
```

Before retiring a branch or checkout, verify exact ancestry or fully reviewed
equivalence, check PRs, active use and unique work, create a recovery backup,
then recheck its fresh SHA and active-use leases. Patch equivalence alone does
not authorize forced deletion. Prefer a free checkout for the next task; archive
a managed Codex worktree only when it is no longer needed and its dirty,
untracked, and needed ignored files are accounted for.

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
