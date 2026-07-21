# JSON Widget — Port-Then-Replace Policy

Operational guide for JSON widget authoring migration. Reference consumer
implementations stay **reference-only** until the kit milestone closes (Phase 3).
No consumer swap until Phase 4.

See also: [future-capabilities.md § JSON Widget](./future-capabilities.md#json-widget-port-then-replace-strategy),
[json-widget-mvp.md](./json-widget-mvp.md), [json-config-workbench.md](./json-config-workbench.md),
[widget-layout-schema-plan.md](./widget-layout-schema-plan.md) (schema, layout engine, asset model — editor deferred).

## Phase summary

| Phase       | Kit action                                                                                                                   | Consumer action                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1 Reference | Study reference tree/editor UX and launchpad preview bridge patterns                                                         | Keep local stacks                                |
| 2 Port      | Extract neutral primitives into `@workbench-kit/jdw`, `@workbench-kit/react/widget-tree`, `@workbench-kit/react/json-config` | Reference-only                                   |
| 3 Complete  | Storybook baselines, public APIs, play gates, docs                                                                           | Validate kit readiness                           |
| 4 Swap      | —                                                                                                                            | Point consumers at kit; delete duplicated chrome |

## Port boundaries (P1)

### Stays in reference repos until Phase 4

- Consumer domain widget types and product-specific layout chrome
- Product routes, storage keys, and authoring persistence
- Host workbench shell merge (wholesale replacement of product-local UI)

### Ports to `@workbench-kit/jdw`

- `parseJsonWidgetData` and registry contract
- Neutral widget shape validation and error models
- Headless editor sync (`editor-sync`, `path`, `selection`, `widget-tree`, `widget-patch`, `widget-child-ops`)
- Layout helpers that do not depend on consumer domain types (`layout/grid`, `layout/stack`, `layout/linear`)

### Ports to `@workbench-kit/react/widget-tree`

- `WidgetTreeLab` / `WidgetTreeWorkbench` — Monaco ↔ tree ↔ inspector ↔ `JdwPreview` sync
- `WidgetTreeView`, `WidgetInspectorPanel`, `WidgetSourceEditor`
- Registry-driven inspector metadata via `WidgetRegistryContract`
- DnD tree reorder via `@dnd-kit/core` and `@workbench-kit/jdw` patch types (where enabled in lab)

> **Note:** `@workbench-kit/react/json-widget` was a short-lived export path (re-export only)
> and is **not** in the tree. Do not add it back without a full module surface.

### Ports to `@workbench-kit/react/json-config`

- `JsonConfigWorkbench` code / preview / split modes (done)
- Widget mode auto-preview from parsed JSON (baseline in Storybook)
- Save / discard toolbar and dirty baseline (done)

## Editor sync contract (P1)

Single source of truth while editing:

| State              | Owner                                            | Notes                                          |
| ------------------ | ------------------------------------------------ | ---------------------------------------------- |
| Document string    | Host or `JsonConfigWorkbench` controlled `value` | Monaco and tree derive from this               |
| Parsed tree        | `@workbench-kit/jdw` parse result                | Parse errors block preview update              |
| Selected node path | React editor chrome state                        | Drives properties panel                        |
| Preview render     | `JdwPreview` + registry                          | Read-only; reflects parse + selection          |
| Dirty baseline     | Host `baselineValue` prop                        | Toolbar save/discard compares against baseline |

Sync rules:

1. External document identity change (`resetKey` / file path) resets selection; in-document edits keep selection stable.
2. Tree selection changes update properties panel only; document string updates on explicit edit commits.
3. Parse failure surfaces in tree and preview; preview does not render stale widgets.
4. Save commits current string to host; discard restores `baselineValue`.

## Kit checklist status

### Completed (Phase 2–3)

- [x] P1 port boundary map (this document)
- [x] P1 editor sync contract (above)
- [x] P1 `JsonConfigWorkbench` widget mode baseline flows
- [x] P2 editor chrome in `@workbench-kit/react/widget-tree` (tree, inspector, preview slot)
- [x] P2 `JDW/WidgetTree/Lab` Storybook + `InteractionSmoke` play baseline (`storybook-play-required`)
- [x] P3 neutral layout calculators (grid/stack/linear) in `@workbench-kit/jdw`
- [x] P3 parity gate tests (layout + patch + registry patterns)
- [x] Phase 3 kit milestone — headless JDW + widget-tree lab + json-config workbench

### Historical (removed playground lane — audit only)

The following referred to `JsonWidget/Playground` and related symbols that are no
longer in the tree. Do not treat checked items below as runnable acceptance tests.

- [x] P3 `JsonWidget/Playground → Interactive` (superseded by `JDW/WidgetTree/Lab`)
- [x] P3.1–P3.4 playground widget types, canvas drag, export toolbar, etc. (playground removed)
- [x] P3.2 strengths inheritance doc pass (see [strengths-inheritance.md](./strengths-inheritance.md))

### Open (Phase 4+)

- [ ] P4 consumer swap runbook execution in host applications
- [ ] P4 consumer domain types (full property sections, registry wrapper pattern)
- [ ] P4 full `createWidgetJsonSchema` parity (tile-ref, spacer, dataSource, multi-schema)
- [ ] Preview zoom/pan toolbar — **deferred** ([widget-layout-schema-plan.md](./widget-layout-schema-plan.md) §2; not in tree as of 2026-06-14)

## Verification

```bash
pnpm --filter @workbench-kit/jdw test
pnpm --filter @workbench-kit/react test
pnpm build:storybook
pnpm test:storybook-play
```

Required play gate currently covers json-widget stories as **baseline-only**; promotion to
`storybook-play-required` follows the flake policy in
[storybook.md](../conventions/storybook.md).
