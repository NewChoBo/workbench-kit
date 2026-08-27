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
import { AppIcon } from '@workbench-kit/react/primitives';
import { BUILTIN_WORKBENCH_EXTENSIONS } from '@workbench-kit/shell-react';
import { EditorArea } from '@workbench-kit/shell-react';
import { WorkbenchProvider } from '@workbench-kit/shell-react/provider';
import { WorkbenchShell } from '@workbench-kit/shell-react/shell';

export function App() {
  return (
    <WorkbenchProvider availableExtensions={BUILTIN_WORKBENCH_EXTENSIONS}>
      <WorkbenchShell
        appIcon={<AppIcon alt="" src="/app-icon.svg" />}
        title="Workbench"
        primarySidebar={<aside />}
        editorArea={<EditorArea />}
      />
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
`provider`, `host-shell`, `shell`, `command-host`, `command-palette`, and
`command-descriptors` subpaths. Hosts that already own the canonical extension
registry can use `registry-command-descriptors` without importing Provider
context into that leaf bundle. The root barrel remains the discovery surface,
not the default runtime import graph.

### Provider-free command host

Hosts that already own command descriptors and execution can compose the canonical
Command Palette and Quick Open without `WorkbenchProvider`:

```tsx
import { WorkbenchCommandHostController } from '@workbench-kit/shell-react/command-host-controller';

<WorkbenchCommandHostController
  commands={commands}
  executeCommand={executeCommand}
  quickOpenProviders={quickOpenProviders}
/>;
```

`commands` is the complete palette descriptor set. The controller owns only overlay
state, hard Palette/Quick Open shortcuts, selection routing, and completion-driven
closing. Hosts continue to own command registration, descriptor projection, Quick Open
provider construction, persistence, and error reporting. Pass `shortcutBridge` only
when the host also wants the generic keybinding bridge; omit it or pass `false` to keep
that routing host-owned.

### Focused extension context migration

`WorkbenchContextValue` no longer exposes the aggregate `ExtensionRegistry`.
Consumers that read Provider context use the focused `commands`, `menus`,
`extensionActivation`, `extensionActivationState`, `extensionCatalog`, and
`settingsCapabilityPublisher` fields instead. The focused contract types remain
available from the package root for external TypeScript consumers.

Hosts that explicitly own an `ExtensionRegistry` can continue passing that
instance to `useExtensionRegistryCommandDescriptors(registry, ...)`; this
host-composition hook is separate from Provider context and remains supported.

`WorkbenchShell` command hosts receive a focused `openSettings(categoryId?)`
control in their `onRunCommand` context. Use that host-composition seam for
commands that open a specific settings category without reading an aggregate
registry or capability map.

Use `host-shell` when the product owns sidebar, editor, panel, and overlay content.
It keeps Kit layout, Activity Bar ordering, resize persistence, and status routing
without loading the full Settings/Profile/Help assembly. Use `shell` for the
batteries-included management experience.

Prefer this package when the host needs provider + shell orchestration. For
layout-only chrome without host services, start from
`@workbench-kit/react/workbench/shell` — see
[Getting Started](../../docs/guides/getting-started.md).

## Host-owned branding

The default title bar does not embed a product mark. Pass the host-owned mark through
`appIcon`, omit it for a text-only identity, or replace the complete `titleBar` surface.
The shell wraps `appIcon` as decorative content, so interactive controls do not belong
in this slot. `AppIcon` from `@workbench-kit/react/primitives` is the optional sizing
and image-fit helper; it does not include fallback artwork.

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
import type { FieldRemapDocument } from '@workbench-kit/field-remap';
import '@workbench-kit/shell-react/field-remap/view.css';

// Uncontrolled demo:
// <FieldRemapPanel sample="nested-ab" />

// Controlled (host-persisted edges):
// <FieldRemapPanel edges={edges} onEdgesChange={setEdges} sources={…} targets={…} sourceSample={…} />
```

`FieldRemapFlowMapper` side-imports the same CSS; the explicit CSS export remains
for Flow-only embeds and custom bundler setups. The full barrel
`import { FieldRemapPanel } from '@workbench-kit/shell-react'` stays supported.

### n→m operators in direct Flow embeds

`FieldRemapFlowMapper` keeps durable edges and document-v2 combine/split operators
controlled. A host that enables operator authoring owns both arrays and commits each
complete next operator array through the same persistence/history boundary:

```tsx
const [document, setDocument] = useState(initialDocument);
const commitDocumentChange = (next: FieldRemapDocument) => {
  setDocument(next);
  hostHistory.record(next);
  persist(next);
};

<FieldRemapFlowMapper
  sources={sources}
  targets={targets}
  transforms={registry}
  edges={document.edges}
  onEdgesChange={(next) => commitDocumentChange({ ...document, edges: next })}
  operators={document.operators ?? []}
  onOperatorsChange={(next) => commitDocumentChange({ ...document, operators: next })}
/>;
```

The presence of `onOperatorsChange` is the operator-authoring capability signal: it
enables the existing Add combine / Add split actions and routes operator wiring, detail,
and deletion mutations through that callback. Omitting the callback is intentional
inspect-only projection; supplied operators can still render and be selected, but operator
mutation chrome is absent. Do not infer writability from operator count, sample, chrome, or
labels. `readOnly` suppresses Flow authoring even when mutation callbacks are present.

`FieldRemapPanel` already supplies this wiring for its fully uncontrolled composite
`{ edges, operators }` state. If either durable channel is controlled, its existing
composite `historyOwner` contract applies as described below; consumers do not add a second
operator state layer merely to enable Panel authoring. Direct operator inventory drag/drop
and double-click placement are deferred to [#219](https://github.com/NewChoBo/workbench-kit/issues/219).

### Semantic history ownership

`FieldRemapPanel` keeps a private composite `{ edges, operators }` undo/redo stack only
when both durable channels are uncontrolled. If either channel is controlled, pass one
`historyOwner` for the complete composite state; the Panel never creates a partial stack.
`historyActionsRef` exposes host-chrome actions and
`onHistoryAvailabilityChange` reports whether those actions are available. The Panel routes
available undo/redo chords through that same owner; direct `FieldRemapFlowMapper` consumers
remain responsible for host-owned history routing.

| Surface | Shortcut                     | Behavior                                                                                                                                     |
| ------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow    | `Escape`                     | Clears the active selection and unfinished drafts. If collapsed detail chrome owned focus, focus moves to the programmatic-only mapper root. |
| Flow    | `Delete` / `Backspace`       | Removes the eligible selected edge, convert step, operator, or draft through the existing mutation path.                                     |
| Panel   | `Ctrl/Cmd+Z`                 | Invokes the existing composite history owner's available undo action.                                                                        |
| Panel   | `Ctrl/Cmd+Shift+Z`, `Ctrl+Y` | Invokes the existing composite history owner's available redo action.                                                                        |

Editable inputs, textareas, selects, contenteditable elements, and transform option editors
retain their native key behavior. Unavailable or read-only actions leave the event unconsumed.

Only semantic edits coming from the Flow mapper create entries. Hidden mappings are
reconstructed before an entry is recorded, so undo does not discard filtered state.
Shape apply or external source/target replacement prunes invalid mappings and resets
past/future without adding a history entry. Draft placement, selection, viewport, and
detail-panel state stay outside this history.

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
| `rewirePolicy` (Flow)                                           | `'replace'` by default; `'reject'` preserves prior edges and reports impacted edge IDs.               |
| `onConnectionFeedback` (Flow)                                   | Receives one structured result at connection-attempt completion; hover validation stays silent.       |
| `parentChildConflicts` (Flow)                                   | Optional authoritative conflict projection; `undefined` derives from the supplied Flow inputs.        |

Rejected attempts render one compact `role="status"` message. Standalone Flow embeds derive
parent/child conflicts with the domain detector; Panel computes the same conflicts from full shapes
before hidden-field projection and supplies that authoritative result, so it renders only once.

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
