# JDW Architecture Analysis

> **Status:** Analysis (updated 2026-06-23)
> **Profile:** `workbench-jdw-react-v1`  
> **Scope:** `@workbench-kit/jdw` + `@workbench-kit/react/jdw`

---

## 1. Executive Summary

The workbench-kit JDW stack already implements a **self-owned, CSS-based render pipeline** for Flutter `json_dynamic_widget` v7 wire format—without importing Dart/Flutter runtime. The architecture cleanly splits **headless** concerns (`parse → validate → normalize → layout → patch`) in `@workbench-kit/jdw` from **React rendering** in `@workbench-kit/react/jdw`.

**CSS-based structure is viable** and is the current preview strategy: a headless `layoutWidget` produces a rect tree; `cssRenderBackend` maps rects to absolutely positioned DOM nodes. Registry builders handle leaf widgets (`text`, etc.).

**Custom HTML tags** should be supported **conditionally**: via registry metadata and allowlisted semantic tags—not free-form tag strings in JSON. Custom components map to registry `type` entries with vetted `build()` functions.

**Gaps vs Flutter mental model:** no unified recursive `renderJsonWidget`; `${variable}` resolves only from explicit render/preview values and `listen` has dependency analysis, editor warnings, value-diff driven preview invalidation candidates, but no runtime scheduler; full Flutter builder parity is still incomplete. Static authoring now covers recursive JDW schema, semantic validation, alignment-aware layout including `expanded`/`flexible` fit, registry measurement hooks for static leaves, stack/wrapper/static leaf preview, invalid preview/save gating, and a single preview layout strategy.

### 2026-06-23 backup branch reference assessment

The disposable `backup/workspace-codex` branch was useful as a direction signal, not as a patch source. The durable principles brought forward were:

- Treat JDW support as a coherent contract: profile support table, static schema files, Monaco schema, validator, registry metadata, preview renderer, and inspector must agree on the same type set.
- Block unsafe or invalid documents at product boundaries: `JdwPreview`, widget save, and Monaco problems should all use semantic validation, not parse-only checks.
- Close Flutter JDW parity gaps first for static authoring: `stack`, single-child wrappers (`container`, `padding`, `align`, `center`, `sized_box`), static leaves (`image`, `icon`, `button`), and row/column alignment are higher-value than broad Storybook or theme churn.
- Prefer headless layout/test coverage in `@workbench-kit/jdw`; React surfaces should consume that result instead of duplicating layout math.

Applied slice on the current branch: support metadata, recursive source and published schemas, per-type schema files with `check:jdw-schemas`, validator, linear/wrapper/flexible-fit layout, registry intrinsic measurement for static leaves, static leaf rendering, Strategy A preview unification, preview selection paths, stack/flex placement inspector, asset insert selection, invalid-save gating, first-pass `${var}` value resolution for render/preview, schema allowance for exact dynamic scalar expressions, headless dynamic dependency / listen binding analysis, source editor warnings for `listen` mismatches, and value-diff driven preview invalidation candidate reporting. Not carried forward: branch-wide Storybook/fixture churn, package deletions, unrelated theme/sample rewrites, and commit history.

---

## 2. Current JDW Architecture

### Pipeline flow

```mermaid
flowchart TB
  subgraph Input
    JSON["*.jdw.json / JDW v7 string"]
    SS["Screen spec DSL (optional)"]
  end

  subgraph Headless["@workbench-kit/jdw (headless)"]
    P["parseJsonWidgetData"]
    V["validateJsonWidgetData"]
    T["jdwNodeToGenericWidget"]
    L["layoutWidget"]
    PATCH["applyWidgetPatch / normalize"]
    ASSET["validateWidgetAssetPackage"]
    COMPILE["compileScreenSpecToJdwNode"]
  end

  subgraph React["@workbench-kit/react/jdw"]
    RJ["renderJdw / renderJdwNode"]
    CSS["renderJdwWithLayout"]
    TREE["renderCssLayoutTree"]
    REG["WidgetRegistryContract.build()"]
    BUILTIN["renderBuiltinWidgetNode / Leaf"]
    PREVIEW["JdwPreview"]
  end

  JSON --> P
  SS --> COMPILE --> JSON
  P --> V
  P --> T
  T --> L
  T --> PATCH
  JSON --> ASSET

  PREVIEW --> P
  PREVIEW --> RJ
  RJ --> CSS
  CSS --> T
  CSS --> L
  CSS --> TREE
  TREE --> REG
  REG --> BUILTIN
  TREE --> BUILTIN
```

### Component responsibility table

| Stage        | Module                                                      | Package                    | Role                                                                  |
| ------------ | ----------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Parse        | `parseJsonWidgetData`, `jdwNodeToGenericWidget`             | `@workbench-kit/jdw`       | JDW v7 envelope; nested `args.children` / `args.child`                |
| Validate     | `validateJsonWidgetData`                                    | `@workbench-kit/jdw`       | Per-type semantic checks; optional `strictKnownTypes`                 |
| Document     | `createWidgetDocument`, `applyWidgetDocumentPatch`          | `@workbench-kit/jdw`       | Editor round-trip via `GenericWidget`                                 |
| Normalize    | `normalizeWidgetSubtree`, `materializeWidgetPlacementAsset` | `@workbench-kit/jdw`       | Placement policy on insert                                            |
| Layout       | `layoutWidget`, `linear/grid/stack`                         | `@workbench-kit/jdw`       | Headless rect tree                                                    |
| Screen spec  | `compileScreenSpecToJdwNode`                                | `@workbench-kit/jdw`       | Alternate DSL → JDW nodes                                             |
| Render entry | `renderJdw`, `JdwPreview`                                   | `@workbench-kit/react/jdw` | Parse + optional registry                                             |
| CSS backend  | `renderJdwWithLayout`, `renderCssLayoutTree`                | `@workbench-kit/react/jdw` | Layout rects → absolute CSS                                           |
| Registry     | `createBuiltinJdwRegistry`, `BUILTIN_JDW_REGISTRY`          | `@workbench-kit/react/jdw` | `type` → `build()` for leaves                                         |
| Builtins     | `renderBuiltinWidgetNode`, `renderBuiltinWidgetLeaf`        | `@workbench-kit/react/jdw` | Leaf-only registry fallback; container layout stays in `layoutWidget` |

---

## 3. Package / Layer Map

```mermaid
graph LR
  subgraph contracts["@workbench-kit/contracts"]
    WRC["WidgetRegistryContract"]
    WTD["WidgetTypeDefinition"]
  end

  subgraph jdw["@workbench-kit/jdw"]
    direction TB
    DOC["document / jdw-node"]
    VAL["validate-*"]
    LAY["layout/*"]
    PATCH["widget-patch / normalize"]
    SPEC["screen-spec/*"]
    ASSET["widget-asset-*"]
  end

  subgraph react["@workbench-kit/react/jdw"]
    PREV["JdwPreview"]
    RENDER["renderJdw / cssRenderBackend"]
    REG["createBuiltinJdwRegistry"]
    BLT["builtins/*"]
  end

  contracts --> jdw
  contracts --> react
  jdw --> react
```

| Layer         | Path                                                 | Headless?  |
| ------------- | ---------------------------------------------------- | ---------- |
| Contracts     | `packages/contracts/src/widget-registry-contract.ts` | Yes        |
| Core JDW      | `packages/json-widget/src/`                          | Yes        |
| JSON Schemas  | `packages/json-widget/schemas/`                      | Yes        |
| React JDW     | `packages/react/src/jdw/`                            | No (React) |
| Editor chrome | `@workbench-kit/react/widget-tree` (`WidgetTreeLab`) | No         |

---

## 4. CSS Render Backend Deep Dive

### Render strategy

**Strategy A — Layout backend (primary and only container preview path in `JdwPreview`):**

```127:134:packages/react/src/jdw/cssRenderBackend.tsx
export function renderJdwWithLayout(
  node: JsonWidgetNode,
  options: CssRenderBackendOptions = {},
): ReactNode {
  const widget = jdwNodeToGenericWidget(node);
  const tree = layoutWidget(widget, options.layoutConstraints ?? DEFAULT_LAYOUT_CONSTRAINTS);
  return renderCssLayoutTree(tree, options);
}
```

- Layout containers (`row`, `column`, `grid`, `stack`) → empty `div` shells with **absolute** child positioning from headless rects.
- Leaves → registry `build()` or `renderBuiltinWidgetLeaf` fallback.
- All host elements are hardcoded `div` / `span` with `data-widget-type` attributes.

**Leaf registry build path:**

- Builtin registry `build()` functions are kept leaf-only (`text`, `image`, `icon`, `button`, etc.).
- Container nodes (`row`, `column`, `grid`, `stack`, wrappers) are always positioned from the headless layout result tree.
- The legacy `renderBuiltinWidgetNode` export remains as a leaf-only compatibility hook; it no longer performs recursive flex/grid container layout.

### Design implication

The CSS backend achieves a **canvas-like, Flutter-layout-parity preview** (single rect tree, design-surface friendly). Registry builders remain useful for **leaf customization** and future `renderJsonWidget`-style recursion, but built-in container layout is centralized in `layoutWidget` so authoring overlays and preview agree on the same geometry.

---

## 5. Flutter JSON Dynamic Widget Comparison

| Aspect               | Flutter `json_dynamic_widget`  | workbench-kit JDW (today)                                                                                                                                                                                            |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wire format          | v7 `type` + `args`             | ✅ Same (`jdw-node.ts`)                                                                                                                                                                                              |
| Registry             | `JsonWidgetRegistry` → builder | ✅ `WidgetRegistry` + `WidgetRegistryContract`                                                                                                                                                                       |
| Recursive render     | Single `build()` per node      | ⚠️ Preview uses one layout tree + leaf registry builders                                                                                                                                                             |
| Dynamic values       | `${var}`, `listen`             | ⚠️ `${var}` resolves from explicit render/preview `values`; exact scalar expressions are schema-allowed; source warnings and value-diff preview invalidation candidates exist; runtime scheduling is not implemented |
| Layout               | Flutter render/layout          | ✅ Headless `layoutWidget` + CSS absolute, including `expanded` / `flexible` fit and static leaf measurement                                                                                                         |
| Asset packages       | plugin_components              | ✅ `manifest.json` + `content.json`                                                                                                                                                                                  |
| JSON Schema per type | flutter_json_schemas           | ✅ Recursive published `jdw-node.jdw.schema.json` + profile-aligned per-type files                                                                                                                                   |
| Kit extensions       | N/A                            | ✅ `grid`, `box`, and `button` extension types                                                                                                                                                                       |
| Screen spec DSL      | N/A                            | ✅ `screen-spec/` compiles to JDW                                                                                                                                                                                    |
| Semantic HTML tags   | Widget-specific                | ❌ Fixed `div`/`span`                                                                                                                                                                                                |

---

## 6. Feasibility: Self-Owned CSS-Based Render Structure

### Verdict: **Yes — viable and aligned with Lane B**

Evidence:

1. **Headless layout engine** is framework-neutral and tested (`layout/*.test.ts`).
2. **CSS backend** wires layout rects to DOM (`cssRenderBackend.test.tsx`).
3. **Wire format** matches JDW v7 without Flutter dependency.
4. **Profile** (`workbench-jdw-react-v1`) documents known types in `jdw-profile.ts`.

### Advantages (web)

- Single layout result tree feeds preview, future canvas overlays, and export.
- Testable without React in `@workbench-kit/jdw`.
- Design-tool preview (absolute rects) matches tile_paper/canvas direction in docs.

### Risks

| Risk             | Detail                                                                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility    | All containers as `div`; no semantic roles                                                                                                                                                                     |
| Performance      | Deep trees with absolute positioning + nested wrappers                                                                                                                                                         |
| Intrinsic sizing | Static leaf measurement exists; dynamic text wrapping and host font metrics remain approximate                                                                                                                 |
| Dynamic values   | `${variable}` is resolved from explicit render/preview values; headless dependency/listen analysis feeds source editor warnings and value-diff preview invalidation candidates; runtime scheduling is inactive |

---

## 7. Custom Tag Configuration — Recommendation

### Verdict: **Conditional Yes**

#### Do

1. **Registry-driven host element** — implemented: `WidgetTypeDefinition` exposes optional `hostTag` from a fixed allowlist, and the CSS backend falls back to `div` for anything outside that contract.
2. **Custom components** — new JSON `type` values registered in host-provided registry with React `build()` only.
3. **Per-node override** — optional `args.semanticTag` only when type schema explicitly allows it and value passes allowlist validator.
4. **Asset templates** — reusable fragments stay JDW nodes; tag semantics live in registry, not raw JSON inventiveness.

#### Do not

- Accept arbitrary tag strings (`script`, `iframe`, event-handler attrs) from JSON.
- Map JSON `type` directly to DOM tag without registry (breaks sandbox).
- Use `dangerouslySetInnerHTML` for dynamic content.

#### Proposed design sketch

```mermaid
flowchart LR
  NODE["JsonWidgetNode.type"]
  REG["WidgetRegistry.definition(type)"]
  TAG["hostTag allowlist"]
  BUILD["build(widget) → ReactNode"]
  DOM["createElement(hostTag, props, children)"]

  NODE --> REG
  REG --> TAG
  REG --> BUILD
  TAG --> DOM
  BUILD --> DOM
```

Example registry extension (conceptual):

```typescript
{
  type: 'section',
  hostTag: 'section',
  build: (w) => renderBuiltinWidgetNode(w),
  schema: { /* ... */ },
}
```

Aligns with existing `WidgetRegistryContract` in  
`packages/contracts/src/widget-registry-contract.ts`.

---

## 8. Risks & Non-Goals

### Risks

- Consolidating dual render paths incorrectly could break Storybook fixtures.
- Custom tags increase XSS surface if allowlist is weak.
- Lane A workbench integration may conflict with parallel Lane B editor changes.

### Non-goals (from existing plans)

- Flutter runtime import
- Full playground canvas DnD (deferred in `widget-layout-schema-plan.md` §2)
- `listen`-driven invalidation and runtime binding graph until static render is stable
- Arbitrary HTML from end-user JSON

---

## 9. Suggested Evolution Path (Lane B)

> **Decision (2026-06-16):** Git subtree extraction and a separate `@workbench-kit/jdw-react`
> package are **out of scope** for the current plan. React JDW remains under
> `packages/react/src/jdw`; headless stays `@workbench-kit/jdw`. Evolution below is
> **in-repo only** (render unification, layout parity, validation wiring).

From `completion-plan.md` Lane B:

1. **Unify render mode** — implemented for preview: layout-backend is the primary container path; `renderBuiltinWidgetNode` is leaf-only compatibility.
2. **Complete static layout parity** — implemented for row/column alignment, stack, wrappers, flexible fit, and registry-driven static leaf measurement; dynamic text wrapping remains future work.
3. **Register `stack` and static builtins** — implemented in profile/schema/registry/validator.
4. **Introduce `renderJsonWidget`** (or rename `renderJdw`) as documented recursive builder matching Flutter `data.build()`; still future work if a recursive non-layout path is needed.
5. **Registry host tags** — implemented for registry-provided `hostTag`; per-node `semanticTag` remains future work.
6. **Wire validation into preview** — implemented through `validateJsonWidgetData` in `JdwPreview` with strict known-type validation.
7. **Phase 4** — first slice implemented for `${var}` value resolution, dependency/listen analysis, editor warnings, and value-diff preview invalidation candidates; `listen` runtime scheduling remains future work.

```mermaid
gantt
  title Lane B JDW evolution (suggested)
  dateFormat YYYY-MM-DD
  section Headless
  Layout parity           :a1, 2026-06-16, 14d
  Stack schema+validate   :a2, after a1, 7d
  section React
  Unify render paths      :b1, 2026-06-16, 10d
  hostTag registry        :b2, after b1, 7d
  section Deferred
  listen and expressions  :c1, 2026-07-15, 21d
```

---

## 10. References

| Resource               | Path                                                    |
| ---------------------- | ------------------------------------------------------- |
| JDW package index      | `packages/json-widget/src/index.ts`                     |
| JDW node parse/convert | `packages/json-widget/src/jdw-node.ts`                  |
| Validation             | `packages/json-widget/src/validate-json-widget-data.ts` |
| Layout engine          | `packages/json-widget/src/layout/layout-widget.ts`      |
| Widget registry        | `packages/json-widget/src/widget-registry.ts`           |
| JDW profile            | `packages/json-widget/src/jdw-profile.ts`               |
| Screen spec compile    | `packages/json-widget/src/screen-spec/compile.ts`       |
| Registry contract      | `packages/contracts/src/widget-registry-contract.ts`    |
| CSS render backend     | `packages/react/src/jdw/cssRenderBackend.tsx`           |
| Render entry           | `packages/react/src/jdw/renderJdw.tsx`                  |
| JdwPreview             | `packages/react/src/jdw/JdwPreview.tsx`                 |
| Builtin registry       | `packages/react/src/jdw/createBuiltinJdwRegistry.ts`    |
| Builtin renderers      | `packages/react/src/jdw/builtins/`                      |
| Schema plan            | `docs/workbench/widget-layout-schema-plan.md`           |
| Strengths / JDW rows   | `docs/workbench/strengths-inheritance.md`               |
| Lane B roadmap         | `docs/workbench/completion-plan.md`                     |
| JSON schemas           | `packages/json-widget/schemas/`                         |
