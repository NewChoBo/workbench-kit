# JSON Widget — Port-Then-Replace Policy

Operational guide for JSON widget authoring migration. Consumers (`tile_paper`,
`custom_launcher`) stay **reference-only** until the kit milestone closes (Phase 3).
No consumer swap until Phase 4.

See also: [future-capabilities.md § JSON Widget](./future-capabilities.md#json-widget-port-then-replace-strategy),
[json-widget-mvp.md](./json-widget-mvp.md), [json-config-workbench.md](./json-config-workbench.md).

## Phase summary

| Phase       | Kit action                                                                                                                           | Consumer action                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1 Reference | Study tile_paper tree/editor + launcher preview bridge                                                                               | Keep local stacks                                |
| 2 Port      | Extract neutral primitives into `@workbench-kit/json-widget`, `@workbench-kit/react/json-widget`, `@workbench-kit/react/json-config` | Reference-only                                   |
| 3 Complete  | Storybook baselines, public APIs, play gates, docs                                                                                   | Validate kit readiness                           |
| 4 Swap      | —                                                                                                                                    | Point consumers at kit; delete duplicated chrome |

## Port boundaries (P1)

### Stays in reference repos until Phase 4

- tile_paper domain widget types and tile-specific layout chrome
- Product routes, storage keys, and authoring persistence
- custom_launcher launchpad shell merge (`#workbench-ui` wholesale replacement)

### Ports to `@workbench-kit/json-widget`

- `parseWidgetJson` and registry contract
- Neutral widget shape validation and error models
- Headless editor sync (`editor-sync`, `path`, `selection`, `widget-tree`, `widget-patch`, `widget-child-ops`)
- Layout helpers that do not depend on tile_paper domain types (`layout/grid`, `layout/stack`, `layout/linear`)

### Ports to `@workbench-kit/react/json-widget`

- `JsonWidgetPreview` validation bridge (partially done)
- Editor chrome: `JsonWidgetEditor`, `WidgetTreePanel`, `WidgetInspectorPanel`, `useJsonWidgetEditorSync`
- Monaco ↔ tree ↔ inspector ↔ preview sync via headless `editor-sync` module (cursor sync wired)
- DnD tree reorder via `@dnd-kit/core` and full patch types

### Ports to `@workbench-kit/react/json-config`

- `JsonConfigWorkbench` code / preview / split modes (done)
- Widget mode auto-preview from parsed JSON (baseline in Storybook)
- Save / discard toolbar and dirty baseline (done)

## Editor sync contract (P1)

Single source of truth while editing:

| State              | Owner                                            | Notes                                          |
| ------------------ | ------------------------------------------------ | ---------------------------------------------- |
| Document string    | Host or `JsonConfigWorkbench` controlled `value` | Monaco and tree derive from this               |
| Parsed tree        | `@workbench-kit/json-widget` parse result        | Parse errors block preview update              |
| Selected node path | React editor chrome state                        | Drives properties panel                        |
| Preview render     | `JsonWidgetPreview` + registry                   | Read-only; reflects parse + selection          |
| Dirty baseline     | Host `baselineValue` prop                        | Toolbar save/discard compares against baseline |

Sync rules:

1. External document identity change (`resetKey` / file path) resets selection; in-document edits keep selection stable.
2. Tree selection changes update properties panel only; document string updates on explicit edit commits.
3. Parse failure surfaces in tree and preview; preview does not render stale widgets.
4. Save commits current string to host; discard restores `baselineValue`.

## Kit checklist status

- [x] P1 port boundary map (this document)
- [x] P1 editor sync contract (above)
- [x] P1 `JsonConfigWorkbench` widget mode parity with json-widget-editor baseline flows
- [x] P2 full editor chrome port from tile_paper `json-widget-editor` (tree, inspector, preview slot; DnD deferred)
- [x] P2 `JsonWidget/Editor` Storybook story + play baseline
- [x] P3 Monaco cursor ↔ tree path sync (`findPathForLineAndColumn` wired in React layer)
- [x] P3 DnD tree reorder + full `WidgetPatch` types (`reorder-child`, `reparent-widget`, etc.)
- [x] P3 neutral layout calculators (grid/stack/linear) in `@workbench-kit/json-widget`
- [x] P3 `EditorInteraction` promoted to `storybook-play-required`
- [x] P3 parity gate tests (layout + patch + registry patterns)
- [x] P3 `JsonWidget/Playground → Interactive` — full editor sandbox (add widget, DnD tree, Monaco, inspector, structural preview)
- [x] P3.1 playground visual preview — `PlaygroundWidgetRenderer` + `JsonWidgetPreviewCanvas` (grid/stack/text/box/row/column)
- [x] P3.1 playground inspector parity — builtin property sections for demo types (text/grid/stack/row/column/box)
- [x] P3.1 playground authoring UX — sibling insert, delete selected, duplicate selected, starter templates
- [x] P3.1 Monaco playground schema — `createPlaygroundWidgetJsonSchema` wired via `JsonWidgetEditor.jsonSchema`
- [x] P3.1 preview click-to-select — `interactivePreview` bridges canvas selection to tree/inspector
- [x] P3.2 strengths inheritance — zoom/pan canvas, preview toolbar, Monaco problems/Ctrl+S/view shortcuts, config Apply banner ([strengths-inheritance.md](./strengths-inheritance.md))
- [x] P3.2 playground widget types — simplified `button`, `list-view`, `tile`, **`input`** in playground registry/schema/renderer
- [x] P3.4 playground widget types — **`divider`**, **`image`**, **`document`** shell in playground registry/schema/renderer
- [x] P3.4 inspector placement sections — grid/stack/linear child placement + box border in inspector
- [x] P3.4 canvas drag-to-move — grid col/row + stack left/top drag; grid resize handle on selection
- [x] P3.4 problems panel — parse errors merged into Monaco problems list with auto-open
- [x] P3.4 GUI mode label — preview mode control labeled **GUI** (tile_paper parity)
- [x] P3.4 playground export — Copy JSON + Download toolbar actions
- [x] P3.4 starter templates — media card, form column, document shell
- [x] P3.3 simplified preview selection chrome — `PlaygroundEditorWidgetWrapper` (`WorkbenchCanvasItemFrame` + badge)
- [x] P3.3 full playground E2E play — `JsonWidget/Playground → InteractiveSmoke` (add, inspector, preview select, DnD, save)
- [x] P3.3 required play promotion — `InteractiveSmoke` (`JsonConfig/WidgetInteraction` stays baseline; save requires dirty Monaco edit)
- [x] **Phase 3 kit milestone complete** — see [json-widget-mvp.md](./json-widget-mvp.md)
- [x] P4 consumer swap — tracked in [migration-todo.md](./migration-todo.md) § Downstream Migration Bridge
- [ ] P4 custom_launcher preview toolbar → `PreviewZoomToolbar` (in progress)
- [ ] P4 tile_paper domain types (full `WidgetPropertySections`, drag/resize `EditorWidgetWrapper` with registry wrapper pattern)
- [ ] P4 full `createWidgetJsonSchema` parity (tile-ref, spacer, dataSource, multi-schema project configs)

## Verification

```bash
pnpm --filter @workbench-kit/json-widget test
pnpm --filter @workbench-kit/react test
pnpm build:storybook
pnpm test:storybook-play
```

Required play gate currently covers json-widget stories as **baseline-only**; promotion to
`storybook-play-required` follows the flake policy in
[storybook.md](../conventions/storybook.md).
