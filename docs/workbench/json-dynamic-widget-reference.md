# json_dynamic_widget Reference (Deep Analysis)

Updated: 2026-07-12

Upstream: [peiffer-innovations/json_dynamic_widget](https://github.com/peiffer-innovations/json_dynamic_widget)
(archived read-only as of 2026-02-16). Pub docs:
[json_dynamic_widget](https://pub.dev/documentation/json_dynamic_widget/latest/).

This document extracts **architecture we keep**, **patterns we adapt**, and
**features we deliberately defer**, for workbench-kit `@workbench-kit/jdw` /
React preview. It feeds the JSON→draw stages in
[jdw-json-draw-completion.md](./jdw-json-draw-completion.md).

## 1. What the Flutter package is

A Flutter monorepo that turns JSON/YAML into live widget trees:

| Piece                | Role                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| Wire envelope        | v7 `{ type, id?, listen?, args }`                                             |
| `JsonWidgetData`     | Parsed node; **cache and rebuild**, do not re-parse every frame               |
| `JsonWidgetRegistry` | Builders + **variables** + **functions** + **arg processors** + `valueStream` |
| `listen`             | Explicit value keys that force that subtree to rebuild                        |
| Builders             | Per-type `JsonWidgetBuilder` (codegen `@jsonWidget` since v7)                 |
| Schemas              | Per-builder JSON Schema (`flutter_json_schemas` lineage)                      |
| Plugins              | Icons, markdown, SVG, **components** (`manifest` + `content`)                 |

Runtime loop (Flutter):

```text
registry.setValue(key, value)
  → valueStream notification
  → nodes whose listen intersects key rebuild
  → builder.build(context) with args resolved from registry
```

Layout/text metrics are **not** owned by json_dynamic_widget — Flutter’s
layout + `TextPainter` own measurement. The package only rebuilds widgets.

## 2. Mapping to workbench-kit

| Flutter concept                      | workbench-kit today                                 | Decision                                                 |
| ------------------------------------ | --------------------------------------------------- | -------------------------------------------------------- |
| v7 envelope                          | `jdw-node.ts`                                       | **Keep** — locked SSoT                                   |
| Registry builders                    | `WidgetRegistry` + React `createBuiltinJdwRegistry` | **Keep**                                                 |
| `JsonWidgetData.fromDynamic` + cache | `parseJsonWidgetData` / document model              | **Keep**; avoid re-parse on every preview tick           |
| `listen` + auto-infer                | Listen binding analysis + unused/missing warnings   | **Keep explicit listen**; auto-infer only as diagnostics |
| `valueStream`                        | Value-diff paths + `collectJsonWidgetInvalidations` | **Adapt** → JD-4 coalesce helper (no Flutter streams)    |
| `${expr}` + functions                | Exact `${path}` + explicit `values` map             | **Defer** full expression/function language              |
| Arg processors                       | Fixed `${}` resolver                                | **Defer** pluggable processors until needed              |
| plugin_components                    | Asset `manifest` + `content` + `schema.json`        | **Keep**; JD-2 inputs substitution landed                |
| Flutter layout / TextPainter         | Headless `layoutWidget` + registry `measure`        | **Adapt** → JD-3 approximate / host measure contract     |
| Full Material catalog                | Profile subset + kit `grid`/`box`/`button`          | **Do not clone** catalog breadth                         |
| Dart codegen builders                | Hand-written registry + schemas                     | **Defer** codegen                                        |

## 3. Patterns worth stealing (for JSON→draw)

### 3.1 Registry is the value warehouse (JD-4)

Flutter isolates variables per registry (often per page). Preview/`values` today
are a flat map passed into resolve. Next step is a small headless helper:

- `setValue` / `getValue`
- diff → changed paths
- intersect with `listen` → invalidation list
- optional coalesce window (batch)

No need for Dart `Stream`; a pure function + optional subscriber list is enough
for React `JdwPreview`.

### 3.2 Explicit `listen` is a performance contract

Upstream docs: omit `listen` and the registry **infers** from met variables —
convenient but rebuild-heavy. Our analysis of missing/unused listen already
matches their “prefer hand-written listen” guidance. Keep that as authoring
policy; do not auto-rewrite JSON to inject listen during draw.

### 3.2.1 JDW binding paths are restricted

JDW `${path}` expressions and `listen` entries use a restricted dotted binding
grammar: a path is one or more `[A-Za-z0-9_-]+` segments separated by single
dots. It is not a lossless arbitrary-JSON path notation: leading, trailing,
and repeated dots are invalid, and literal property names containing dots are
not addressable. Records resolve own properties only. Existing arrays accept
only canonical decimal indices such as `0` and `12`; a numeric-looking segment
does not cause a missing branch to become an array.

### 3.3 Measurement is host/registry, not the wire format (JD-3)

Flutter never puts font metrics in JSON. We should:

1. Keep wire format free of measure metadata.
2. Put wrapping estimates in **registry `measure`** (and a shared pure helper
   in `@workbench-kit/jdw` for tests / non-React hosts).
3. Allow a host to swap in DOM/`canvas` metrics later without schema changes.

### 3.4 Parse once, resolve often

`JsonWidgetData` caching maps to: parse/validate once →
`resolveJsonWidgetValues` on value changes → layout/render. JD-5 render smoke
should assert this path, not re-parse fixtures unnecessarily.

### 3.5 Assets are parameterized templates

`plugin_components` + our JD-2 `schema.json` inputs are the web analogue of
registry variables applied to a reusable fragment. Prefer asset inputs over
growing Screen Spec until JSON→draw (JD-5) closes.

## 4. Patterns to avoid copying

| Upstream feature                        | Why not (yet)                                                     |
| --------------------------------------- | ----------------------------------------------------------------- |
| Full expressions (`${'Hello ' + name}`) | Security + parser surface; exact path is enough for draw fidelity |
| Registry functions (`${sayHello(...)}`) | Host IPC / side effects; keep out of headless core                |
| Entire Material/Cupertino builder set   | Product scope; profile keeps a curated subset                     |
| YAML first-class                        | JSON SSoT in workbench; YAML optional later                       |
| Dart annotation codegen                 | TS schemas + `check:jdw-schemas` already gate drift               |

## 5. Implications for completion stages

| Stage     | Flutter-derived focus                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| JD-0…JD-2 | Done — wire, contract, asset inputs                                                    |
| **JD-3**  | Shared wrapped-text estimate + registry `measure` uses maxWidth (TextPainter analogue) |
| **JD-4**  | Headless value warehouse + listen coalesce (valueStream analogue)                      |
| **JD-5**  | Parse-once / resolve / layout / render smoke per known type                            |

Spec structure / Spec Form stay **after** JD-5. Screen Spec is kit-only; Flutter
has no equivalent DSL.

## 6. Archive note

Upstream is archived. Treat it as a **frozen reference** for v7 semantics, not
as a dependency to track. workbench-kit owns the web runtime; wire compatibility
is the only hard coupling.

## 7. Primary sources

- Repo README / package README (envelope, listen, registry)
- [Pub API docs](https://pub.dev/documentation/json_dynamic_widget/latest/)
- [MIGRATION_CLI.md](https://github.com/peiffer-innovations/json_dynamic_widget/blob/main/packages/json_dynamic_widget/doc/MIGRATION_CLI.md) (v7 lock-in)
- Internal: [jdw-architecture-analysis.md](./jdw-architecture-analysis.md) §5,
  [widget-layout-schema-plan.md](./widget-layout-schema-plan.md)
