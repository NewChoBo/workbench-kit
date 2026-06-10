# Widget Layout, Schema, and Render Foundation Plan

> **Status:** Planning (2026-06-10, revised)  
> **Branch context:** `feature/widget-with-schema` — widget studio shell, `*.widget.json`, asset packages (`manifest.json` + `content.json`)  
> **Priority:** Schema + JSON model + layout/render engine **before** editor UX expansion.  
> **Wire format decision (locked):** [json_dynamic_widget](https://pub.dev/documentation/json_dynamic_widget/latest/) **v7 envelope** is the **only** on-disk widget node format. No flat `type`+props dual-read. Early-stage codebase migrates in place.

Companion docs:

- [json-widget-mvp.md](./json-widget-mvp.md) — Phase 1 parse/registry MVP
- [json-widget-port-then-replace.md](./json-widget-port-then-replace.md) — port boundaries and editor sync contract
- [kit-design-principles.md](./kit-design-principles.md) — neutral kit vocabulary and extensibility rules
- [strengths-inheritance.md](./strengths-inheritance.md) — Flutter UX reference (docs only; no Flutter runtime)

External references (wire format + patterns, not runtime import):

- [json_dynamic_widget](https://pub.dev/documentation/json_dynamic_widget/latest/) — v7 `type` + `args` envelope, registry, builders
- [flutter_json_schemas](https://github.com/peiffer-innovations/flutter_json_schemas) — per-type JSON Schema `$id` URLs
- [json_dynamic_widget_plugin_components](https://pub.dev/documentation/json_dynamic_widget_plugin_components/latest/) — reusable component files (`name`, `version`, `content`)

## 1. Goal

Establish a **JSON-first foundation** aligned with **JDW wire format**, implemented as **json_dynamic_widget for React** (TypeScript registry + recursive render; **no Dart/Flutter runtime in the kit**):

1. **Widget documents** (`*.widget.json`) — root `JsonWidgetNode` tree in JDW v7 envelope.
2. **Widget assets** (directory packages) — `manifest.json` catalog metadata + `content.json` JDW subtree.
3. **Layout engine** — headless measure/layout for registered layout types (`row`, `column`, `expanded`, kit `grid`, …).
4. **Render pipeline** — `parse → validate → renderJsonWidget` (React); layout rects optional for canvas mode.

**Editor chrome** (`WidgetTreeLab`, palette, inspector, DnD) is explicitly **out of scope** until Phases 1–3 below are stable and covered by headless tests + Storybook fixture renders.

### 1.1 What “follow JDW” means here

| Follow | Do not import |
| ------ | ------------- |
| v7 JSON envelope (`type`, optional `id` / `listen`, `args`) | Dart `json_dynamic_widget` package |
| Registry + per-type builders + recursive `child` / `children` in `args` | Material / Cupertino built-in catalog wholesale |
| `row`, `column`, `expanded`, `flexible`, `text`, `stack`, … naming | Flutter renderer parity for unregistered types |
| [plugin_components](https://pub.dev/documentation/json_dynamic_widget_plugin_components/latest/) asset file shape | Flutter `AssetDependencyLoader` runtime |

**Profile name:** `workbench-jdw-react-v1` — JDW wire + neutral kit builtins + **kit extension** types (e.g. `grid` with `col`/`row` cells).

## 2. Non-goals (this plan)

- Full playground parity with removed `JsonWidget/Playground` (DnD canvas, zoom toolbar, etc.)
- tile_paper domain widget types (`tile`, `dataSource`, tile-ref, …)
- Consumer swap (Phase 4 of port-then-replace)
- Visual asset thumbnails / marketplace UX
- Persistence, versioning migrations beyond `$schema` version pins

## 3. JDW v7 wire format (official)

Every widget node on disk uses this envelope ([JDW v7](https://github.com/peiffer-innovations/json_dynamic_widget/blob/main/packages/json_dynamic_widget/doc/MIGRATION_CLI.md)):

```json
{
  "type": "<snake_case_type>",
  "id": "<optional-id>",
  "listen": ["var1"],
  "args": {
    "...": "..."
  }
}
```

- `child` and `children` live **inside `args`** (not at the top level).
- Explicit `null` in `args` is stripped at parse time (JDW behavior); use sentinels only when a builder requires them.
- `${variable}` expressions in `args` are **Phase 4**; parser may preserve strings unchanged until then.

### 3.1 Document example

```json
{
  "type": "column",
  "args": {
    "gap": 12,
    "mainAxisAlignment": "start",
    "crossAxisAlignment": "stretch",
    "children": [
      {
        "type": "text",
        "args": { "text": "Title", "fontSize": 20 }
      },
      {
        "type": "row",
        "args": {
          "gap": 8,
          "children": [
            {
              "type": "expanded",
              "args": {
                "flex": 1,
                "child": { "type": "text", "args": { "text": "A" } }
              }
            },
            {
              "type": "expanded",
              "args": {
                "flex": 2,
                "child": { "type": "text", "args": { "text": "B" } }
              }
            }
          ]
        }
      }
    ]
  }
}
```

A `*.widget.json` file is either a single root node object as above, or `{ "root": <node> }` if we need document-level metadata later (TBD; prefer single root node in v1).

### 3.2 Layout mental model (JDW types)

| Concept | JDW `type` | Key `args` |
| ------- | ---------- | ---------- |
| Column | `column` | `children`, `mainAxisAlignment`, `crossAxisAlignment`, `gap`, `padding` |
| Row | `row` | same |
| Expanded | `expanded` | `flex`, `child` |
| Flexible | `flexible` | `flex`, `fit`, `child` |
| Stack | `stack` | `children` with positioned children |
| Text (leaf) | `text` | `text`, styles |
| **Kit extension** Grid | `grid` | `columns`, `gap`, `children` with `col`/`row`/`colSpan`/`rowSpan` in child `args` |

**Nested row/column is the default.** Depth is unbounded. `grid` is a **registered kit extension**, not a stock Flutter JDW type — document this in the profile.

### 3.2 Grid vs linear

- **Linear (`row` / `column`):** primary layout story; Flutter-like constraint flow.
- **Grid:** tile/canvas-style explicit cell placement; not a Flutter `GridView` clone.
- Do not merge grid cell logic into linear flex math; share only primitives (`Rect`, `gap`, `padding`).

## 4. Two file types, two schemas

```text
*.widget.json                          assets/<slug>/
─────────────────                      manifest.json + content.json [+ schema.json]
MIME: application/vnd.                 MIME: manifest / content / schema types
  workbench-kit.widget+json

Widget Document Schema (v1)            Widget Asset Manifest (v1) + content.json
  └─ recursive JDW v7 tree               ├─ catalog metadata (name, label, …)
                                         └─ content.json → JDW subtree (validated)
```

### 4.1 Widget document (`*.widget.json`)

**Purpose:** authoritative screen/page layout consumed by runtime and editors.

| Field | Role |
| ----- | ---- |
| `$schema` | Optional profile pin (`workbench-jdw-react-v1`) |
| Body | Single JDW v7 root node (typically `type: "column"`) |

**Validation layers:**

1. Envelope validation — every node has `type` + `args` object.
2. Per-type JSON Schema — vendored or `$ref` to [flutter_json_schemas](https://github.com/peiffer-innovations/flutter_json_schemas) for builtins; local schema for kit `grid`.
3. Registry-aware validation (optional) — unknown `type` flagged when a registry is supplied.
4. Semantic validation — e.g. `grid` children require `col` + `row` in `args`.

### 4.2 Widget asset (package directory — preferred)

**Purpose:** reusable fragment for palette insertion; aligned with JDW **plugin_components** plus workbench catalog fields.

**Preferred layout** — one directory per asset:

```text
src/widgets/assets/<slug>/
  manifest.json   # catalog metadata (name, label, category, kind, icon, …)
  content.json    # JDW v7 subtree root node (asset data)
  schema.json     # optional per-asset inputs JSON Schema
```

| File | Required | Role |
| ---- | -------- | ---- |
| `manifest.json` | yes | Catalog metadata (`widget-asset-manifest.v1`) |
| `content.json` | yes | JDW v7 widget subtree |
| `schema.json` | no | Per-asset inputs/parameters schema (Phase 3 substitution) |

#### manifest.json fields

| Field | Required | Role |
| ----- | -------- | ---- |
| `$schema` | recommended | Pin `widget-asset-manifest.v1` |
| `name` | yes | Stable id (maps to catalog `id`) |
| `version` | recommended | Semver string (`1.0.0`) |
| `label` | yes | Palette display name |
| `category` | yes | Palette grouping |
| `description` | no | Palette subtitle |
| `icon` | no | Codicon name |
| `kind` | no | `leaf` \| `container` \| `template` |
| `placementPolicy` | no | Insert behavior (see §6) |

**Migration from current branch shape:**

| Old field | New field |
| --------- | --------- |
| `id` | `name` |
| `defaultWidget` (flat) | `content` (JDW envelope) |
| `widgetType` | **removed** — derive from `content.type` |

**Asset kinds:**

| `kind` | `content` example | Use |
| ------ | ----------------- | --- |
| `leaf` | `{ "type": "text", "args": { "text": "Heading" } }` | Single control |
| `container` | `{ "type": "row", "args": { "children": [] } }` | Empty shell |
| `template` | nested `column` → `row` | Pre-built section |

### 4.3 Schema relationship

```text
widget-asset-manifest.v1.json  ──►  catalog metadata only

content.json  ──►  JDW JsonWidgetNode (recursive, validated via validateWidgetAssetPackage)

flutter_json_schemas/*.json  ──►  per-type args for builtins
packages/json-widget/schemas/grid.json  ──►  kit extension
```

Asset files are validated in **two passes**:

1. Against `widget-asset.v1` (metadata + `content` present).
2. `content` subtree against registered type schemas (same as document nodes).

## 5. Package boundaries

| Package | Responsibility |
| ------- | -------------- |
| `@workbench-kit/contracts` | `JsonWidgetNode` shape; component/asset catalog contracts; `placementPolicy`; MIME constants |
| `@workbench-kit/json-widget` | `parseJsonWidgetData`; validate; patch ops on **normalized internal tree**; layout engine; component parse (`content`) |
| `@workbench-kit/react/json-dynamic-widget` | `JsonWidgetRegistry`; `renderJsonWidget`; builtin React builders; `createDefaultRegistry()` |
| `@workbench-kit/react/json-widget` | Thin `JsonWidgetPreview` → `renderJsonWidget` |
| `@workbench-kit/react/widget-tree` | Editors (Phase 4); patch UI targets JDW nodes |
| `@workbench-kit/adapters` | Demo fixtures rewritten to JDW v7 + plugin_components assets |

Kit stays domain-neutral per [kit-design-principles.md](./kit-design-principles.md). No launchpad/tile/Steam vocabulary in schema or layout code.

## 6. Placement and materialization

When an asset is inserted into a document, the host calls **materialize** (headless), not raw JSON paste.

```text
asset.content (JDW node)
  → deepClone
  → validateJsonWidgetSubtree
  → applyPlacementPolicy(parent, policy)
  → insert via WidgetPatch (insert-child | replace-widget)
```

### 6.1 `placementPolicy` values (v1)

| Policy | Behavior |
| ------ | -------- |
| `rematerialize-grid-slot` | Default for `leaf` — strip parent-incompatible placement and assign grid slot when parent is `grid` |
| `preserve-internal-layout` | Default for `container` / `template` — adjust root for parent only; keep subtree placement |

### 6.2 Current gap

`materializeWidgetPlacementAsset` today only assigns grid `col`/`row` for the next slot on leaf insert. It does not:

- deep-clone template subtrees with stable internal structure
- normalize grid children on insert
- apply `placementPolicy`

Phase 2 delivers the policy-driven materializer.

## 7. Layout engine

### 7.1 Target API (headless)

```ts
interface LayoutConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

interface LayoutNodeResult {
  rect: Rect;
  widget: GenericWidget;
  children: LayoutNodeResult[];
}

function layoutWidget(
  widget: GenericWidget,
  constraints: LayoutConstraints,
  registry: WidgetRegistryContract,
): LayoutNodeResult;
```

### 7.2 Implementation phases inside layout

| Step | Scope | Existing code |
| ---- | ----- | --------------- |
| L1 | `row` / `column` flex + gap + padding + child `flex` | Extend `layout/linear.ts` |
| L2 | `mainAxisAlignment` / `crossAxisAlignment` on parent | New |
| L3 | `grid` cell rects | `layout/grid.ts` — integrate under `layoutWidget` |
| L4 | `stack` absolute rects | `layout/stack.ts` — integrate under `layoutWidget` |
| L5 | Leaf intrinsic sizing hooks via registry | New optional `measure` capability on definitions |

### 7.3 Principle

**One layout result tree** feeds all render backends. Avoid duplicating layout math in CSS renderers.

## 8. Render pipeline (React JDW)

```text
source string
  → parseJsonWidgetData (JDW envelope)
  → validateJsonWidgetData (per-type schemas + registry)
  → renderJsonWidget(node, { registry, values? })   ← recursive React builders
       └─ optional: layoutWidget + CanvasRenderBackend for design surface
```

| Component | Owner | Notes |
| --------- | ----- | ----- |
| `renderJsonWidget` | `@workbench-kit/react/json-dynamic-widget` | JDW `data.build()` equivalent |
| `JsonWidgetPreview` | `@workbench-kit/react/json-widget` | Thin wrapper over `renderJsonWidget` |
| Builtin registry builders | `@workbench-kit/react/json-dynamic-widget` | Replaces ad-hoc demo render helpers |
| Asset preview | `@workbench-kit/react/widget-asset` | Render `content` via `renderJsonWidget` |

## 9. JSON Schema deliverables

| Artifact | Path (proposed) | Consumer |
| -------- | --------------- | -------- |
| `widget-document.v1.json` | `packages/json-widget/schemas/` | Monaco (document), `validateWidgetDocument` |
| `widget-asset-manifest.v1.json` | `packages/json-widget/schemas/` | Monaco (manifest editor), package validation |
| `createWidgetJsonSchema(registry)` | existing module | Merges registry custom types into document schema |

### 9.1 Document schema additions (vs today)

Current `widget-json-schema.ts` defines container types but **not**:

- Child placement properties (`flex`, `align`, `col`, `row`, `colSpan`, `rowSpan`, stack insets)
- Parent alignment (`mainAxisAlignment`, `crossAxisAlignment`)
- Distinct `children.items` per parent type (linear vs grid vs stack)
- `box` / `stack` / `list-view` core definitions (headless code supports; schema does not)

### 9.2 Asset schema (new)

`validateWidgetAssetPackage` validates manifest + content; extend with schema-first error paths as needed.

## 10. Implementation phases

### Phase 0 — Wire format migration (breaking, do first)

**Exit criteria:**

- [x] Replace flat fixtures: `widget-studio-assets.ts`, welcome document, builtin packages
- [x] `parseJsonWidgetData` is the only widget tree parser (flat `parseWidgetJson` removed)
- [x] Patch / tree / `widget-child-ops` operate on JDW nodes via `genericWidgetToJdwNode` / `jdwNodeToGenericWidget`
- [x] Asset packages use `name` + `content.json`; runtime `content` field on `WidgetPlacementAsset`

### Phase 1 — Schemas, validation, React registry (headless + minimal render)

**Exit criteria:**

- [x] Vendored or referenced schemas for `row`, `column`, `text`, `expanded` under `packages/json-widget/schemas/`
- [x] Kit extension schema `grid.json`
- [x] `widget-asset-manifest.v1.json` + package `content.json`
- [x] `validateJsonWidgetData` + asset two-pass tests
- [x] `@workbench-kit/react/json-dynamic-widget`: `JsonWidgetRegistry`, `renderJsonWidget`, builtins (`row`, `column`, `text`, `expanded`)
- [x] `JsonWidgetPreview` uses `renderJsonWidget`
- [x] Storybook: **JsonDynamicWidget/Fixtures** with JDW JSON files only

**Editor UX may lag** until Phase 4; fixtures and preview must work first.

### Phase 2 — Materialization and normalization

**Exit criteria:**

- [x] `normalizeWidgetSubtree(widget, parentHint?)` — strip invalid placement; optional internal preserve
- [x] `materializeWidgetPlacementAsset(asset, parent)` — deep clone + `placementPolicy` / kind defaults (§6)
- [x] Patch layer calls normalize on `insert-child` / `reparent-widget`
- [x] Fixture: template asset (nested column → row) inserts into document unchanged internally
- [x] Fixture: leaf insert into grid receives `col`/`row`
- [x] Adapter fixtures: add `media-card` template package (`content` with nested JDW nodes)

### Phase 3 — Layout engine and render pipeline

**Exit criteria:**

- [x] `layoutWidget` implements row/column (L1–L2)
- [x] Grid/stack integrated (L3–L4) with rect snapshot tests
- [ ] `CssRenderBackend` applies `layoutWidget` rects in preview
- [ ] `JsonWidgetPreview` uses pipeline (parse → validate → layout → render)
- [x] Storybook story: **JsonDynamicWidget/Layout** — layout rect fixtures

### Phase 4 — Editor integration (deferred)

**Exit criteria:**

- [ ] `WidgetTreeLab` insert path uses `materializeWidgetAsset` + normalize
- [ ] Inspector edits trigger validate + optional reflow (e.g. grid `columns` change)
- [ ] DnD reparent uses normalize on commit
- [ ] Promote layout fixture stories to `storybook-play-required` when stable

## 11. Testing strategy

| Layer | Command / location |
| ----- | ------------------ |
| Schema + validate | `packages/json-widget/src/validate-*.test.ts` |
| Materialize + normalize | `packages/json-widget/src/widget-materialize.test.ts` |
| Layout rects | `packages/json-widget/src/layout/*.test.ts` |
| Render smoke | Storybook **WidgetLayout/Fixtures** |
| Regression gate | Extend `pnpm test:widget-tree` → `pnpm test:json-widget` naming TBD |

Keep tests **framework-neutral** in `json-widget`; React tests only for render backend wiring.

## 12. Current codebase snapshot

| Area | Exists | Gap |
| ---- | ------ | --- |
| `*.widget.json` / asset package routing | `createWidgetStudioWorkspaceEditorRenderer` | — |
| Asset parse | `parseWidgetAssetPackage`, `validateWidgetAssetPackage` | `schema.json` substitution deferred |
| Document parse | `createWidgetDocument` / `parseJsonWidgetData` | Semantic placement validation partial |
| Patch / tree ops | `applyWidgetPatch` + `normalizeWidgetForParent` | DnD reparent polish deferred |
| Layout | `layoutWidget` + `grid.ts`, `linear.ts`, `stack.ts` | Preview pipeline integration pending |
| Preview | `renderJsonWidget`, `JsonWidgetPreview` | Layout engine not wired into preview yet |
| Template assets | Builtin + custom packages | Editor insert uses `materializeWidgetPlacementAsset` |

## 13. Resolved and open decisions

### Resolved

| # | Decision |
| - | -------- |
| R1 | **Official wire format = JDW v7** (`type` + `args`). No flat canonical format; no dual-read. |
| R2 | **Runtime = React JDW** (registry + `renderJsonWidget`), not Dart package import. |
| R3 | **Asset shape = plugin_components** — `name`, `version`, `content`; drop `defaultWidget` / `widgetType`. |
| R4 | **`grid` is a kit extension type** on top of JDW profile, documented in schemas. |

### Open

| # | Question | Proposal |
| - | -------- | -------- |
| D1 | Grid child `col`/`row` required at rest? | Normalize on insert/save; validator warns |
| D2 | `$schema` URL host | `https://workbench-kit.dev/schemas/...` placeholder |
| D3 | `list-view` / `box` in v1 builtins | Registry-only unless needed for parity tests |
| D4 | Grid columns change reflow | Phase 2 `reflowGridChildren` |
| D5 | Document wrapper `{ "root": node }` vs raw node | **Raw root node** for v1 |
| D6 | `${var}` / `listen` timeline | Phase 4 after static render stable |

## 14. Suggested first PR slice

1. Phase 0: migrate adapter + demo fixtures to JDW v7 JSON.
2. `parseJsonWidgetData` + tests (envelope, `args.children`, reject flat top-level `children`).
3. `packages/react/src/json-dynamic-widget/` skeleton: registry + `renderJsonWidget` + `column`/`text` builtins.
4. `JsonWidgetPreview` → `renderJsonWidget`.

## 15. Changelog

| Date | Change |
| ---- | ------ |
| 2026-06-10 | Initial plan — dual schema, layout engine first, asset template model |
| 2026-06-10 | **Locked JDW v7 wire format**; React json-dynamic-widget target; plugin_components assets; Phase 0 migration |
