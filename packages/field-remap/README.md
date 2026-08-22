# `@workbench-kit/field-remap`

Field remap **runtime**: reshape structure A into structure B with mapping edges and `convertToShape`.

## Interaction model (host UI)

The intended mapper mental model — matching the shell Flow sample — is:

1. **Source schema (A)** and **target schema (B)** as multi-port columns (fields with types /
   nested paths). Hosts own these shapes; they are not stored in `FieldRemapDocument`.
2. **Optional convert steps** in the middle (`string:trim`, `string:upper`, `array:first`,
   `array:join`, …) when a binding needs transforms.
3. **Port-to-port wires (DnD)** from source → [converters] → target. Each wire is a
   `MappingEdge` (`transformIds` = convert chain). There is no free-form graph document.

This package does **not** ship a mapping UI. Hosts adapt a Flow / tree / table UI into
`MappingEdge[]` and call `convertToShape`. The workbench sample (**Field Remap → A → B**)
demonstrates the schema-column + convert-wire topology with list context; flat OSS adapters
(for example `react-table-mapping`) remain useful for leaf-only hosts.

## Install

```powershell
pnpm add @workbench-kit/field-remap@prototype
```

## Capabilities

| Pattern                                   | Support                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Leaf → leaf rename                        | Yes                                                                  |
| Nested object paths                       | Yes (`path` + `writeObjectPath`)                                     |
| Array whole copy                          | Yes (`identity`)                                                     |
| Array item projection                     | Yes (`itemSourcePath`)                                               |
| Array → scalar reduce                     | Yes (`array:first`, `array:join`)                                    |
| String format chain                       | Yes (`string:trim` / `upper` / `lower` / `prefix` / `suffix`, max 3) |
| Array&lt;object&gt; → Array&lt;object&gt; | Yes (`itemEdges` list context)                                       |
| Index / wildcard paths                    | Yes (`items[0].name`, `items[*].name` via `projectObjectPath`)       |
| n→m combine / split operators             | Yes (`applyMappingOperators`; document v2 `operators[]`)             |

### Path grammar

Safe object paths are dotted identifiers with optional index / wildcard brackets:

| Form     | Example         | API                                                      |
| -------- | --------------- | -------------------------------------------------------- |
| Property | `meta.label`    | `readObjectPath` / `writeObjectPath`                     |
| Index    | `items[0].name` | `readObjectPath` / `writeObjectPath`                     |
| Wildcard | `items[*].name` | `projectObjectPath` only (`readObjectPath` fails closed) |

Wildcard expansion is capped by `DEFAULT_MAX_PATH_WILDCARD_EXPANSION` (1000) or
`projectObjectPath(..., { maxExpansion })`. This is not a JSONPath engine.

Middle convert nodes in the sample UI are just `MappingEdge.transformIds` steps
(plus optional `transformOptionSteps`), not a separate document type. The workbench
sample renders them with `@xyflow/react` (source schema → convert → target schema).
Selecting a convert note opens a dedicated **Convert note editor** side surface
(`ConvertNoteEditor` in `@workbench-kit/shell-react`); binding/edge selection keeps
a lighter mapping detail rail (chain overview, palette, list context).

### Shape ownership

`FieldRemapDocument` stores edges plus optional combine/split operators. Hosts own
input/output shapes (`SourceField[]` / `TargetSlot[]`, or `defineDataShape` + ingest
helpers) and pass them into `convertToShape` / the shell `FieldRemapPanel` /
`FieldRemapFlowMapper`.
Optional `classRef` / `hidden` on fields and slots are additive; use
`projectShapes` / `projectSourceFields` / `projectTargetSlots` with
`includeHidden` (default omit hidden) before wiring Flow columns, and
`pruneMappingEdgesForShapes` after ingest when ids disappear. The shell panel’s
shape IO editor (paste JSON → ingest + `FieldDataType` selects) is an in-memory
host aid; browse-first hosts can set `ioChrome="browse"` /
`FieldRemapIoClassBrowse` instead. Neither path extends the persisted document.

### Host embed (shell UI)

Published packages already include the runtime and host-embeddable UI (no monorepo
checkout required once your pin includes a release that contains these exports):

```powershell
pnpm add @workbench-kit/field-remap@prototype @workbench-kit/shell-react@prototype
```

```ts
import {
  convertMappedInputs,
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';
import {
  FieldRemapFlowMapper,
  FieldRemapPanel,
  createJsonataValueTransform,
  type FieldRemapPreviewState,
} from '@workbench-kit/shell-react/field-remap';
import '@workbench-kit/shell-react/field-remap/view.css';

// Quick demo surface (catalog sample + preview):
// <FieldRemapPanel sample="nested-ab" />

// Controlled panel (host persists edges):
// <FieldRemapPanel edges={edges} onEdgesChange={setEdges} sources={…} targets={…} sourceSample={…} />

// Or host-owned shapes + Flow-only embed:
const transforms = createBuiltinValueTransformRegistry();
transforms.register(createJsonataValueTransform());
// <FieldRemapFlowMapper sources={…} targets={…} edges={…} transforms={transforms} onEdgesChange={…} />

// Evaluate transform-bearing edges without a FieldRemapDocument:
// await convertMappedInputs({ sources, targets, edges, inputs: { source: bag }, transforms })

// Direct Flow embeds stay presentation-only. Inject a host-precomputed runtime snapshot:
const preview: FieldRemapPreviewState = {
  status: 'ready',
  result: await convertMappedInputs({
    sources,
    targets,
    edges,
    inputs: { source: bag },
    transforms,
  }),
};
// <FieldRemapFlowMapper ... preview={preview} />
```

Prefer `convertMappedInputs` when the host catalog stores `MappingEdge[]` (+ optional
`operators[]`) separately from kit document JSON. Prefer `convertToShape` when you already
build `defineConversion` / `defineDataShape` registries yourself.

### Runtime preview ownership

`FieldRemapPanel` owns one abortable preview execution controller. Its legacy output pane
and optional `showFlowPreview` rail consume the same immutable result. Direct
`FieldRemapFlowMapper` embeds never execute mappings; hosts inject `preview` and may use
`showPreview={false}` to unmount the rail and its splitter track.

Selection is a read-only projection over the injected result and does not re-evaluate:

- no selection and operator selection show final document output after operators;
- edge selection shows the edge-local `ConvertToShapeResult.slots` value before an
  operator can overwrite that target;
- transform-step selection shows the final edge value, not an intermediate step value;
- operator-local intermediate values are not available;
- draft and stale selections are stable unsupported states.

An unavailable `hidden` / `no-sample` snapshot mounts no rail. Preview state is runtime-only
and is never written into `FieldRemapDocument`, history or persistence.

Place-then-wire uses **ephemeral draft nodes** in the shell Flow UI: place a
transform, wire source then target (or the reverse), and the draft finalizes into
a `MappingEdge` with `transformIds: [id]`. Escape discards unfinished drafts.
The persisted document stays mapping-only — no free graph nodes. You can also add steps
via the detail palette / `+ node` onto an existing binding (max 3). List context
uses `itemEdges` on array→array bindings.

**Persisted `xf:*` connect matrix** (shell Flow adapter; no silent no-ops):

| Drag                         | Effect                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| source port → target port    | upsert `MappingEdge`                                             |
| source port → `xf:edge:step` | rebind source; keep transforms from that step (splice prefix)    |
| `xf:edge:step` → target port | rebind target; keep transforms through that step (splice suffix) |
| `xf:A:i` → `xf:B:j` (A≠B)    | merge chains (append A prefix + B suffix); remove donor edge A   |
| same-edge `xf`↔`xf`          | rejected (mid segments already exist)                            |

### n→m operators (combine / split)

`FieldRemapDocument` v2 includes an optional `operators[]` list for fan-in / fan-out.
Call `applyMappingOperators` with
`combine` / `split` operators (limits: `MAX_MAPPING_FAN_IN` / `MAX_MAPPING_FAN_OUT`
= 8). Hosts may merge the result with `convertToShape` output.
`parseFieldRemapDocument` accepts the current version and normalizes edges and operators.
Shell Flow renders combine/split as multi-port nodes and supports authoring
(create / wire ports / delete) when hosts pass `operators` +
`onOperatorsChange` into `FieldRemapFlowMapper` (sample `nm-combine-split`).

```ts
import {
  applyMappingOperators,
  createBuiltinValueTransformRegistry,
} from '@workbench-kit/field-remap';

const { output } = await applyMappingOperators({
  operators: [
    {
      kind: 'combine',
      id: 'c1',
      inputFieldIds: ['a.date', 'a.time'],
      outputSlotId: 'b.startsAt',
      transformIds: ['datetime:combine'],
    },
  ],
  sources,
  targets,
  inputs: { a: { date: '2026-07-20', time: '14:30:00' } },
  transforms: createBuiltinValueTransformRegistry(),
});
```

### Port compatibility

Use `areFieldTypesCompatible` for identity (direct) links and `arePortsCompatible` when a
`transformIds` chain may mediate the link. Empty / omitted chains are identity matches;
non-empty chains require a `ValueTransformRegistry` and reuse `isTransformChainCompatible`.
Missing or `unknown` `FieldDataType` values stay permissive (same default as transform helpers).

```ts
import {
  areFieldTypesCompatible,
  arePortsCompatible,
  createBuiltinValueTransformRegistry,
} from '@workbench-kit/field-remap';

areFieldTypesCompatible('string', 'string'); // true
areFieldTypesCompatible('string', 'number'); // false

const transforms = createBuiltinValueTransformRegistry();
arePortsCompatible({
  sourceType: 'array',
  targetType: 'string',
  transformIds: ['array:join'],
  registry: transforms,
}); // true
```

## Quick start

```ts
import {
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

const structureA = {
  user_name: 'Ada',
  tags: [{ name: 'math' }, { name: 'computing' }],
};

const shapes = [
  defineDataShape({
    id: 'a',
    label: 'A',
    role: 'source',
    fields: sourceFieldsFromPlainObject(structureA, { idPrefix: 'a' }),
  }),
  defineDataShape({
    id: 'b',
    label: 'B',
    role: 'target',
    fields: targetSlotsFromPlainObject({ name: '', labels: [{ title: '' }] }, { idPrefix: 'b' }),
  }),
];

const conversion = defineConversion({
  id: 'a→b',
  sourceShapeIds: ['a'],
  targetShapeId: 'b',
  edges: [
    {
      id: 'e-name',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.name',
    },
    {
      id: 'e-tags',
      sourceFieldId: 'a.tags',
      targetSlotId: 'b.labels',
      itemEdges: [
        {
          id: 'e-title',
          sourceFieldId: 'a.tags.item.name',
          targetSlotId: 'b.labels.item.title',
        },
      ],
    },
  ],
});

const { output } = await convertToShape({
  conversion,
  shapes,
  inputs: { a: structureA },
  transforms: createBuiltinValueTransformRegistry(),
});
// { name: 'Ada', labels: [{ title: 'math' }, { title: 'computing' }] }
```

Hosts may `registry.register()` additional transforms (the sample registers `expr:jsonata` via
[jsonata](https://jsonata.org/)). `convertToShape` / `applyTransformChain` are async so Promise-returning
host transforms (JSONata 2.x) resolve correctly.

### Cancellation

Pass `signal` on `convertToShape` (or `TransformContext.signal`) to cancel stale previews.
Aborted runs reject with `AbortError` and stop further edges / chain steps. The shell Field Remap
panel controller also uses a private generation so late aborted/disposed results cannot replace
the latest snapshot.

Host JSONata transforms in `@workbench-kit/shell-react` are fail-closed and bounded by default
(`timeoutMs`, `maxExpressionLength`). Use `createJsonataValueTransform()` to override the bounds.

## Layout

```text
src/
  domain/document/  edges + FieldRemapDocument
  domain/shapes/    DataShape, ConversionDefinition, convertToShape
  domain/ingest/    plain object → fields / slots
  domain/mapping/   path helpers, list context, conflicts
  registry/         ValueTransform registry (identity, array:first, array:join)
```

## Stability

Published on the npm `@prototype` tag. Prefer the root export; deep paths are unsupported.
