# WB-ST-021 — inline rename retry lifecycle

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `4c1855d213e485a5f093a9118aba73e61ca62bf0`.
Part branch: `codex/luna-retry-20260919`.
Scope: [editor and Explorer logic stabilization](../logic-stabilization-plan.md).

## Implementation boundary

Inline rename commits now distinguish a completed rejected attempt from the
presentation of its error. `WorkspaceExplorerInlineEditState.commitAttempt` is
an optional controller-owned revision incremented for each rejected commit. The
component uses that revision, together with the existing draft identity, to
reopen its Enter/blur commit gate after every failure, including repeated
identical validation errors. Existing consumers that do not provide the field
retain their controlled behavior.

The controller continues to hold its in-flight guard until validation or the
mutation promise completes. Enter followed by blur and repeated Enter therefore
share one pending mutation. Validation failures and rejected promises preserve
the draft and value while clearing only the pending guard; successful mutations
clear the draft. No timer or render-based heuristic is used.

## Required cases

Suite: `WorkspaceExplorer inline rename retry`.

1. `retries after two identical validation failures and calls renameEntry`
2. `retries after three identical validation failures`
3. `keeps the draft after a collision and retries with a new name`
4. `deduplicates Enter, blur, and repeated Enter while rename is pending`
5. `opens a retry after a rejected rename promise`
6. `does not let an old promise clear or report over a replacement draft`
7. `cancels an idle draft with Escape without committing`

The integrated fixture failed on the unchanged source after two identical
invalid submissions: the later valid Enter left `renameEntry` at zero. All seven
cases pass after the explicit attempt revision repair. Existing Explorer,
context, and controller suites remain green.

## Validation

| Command                                                                                                                                                                                                                                                                                                                                         | Result                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                | PASS; independent worktree install |
| `pnpm exec vitest run --config vitest.config.ts packages/react/src/workbench/workspace/WorkspaceExplorer.retry.test.tsx`                                                                                                                                                                                                                        | PASS; 1 file / 6 tests             |
| `pnpm exec vitest run --config vitest.config.ts packages/react/src/workbench/workspace/WorkspaceExplorer.retry.test.tsx packages/react/src/workbench/workspace/WorkspaceExplorer.test.tsx packages/react/src/workbench/workspace/WorkspaceExplorer.context.test.tsx packages/react/src/workbench/workspace/workspaceExplorerController.test.ts` | PASS; 4 files / 23 tests           |

The containing commit is the local review candidate. The integrator owns
combined browser plays, verification registration, full fast validation and
integration decisions.

## Limits

The focused fixture uses JSDOM with a real `WorkspaceExplorer` and
`useWorkspaceExplorerController` port. It proves retry, deduplication, promise
rejection and draft cancellation state transitions, but not native browser
focus timing, actual workspace persistence, Electron lifecycle or combined
sample browser evidence. No release, publish, push or consumer adoption is
claimed.
