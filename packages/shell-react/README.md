# `@workbench-kit/shell-react`

React shell and host assembly for Workbench Kit: `WorkbenchProvider`,
`WorkbenchShell`, editor area wiring, layout/appearance persistence helpers, and
settings/profile/help composition.

Published on npm with the **`prototype`** dist tag.

## Install

```powershell
pnpm add @workbench-kit/shell-react@prototype @workbench-kit/react@prototype @workbench-kit/tokens@prototype
```

Peer: React 19.

## Quick start

```tsx
import { WorkbenchProvider, WorkbenchShell } from '@workbench-kit/shell-react';

export function App() {
  return (
    <WorkbenchProvider>
      <WorkbenchShell title="Workbench" primarySidebar={<aside />} />
    </WorkbenchProvider>
  );
}
```

Prefer this package when the host needs provider + shell orchestration. For
layout-only chrome without host services, start from
`@workbench-kit/react/workbench/shell` — see
[Getting Started](../../docs/guides/getting-started.md).

## Field Remap embed (slim subpath)

Hosts that only need the Field Remap mapper UI can import the slim subpath instead
of the full shell barrel (avoids pulling workbench shell / extension-host surfaces
into the consumer import graph):

```ts
import {
  FieldRemapPanel,
  FieldRemapFlowMapper,
  createJsonataValueTransform,
} from '@workbench-kit/shell-react/field-remap';
import '@workbench-kit/shell-react/field-remap/view.css';

// Uncontrolled demo:
// <FieldRemapPanel sample="nested-ab" />

// Controlled (host-persisted edges):
// <FieldRemapPanel edges={edges} onEdgesChange={setEdges} sources={…} targets={…} sourceSample={…} />
```

`FieldRemapFlowMapper` side-imports the same CSS; the explicit CSS export remains
for Flow-only embeds and custom bundler setups. The full barrel
`import { FieldRemapPanel } from '@workbench-kit/shell-react'` stays supported.

## Related docs

- [Component Map](../../docs/guides/component-map.md)
- [Sample Screens](../../docs/guides/sample-screens.md)
- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md)
- Sample host: [`examples/workbench-sample`](../../examples/workbench-sample/README.md)
