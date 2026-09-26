# WB-ST-019B — source cursor selection ownership

Status: `LOCAL_VALIDATED / SOURCE_REVIEW_REQUIRED / INTEGRATION_PENDING`.
Admission branch point: `2064d117584afe326856b1ea7551acdea41ef690`.
Part branch: `codex/part-source-cursor-20260919`.
Scope: [context editing UX](../context-editing-ux.md).

## Repair boundary

WidgetSourceEditor stores the current Monaco editor through the existing
`onEditorMount` callback. Cursor notifications select an authored widget only
while that editor reports text focus. Unfocused model synchronization and
controlled selection reveal still update code and decorations, but cannot change
the Inspector's selection. No callback shape, second selection store, focus
listener or public export was added.

An explicit Problems click previously moved the cursor before focusing code.
JsonCodeEditorPane now focuses first, then uses its existing position/reveal
calls. This preserves intentional problem navigation under the focused-cursor
policy. Generic cursor notification semantics and ordinary reveal effects are
unchanged. The integrator explicitly admitted this narrow ordering repair after
the initial packet to preserve existing problem navigation.

Production changes are limited to `widget-tree/WidgetSourceEditor.tsx` and
`jdw/JsonCodeEditorPane.tsx` under `packages/react/src`. One adjacent cursor test
file and this receipt complete the part. Actual Monaco story evidence and the
verification registry belong to the integrator.

## Regression cases

Suite `WidgetSourceEditor cursor ownership`:

1. `ignores an unfocused model cursor event while the Inspector owns editing`
2. `selects the authored node for focused code navigation and ignores invalid positions`
3. `reveals external selection and synchronizes changed source without retargeting the Inspector`
4. `uses the latest source root and callback for focused cursor navigation`
5. `focuses code before an explicit problem jump so its authored node becomes selected`
6. `replaces the mounted editor and disposes cursor forwarding on unmount`

Before production changes, the six new cases produced five failures and one
pass. Failures included selection callbacks from unfocused model/reveal events
and problem positioning before code focus. The focused positive case also caught
an unwanted initial reveal callback. After repair, all six pass; the existing
source-range and JSON-pane helper cases bring the focused result to 3 files /
14 tests.

## Validation

The worktree reuses its independent frozen pnpm installation. The admission has
no dependency-manifest or lockfile changes relative to that installed baseline.
The former part branch is preserved; this part starts a separate branch at the
exact admission rather than rewriting earlier history.

| Command                                                                                                                                                                                                                                          | Result                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `pnpm exec vitest run packages/react/src/widget-tree/WidgetSourceEditor.cursor.test.tsx packages/react/src/widget-tree/WidgetSourceEditor.test.ts packages/react/src/jdw/JsonCodeEditorPane.test.ts`                                             | PASS; 3 files / 14 tests |
| `pnpm --filter @workbench-kit/react typecheck`                                                                                                                                                                                                   | PASS                     |
| `pnpm --filter @workbench-kit/react typecheck:exact-optional`                                                                                                                                                                                    | PASS                     |
| `pnpm exec eslint packages/react/src/widget-tree/WidgetSourceEditor.tsx packages/react/src/widget-tree/WidgetSourceEditor.cursor.test.tsx packages/react/src/jdw/JsonCodeEditorPane.tsx`                                                         | PASS                     |
| `pnpm exec prettier packages/react/src/widget-tree/WidgetSourceEditor.tsx packages/react/src/widget-tree/WidgetSourceEditor.cursor.test.tsx packages/react/src/jdw/JsonCodeEditorPane.tsx docs/northstar/parts/source-cursor-receipt.md --check` | PASS                     |
| `pnpm check:workspace-isolation`                                                                                                                                                                                                                 | PASS                     |
| `pnpm check:commit-safety`                                                                                                                                                                                                                       | PASS                     |
| `git diff --cached --check`                                                                                                                                                                                                                      | PASS                     |

The containing commit is the review candidate; its exact SHA and integrated
validation are recorded separately by the integrator.

## Limits

Tests render real WidgetSourceEditor and JsonCodeEditorPane. A controlled Monaco
host adapter emits cursor events, reports actual DOM focus, and records listener
disposal; source parsing and path resolution remain real. This is focused React
ownership evidence, not real Monaco model-update or browser typing evidence.
The integrator owns the real multi-character Inspector edit, user code navigation,
Save/Discard story, combined fast validation and packed-size checks. No release,
cross-browser qualification or consumer adoption is claimed.
