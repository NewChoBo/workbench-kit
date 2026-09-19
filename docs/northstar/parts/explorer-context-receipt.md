# WB-ST-020 — Explorer component context ownership

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `430a657ed18f8ab85475471533026e30edd101a2`.
Part branch: `codex/part-explorer-context-20260919`.
Scope: [Explorer context UX](../explorer-context-ux.md).

## Component contract

The additive `onRequestItemContextMenu` callback receives
`WorkspaceExplorerItemContextMenuRequest`: `{ node, meta, invoker, x, y }`.
`meta` retains the existing action metadata, and `invoker` is the actual button.
The new callback takes precedence over the existing pointer-only callback.
Without it, the existing callback still receives the real pointer event; no More
button or new keyboard interception is introduced. No synthetic MouseEvent is
constructed by production code.

Pointer, More, Shift+F10 and ContextMenu share target selection. A selected file
retains the multi-file set and anchor while updating focusedPath. An unselected
file becomes the single selection; a folder becomes focused with no file
selection. Requests do not activate files, expand folders or start edits.
More and keyboard placement use the invoking button's left/bottom rectangle.
More is labeled `More actions for ${node.path}` and composes with existing custom
actions in the sibling action slot, without nested buttons or row key handling.

Context invokers focus without scrolling, and the request lets the owning menu
restore that exact invoker on Escape. Keyboard row navigation uses normal DOM
focus, allowing the browser to reveal off-screen targets. Delete and F2 then
operate on the row that actually received focus.

The shared native-context policy runs before list background menu delegation.
While an inline draft is active, More is disabled and new custom menu requests
are deferred. Secondary mousedown on non-native list content prevents the focus
transfer that would otherwise commit the draft on blur. The rename input keeps
its native menu, selection and existing Enter/error-retry/Escape behavior.

Production changes are limited to `WorkspaceExplorer.tsx` and the type export in
`workbench/workspace/index.ts`. The focused package entry already points directly
to WorkspaceExplorer, so no package manifest, shared SideBarList, stylesheet or
budget changes are needed. Shell commands, stale-snapshot invalidation and actual
workspace mutations remain integration-owned.

## Regression cases

Suite `WorkspaceExplorer context ownership`:

1. `preserves the selected set and anchor while focusing the pointer target once`
2. `selects the unselected file target without opening or expanding it`
3. `selects the folder target without opening or expanding it`
4. `preserves the real pointer callback fallback without adding inert keyboard or More entries`
5. `uses the real invoker rectangle and common targets for More`
6. `uses the real invoker rectangle and common targets for Shift+F10`
7. `uses the real invoker rectangle and common targets for ContextMenu`
8. `keeps custom action siblings independent from More and row keyboard actions`
9. `returns from Escape to B then moves DOM focus and Delete or F2 targets to C`
10. `moves real focus for Home End arrows and horizontal folder navigation`
11. `preserves native rename menus and prevents context entry from committing an active draft`
12. `retains inline rename Enter retry and Escape cancellation after native context use`

The initial new suite failed 11 cases and passed one on unchanged production
source. After repair, all 12 pass. Existing Explorer/Panel render, navigation and
shared action-slot tests bring the focused lane to 5 files / 29 tests. The End
case also checks that native focus is called without suppressing browser scroll.

## Validation

This branch reuses the worktree's independent frozen pnpm installation; dependency
manifests and the lockfile are unchanged from its installed baseline. Earlier
branches remain preserved.

| Command                                                                                                                                                                                                                                                                                                                                                                        | Result                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `pnpm exec vitest run packages/react/src/workbench/workspace/WorkspaceExplorer.context.test.tsx packages/react/src/workbench/workspace/WorkspaceExplorer.test.tsx packages/react/src/workbench/workspace/WorkspaceExplorerPanel.test.tsx packages/react/src/workbench/workspace/workspaceExplorerKeyboard.test.ts packages/react/src/layout/sidebar/SideBarViewFrame.test.tsx` | PASS; 5 files / 29 tests |
| `pnpm --filter @workbench-kit/react typecheck`                                                                                                                                                                                                                                                                                                                                 | PASS                     |
| `pnpm --filter @workbench-kit/react typecheck:exact-optional`                                                                                                                                                                                                                                                                                                                  | PASS                     |
| `pnpm exec eslint packages/react/src/workbench/workspace/WorkspaceExplorer.tsx packages/react/src/workbench/workspace/WorkspaceExplorer.context.test.tsx packages/react/src/workbench/workspace/index.ts`                                                                                                                                                                      | PASS                     |
| `pnpm exec prettier packages/react/src/workbench/workspace/WorkspaceExplorer.tsx packages/react/src/workbench/workspace/WorkspaceExplorer.context.test.tsx packages/react/src/workbench/workspace/index.ts docs/northstar/parts/explorer-context-receipt.md --check`                                                                                                           | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                                                                                                                                               | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                                                                                                                                                     | PASS                     |
| `git diff --cached --check`                                                                                                                                                                                                                                                                                                                                                    | PASS                     |

The containing commit is the review candidate; the integrator records the exact
SHA, independent review, browser evidence and combined validation separately.

## Limits

Tests render real WorkspaceExplorer and ContextMenu against controlled selection
and draft state. Synthetic DOM events verify callback ownership and focus;
JSDOM cannot prove native keyboard-generated clicks, OS menus, viewport geometry
or automatic scrolling. Row geometry is controlled for anchor assertions. The
tests do not claim a file was persisted or a backend mutation succeeded. Actual
shell/controller commands, rename error recovery, stale workspace invalidation,
browser plays, packed consumers and full fast validation are integration gates.
No release or consumer adoption is claimed.
