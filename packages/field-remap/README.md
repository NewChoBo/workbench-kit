# `@workbench-kit/field-remap`

Field remap **runtime**: reshape structure A into structure B with mapping edges and `convertToShape`.

This package does **not** ship a mapping UI. Hosts adapt a tree or table UI into `MappingEdge[]`
and call `convertToShape`. The workbench sample (**Field Remap → A → B**) demonstrates a nested
tree mapper with list context; flat OSS adapters (for example `react-table-mapping`) remain useful
for leaf-only hosts.

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
| Index / wildcard paths                    | No (P2)                                                              |

Middle “graph nodes” in the sample UI are just `MappingEdge.transformIds` steps
(plus optional `transformOptionSteps`), not a separate document type. The workbench
sample renders them with `@xyflow/react` (source out → transform → target in).

### Shape ownership

`FieldRemapDocument` (v1) stores **edges only**. Hosts own input/output shapes
(`SourceField[]` / `TargetSlot[]`, or `defineDataShape` + ingest helpers) and pass
them into `convertToShape` / the shell `FieldRemapPanel` / `FieldRemapFlowMapper`.
Changing a shape should drop or warn on edges whose field/slot ids disappear.

### Host embed (shell UI)

Published packages already include the runtime and host-embeddable UI (no monorepo
checkout required once your pin includes a release that contains these exports):

```powershell
pnpm add @workbench-kit/field-remap@prototype @workbench-kit/shell-react@prototype
```

```ts
import {
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
} from '@workbench-kit/shell-react';

// Quick demo surface (catalog sample + preview):
// <FieldRemapPanel sample="nested-ab" />

// Or host-owned shapes + edges:
const transforms = createBuiltinValueTransformRegistry();
transforms.register(createJsonataValueTransform());
// <FieldRemapFlowMapper sources={…} targets={…} edges={…} transforms={transforms} onEdgesChange={…} />
```

Place-then-wire free graphs are **not** the document model — add transforms via the
palette / `+ node` onto an existing binding (`transformIds` chain, max 3). List
context uses `itemEdges` on array→array bindings.

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
panel wires an `AbortController` to effect cleanup.

Host JSONata transforms in `@workbench-kit/shell-react` are bounded by default (`timeoutMs`,
`maxExpressionLength`, `onError: 'throw'`). Use `createJsonataValueTransform()` to override.

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
