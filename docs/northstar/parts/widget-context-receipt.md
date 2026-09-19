# WB-ST-019 — Widget Tree context actions receipt

Admission: `2bfed344ce4c1e76a09720062f9347a948322574`,
[`context-editing-ux.md`](../context-editing-ux.md).

## Delivery

One `WidgetTreeLab` menu owns the selected authored target. Outline right-click,
More actions and Shift+F10/ContextMenu, plus canvas right-click and keyboard entry,
request the same existing property, sibling movement and removal handlers.
Read-only mode offers Inspect properties with disabled mutations. Root removal
and unavailable sibling moves remain disabled.

The optional View/Canvas callback carries `{ path, invoker, x, y }`; existing
standalone callers need not provide it. Menu opening only updates selection/focus.
Document value/path, mode and write-permission changes invalidate the stored menu
during rendering. Parsing and target lookup also guard validity. Inspector edits
continue through the existing controlled `onChange`; no history, Save, Apply or
persistence owner was added.

Canvas lookup uses the nearest path and rejects paths without an authored node,
including expanded reference children. Chrome frames return focus to the matching
rendered node. Native text context decisions reuse
`shouldAllowNativeBrowserContextMenu`; the separate WB-ST-018 part owns expanded
native-target and generic menu dismissal coverage.

## Regression evidence

The initial 13 real React/JSDOM cases ran before production edits: **12 failed,
1 passed**. After implementation they passed. Two additional cases cover actual
reference expansion and secondary-pointer canvas chrome. The latter's focus
assertion first failed because the frame cannot receive focus, then passed with
the rendered-node return target.

Suite: `packages/react/src/widget-tree/WidgetTreeLab.context.test.tsx`,
describe `WidgetTreeLab context actions`, **15 cases**:

1. `targets the right-clicked outline node without editing and restores focus on Escape`
2. `opens the targeted Inspector and edits that node through the existing controlled callback`
3. `shares More and keyboard actions with the invoking row rectangle and no nested buttons`
4. `moves only the targeted sibling once and keeps the moved node selected`
5. `protects the root and removes the targeted child once with parent selection`
6. `allows read-only inspection while disabling every mutation`
7. `invalidates an open menu on replacement before a stale action can edit`
8. `invalidates an open menu on document path before a stale action can edit`
9. `invalidates an open menu on parse failure before a stale action can edit`
10. `invalidates an open menu on mode before a stale action can edit`
11. `invalidates an open menu on permission before a stale action can edit`
12. `targets the nearest authored canvas node for pointer and keyboard requests without a drag`
13. `preserves native editable context menus and ignores unowned canvas paths`
14. `does not retarget an expanded reference child to an authored ancestor`
15. `does not start a resize or drag from a secondary pointer on canvas chrome`

## Local checks

- `pnpm install --frozen-lockfile` — PASS; independent worktree installation.
- `pnpm exec vitest run packages/react/src/widget-tree/WidgetTreeLab.context.test.tsx packages/react/src/widget-tree/WidgetTreeView.test.tsx packages/react/src/widget-tree/WidgetTreeCanvasPreview.test.tsx packages/react/src/widget-tree/WidgetTreeLab.test.tsx packages/react/src/widget-tree/WidgetTreeWorkbench.test.tsx`
  — PASS, 5 files / 56 tests.
- `pnpm --filter @workbench-kit/react typecheck` — PASS.
- `pnpm --filter @workbench-kit/react typecheck:exact-optional` — PASS.
- `pnpm exec eslint` on the five changed TypeScript/TSX files — PASS.
- `pnpm exec prettier --check` on all seven changed files — PASS.
- `pnpm check:workspace-isolation` — PASS.
- `pnpm check:commit-safety` and `git diff --check` — PASS.

This part proves React/JSDOM behavior, including actual controlled document edits.
It does not prove browser menu geometry, native OS menus, framework-wide UI
portability or persistent writes. The integrator owns browser/Storybook, combined
WB-ST-018 behavior, full-fast and packed-budget gates. No release is implied.
