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
import { BUILTIN_WORKBENCH_EXTENSIONS } from '@workbench-kit/shell-react';
import { EditorArea } from '@workbench-kit/shell-react';
import { WorkbenchProvider } from '@workbench-kit/shell-react/provider';
import { WorkbenchShell } from '@workbench-kit/shell-react/shell';

export function App() {
  return (
    <WorkbenchProvider availableExtensions={BUILTIN_WORKBENCH_EXTENSIONS}>
      <WorkbenchShell title="Workbench" primarySidebar={<aside />} editorArea={<EditorArea />} />
    </WorkbenchProvider>
  );
}
```

`WorkbenchProvider` has no implicit extensions. Product hosts pass their own
extension list; hosts that want the Kit Explorer/Search/Settings set opt into
`BUILTIN_WORKBENCH_EXTENSIONS` explicitly. Pure layout persistence helpers are
available from the non-React `@workbench-kit/shell-react/layout-storage` subpath.
`WorkbenchShell` also has no implicit editor surface: pass `editorArea` when the
host wants the Kit editor, or omit it for a product-owned editor region.

Performance-sensitive hosts should import orchestration from the focused
`provider`, `shell`, `command-host`, `command-palette`, and
`command-descriptors` subpaths. The root barrel remains the discovery surface,
not the default runtime import graph.

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

### Flow host chrome hooks

`FieldRemapFlowMapper` (and `FieldRemapPanel` pass-through) accept optional chrome
hooks so hosts avoid CSS/DOM workarounds:

| Prop                                                            | Behavior                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `showMinimap`                                                   | Default `true`. When `false`, MiniMap is not mounted.                                                 |
| `onShowMinimapChange`                                           | When set, adds a MiniMap toggle inside Flow Controls (+/−/fit).                                       |
| `includeHidden` / `onIncludeHiddenChange`                       | When callback set, adds a hidden-fields toggle in the same Controls. Host/Panel still project shapes. |
| `onPaneContextMenu` / `onNodeContextMenu` / `onEdgeContextMenu` | Native event + selection payload; host owns menu UI.                                                  |
| `flowActionsRef`                                                | `{ fitView(options?) }` using the same defaults as Controls fit-view.                                 |
| `labels` / `t`                                                  | Override edge-list / Convert palette chrome (e.g. “Field maps”).                                      |
| `ioChrome` (Panel)                                              | `'browse' \| 'edit' \| 'none'` — prefer browse for inspect-only I/O.                                  |

```tsx
const flowActionsRef = useRef<FieldRemapFlowActions | null>(null);

<FieldRemapFlowMapper
  sources={sources}
  targets={targets}
  edges={edges}
  transforms={registry}
  onEdgesChange={setEdges}
  showMinimap={false}
  labels={{ bindingsTitle: 'Field maps' }}
  flowActionsRef={flowActionsRef}
  onPaneContextMenu={(event, { selection }) => {
    event.preventDefault();
    // host ContextMenu…
  }}
/>;
```

## Shell chrome labels / `t()`

`WorkbenchShell` accepts optional `labels` and `t(key, fallback)` for high-visibility chrome
(ActivityBar / StatusBar aria names, Profile/Settings secondary items, command palette).
English defaults apply when neither is set. See
`resolveWorkbenchShellChromeLabels` / `workbenchShellChromeLabelKeys` and
[Consumer Capabilities — Shell chrome label injection](../../docs/workbench/consumer-capabilities.md#shell-chrome-label--t-injection-126).

```tsx
<WorkbenchShell
  t={(key, fallback) => hostTranslate(key, fallback)}
  labels={{ settingsLabel: 'Settings' }}
/>
```

## Related docs

- [Component Map](../../docs/guides/component-map.md)
- [Sample Screens](../../docs/guides/sample-screens.md)
- [Consumer Capabilities](../../docs/workbench/consumer-capabilities.md)
- Sample host: [`examples/workbench-sample`](../../examples/workbench-sample/README.md)
