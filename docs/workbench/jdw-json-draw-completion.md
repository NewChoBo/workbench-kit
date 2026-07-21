# JDW JSON → Draw Completion Plan

Updated: 2026-07-12

Source of truth for completing **pure JDW JSON → drawable widgets** before Spec
structure or Spec Form work. Status decisions live here; link from
[current-state.md](./current-state.md).

## Goal

A JDW v7 JSON document (and parameterized widget assets) must **parse →
validate → layout → preview** with stable, typed behavior for every profile
known type — without depending on Screen Spec or Form chrome.

## Sequence (locked)

| Stage | Name                         | Exit criteria                                                                                                                     | Status   |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| JD-0  | Baseline pipeline            | v7 parse/format, semantic validate, `layoutWidget`, static leaf render, `${var}` resolve, listen analysis + value-diff candidates | **Done** |
| JD-1  | Drawable JSON contract       | Known-type validate→layout smoke; grid `col`/`row` required at rest (`ensureGridChildPlacements`)                                 | **Done** |
| JD-2  | Asset inputs → drawable JSON | `schema.json` defaults/required + `${}` substitution produce a resolved node ready to layout/draw                                 | **Done** |
| JD-3  | Text measure contract        | Optional host/registry text metrics; constrained wrapping estimate; no metrics = current behavior                                 | **Done** |
| JD-4  | Listen invalidation coalesce | Headless batch/coalesce of listen candidates for value-path changes (scheduler contract, no GUI)                                  | **Done** |
| JD-5  | Known-type render smoke      | Each profile type renders via `renderJdw` / `JdwPreview` without throw                                                            | **Done** |
| JD-6  | Document refs (import)       | Expand `type: "ref"` + loader; **reject circular/self refs**; sample `parts` + `composed`; Form/Preview expand before draw        | **Done** |

**JSON → draw track complete (JD-0…JD-5 + JD-6).** Spec structure may start;
Spec Form stays after Spec structure.

Sample host explorer seeds `jdw/<sample>/` folders (`examples/workbench-sample`):
showcase, layout/media fixtures, `parts/` reusable documents, `composed/` pages
that import parts via `type: "ref"`, and `assets/heading/` for JD-2 asset inputs.

## Out of scope (paused)

- Screen Spec compile fidelity / Spec Form
- WidgetTreeLab / ScreenSpec GUI chrome
- Monaco UX polish
- Full AJV-backed asset schema validation (JD-2 uses a lightweight required/type check)

## JD-2 acceptance — Done (2026-07-12)

1. Asset `content.json` may use exact `${path}` expressions.
2. Optional `schema.json` supplies `properties` / `required` / `default` values.
3. `resolveWidgetAssetContent(asset, inputs)` merges defaults → validates required
   and basic types → resolves `${}` → returns a `GenericWidget`.
4. `materializeWidgetPlacementAsset(..., { inputs })` uses resolved content before
   parent placement normalize (omit `inputs` to keep prior clone behavior).
5. Unit tests cover defaults, required failure, type mismatch, and layout after
   materialize.

## JD-3 acceptance — Done (2026-07-12)

Aligned with Flutter: measurement stays off the wire format; registry/`estimateWrappedTextSize`
is the TextPainter analogue ([json-dynamic-widget-reference.md](./json-dynamic-widget-reference.md) §3.3).

1. `@workbench-kit/jdw` exports `estimateWrappedTextSize` (pure wrap estimate).
2. React builtin `text` `measure` uses `constraints.maxWidth` for wrapping height.
3. Unconstrained maxWidth keeps single-line estimate (prior behavior).
4. Unit tests cover wrap, maxLines, and registry measure height growth.

## JD-4 acceptance — Done (2026-07-12)

1. `createJsonWidgetValueWarehouse` owns get/set/patch/replace for a flat+dotted
   value map and accumulates changed paths across a write burst.
2. `flushInvalidations(root)` runs **one** `collectJsonWidgetInvalidations` pass
   for the pending path set, notifies subscribers, then clears pending paths.
3. Unit tests cover path get/set, burst coalesce, empty flush, and replace diff.
4. No React/`JdwPreview` scheduler wiring in this stage (optional later).

## JD-5 acceptance — Done (2026-07-12)

1. `WORKBENCH_JDW_KNOWN_TYPE_FIXTURES` (+ flex wrap helper) are shared with JD-1.
2. React smoke asserts `renderJdw` / `renderJdwNode` / `JdwPreview` for every
   `WORKBENCH_JDW_KNOWN_TYPES` entry without throw and with CSS render root markup.
3. `expanded` / `flexible` fixtures render inside a linear parent row.

## Later stage notes

- **JD-6 Document refs:** Authored `type: "ref"` nodes (`args.path`, optional
  `args.inputs`) are expanded by `expandJsonWidgetDocumentRefs*` before
  validate/layout. **Circular and self refs are hard errors**
  (`code: circular-document-ref`) and are never expanded. Sample:
  `jdw/composed/home.refs.jdw.json` → `jdw/composed/home.jdw.json`. Host Form and
  Preview pass a workspace `loadDocument` into `JdwPreview` so composed docs draw
  without rewriting authored outline JSON. Assets palette lists workspace
  `*.jdw.json` documents (Parts / Composed / Documents) via
  `createWidgetAssetCatalogFromJdwDocuments`; placement currently inlines the
  drawable tree (ref-insert wiring follows). Distinct from JD-2 **assets**
  packages (`manifest` + `content`).
- **JD-3:** Do not bake browser font metrics into `@workbench-kit/jdw`. Expose a
  measure hook / options bag; React registry may supply CSS-based estimates.
- **JD-4:** Done — `createJsonWidgetValueWarehouse` coalesces write bursts into one
  `collectJsonWidgetInvalidations` flush (no React scheduler yet).
- **JD-5:** Done — shared `WORKBENCH_JDW_KNOWN_TYPE_FIXTURES` cover `renderJdw`,
  `renderJdwNode`, and `JdwPreview` smoke for every known type.
