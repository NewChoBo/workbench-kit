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
- Headless editor sync (`editor-sync`, `path`, `selection`, `widget-tree`, `widget-patch`)
- Layout helpers that do not depend on tile_paper domain types (deferred: grid/stack calculators)

### Ports to `@workbench-kit/react/json-widget`

- `JsonWidgetPreview` validation bridge (partially done)
- Editor chrome: `JsonWidgetEditor`, `WidgetTreePanel`, `WidgetInspectorPanel`, `useJsonWidgetEditorSync`
- Monaco ↔ tree ↔ inspector ↔ preview sync via headless `editor-sync` module
- DnD tree reorder and tile-specific property sections remain in reference until swap

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
- [ ] P3 parity gate + consumer swap runbook

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
