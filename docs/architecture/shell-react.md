# Shell React

`@workbench-kit/shell-react` provides the React workbench shell that composes existing primitives from `@workbench-kit/react` with services from `workbench-core` and `platform`.

The current implementation is the default in-repo workbench host path:
`WorkbenchProvider` owns registry, editor service, and layout service creation,
resolves `.workbench` extension configuration against bundled manifests,
activates startup extensions, and exposes the services through React context.
`WorkbenchShell` composes the shell-only layout export from
`@workbench-kit/react` and derives activities, views, editor hosts, and default
status entries from `workbench-core` registries.

## Relationship to `@workbench-kit/react`

| Layer         | Responsibility                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `react`       | Low-level primitives (`Button`, `SplitView`, `ActivityBar` chrome pieces), styling via `tokens` |
| `shell-react` | Full workbench layout, registry wiring, extension view hosting, command palette                 |

`shell-react` **consumes** `react` primitives; it does not fork or duplicate them. Existing exports under `@workbench-kit/react` remain stable for non-workbench consumers.

## Root Components

### WorkbenchProvider

React context provider that:

- Bootstraps `workbench-core` services (`ExtensionRegistry`, `EditorService`, `LayoutService`)
- Accepts initial `.workbench` extension configuration and optional extension manifest list
- Accepts parsed `.workbench/layout.default.json` data as `initialLayout`
- Resolves enabled and missing extensions from bundled manifests by default
- Applies browser install-state filtering to the default bundled extension set;
  explicitly supplied `availableExtensions` are treated as the host-owned
  extension list and resolve directly from `extensionsConfig`
- Persists extension install state, workbench layout, keybinding overrides,
  local preferences, and editor restore state when the corresponding `persist*`
  flags are enabled. Browser `localStorage` is the default adapter; hosts can
  inject `Storage`-compatible adapters for file-backed or user-data persistence.
- Activates startup extensions and disposes registries on unmount
- Exposes command activation/execution helpers through `useWorkbench`

### WorkbenchShell

Top-level layout composing the major workbench regions through `@workbench-kit/react/workbench/shell`. Typical structure:

```
┌─────────────────────────────────────────────────────────┐
│ Title / custom header (optional)                        │
├──┬──────────────────────────────────────────────┬───────┤
│A │ PrimarySideBar │      EditorArea           │ Aux   │
│c │                │                           │ Bar   │
│t │                │                           │       │
│i │                ├───────────────────────────┤       │
│v │                │ BottomPanel               │       │
│i │                │                           │       │
│t │                │                           │       │
│y │                │                           │       │
│  │                │                           │       │
├──┴────────────────┴───────────────────────────┴───────┤
│ StatusBar                                               │
└─────────────────────────────────────────────────────────┘
```

## Regions

### ActivityBar integration

Uses shell chrome from `react` to show activity icons from contributed activities or view containers. Clicking an activity toggles `PrimarySideBar` and activates the corresponding view container through `LayoutService`.

### PrimarySideBar

Hosts sidebar views registered for the active activity (e.g. Explorer, Search). M4 activates views for the active container and renders SDK view providers when extensions register them; registry-backed labels remain the fallback.

### EditorArea

Tabbed editor region backed by `EditorService`. Editor resolver contributions
choose an editor for a resource, `EditorHostFactoryRegistry` creates the host,
and `EditorArea` renders the active host surface. The built-in text editor
contribution is active today; optional `monaco` integration remains a separate
package concern.

`EditorService` owns editor groups, tabs, split direction, split ratios, nested
layout mutation, and restored editor state. `shell-react` stores the browser
MVP restore snapshot in `localStorage` by default, and `WorkbenchProvider`
accepts `Storage`-compatible adapters so non-browser hosts can bridge the same
state through a host-owned `state.json` or user data store.

`WorkbenchProvider` also uses the `EditorDocumentViewProviderRegistry` owned by
`ExtensionRegistry` for text editor surfaces. Built-in JSON form, JDW preview,
and Markdown preview providers are registered by default. Hosts can contribute
additional form/preview providers through `documentViewProviders`, and activated
extensions can register runtime providers through
`context.editorDocumentViews.registerProvider(...)` for manifest-declared
`contributes.documentViews`. `EditorArea` can still accept local `viewProviders`
for surface-specific overrides, but the provider registry is the canonical shell
source.

### BottomPanel

Deferred bottom dock for future panel views such as terminal, problems, or
output. `LayoutService` owns the framework-neutral panel visibility state, but
the current sample host focuses on activity/sidebar/editor/status surfaces.

### StatusBar

Left/right status entries from contributions and platform services (branch name, errors count, encoding — as contributed later).

### CommandPalette

Modal command search UI bound to `CommandRegistry` and `KeybindingRegistry` hints. Filters by context keys and command enablement. Full palette ownership moves to `shell-react` after the provider path is the default shell entry.

`WorkbenchCommandHost` also attaches first-party shell command handlers (for
example activity selection, primary sidebar toggle, and settings open) to
`ExtensionRegistry.commands` at runtime, so palette execution and direct
`useWorkbench().executeCommand(...)` calls share the same provider command path.

### Context Menus

Editor tab and explorer item context menus combine first-party shell actions
with extension `menus` contributions. `shell-react` resolves contributed
`editor/tab/context` and `explorer/context` items through
`resolveWorkbenchMenuContributions()`, then executes selections through
`useWorkbench().executeCommand(...)` so menu-triggered extension commands use
the same activation/execution path as palette and chat commands.

### Chat command surface

Built-in Chat and AI Chat reuse the same command descriptors and command suggest
UI for `/command.id` input. `useWorkbenchChatCommandSurface` keeps chat-specific
input handling local while routing execution through `useWorkbench().executeCommand(...)`;
it does not introduce a second command service. Commands that need payloads can
be invoked with one JSON argument, for example
`/workspace.open {"paths":["src/App.tsx"]}`.

### Account menu entry

The secondary activity bar can show a service profile action above settings.
That action opens `WorkbenchProfileModal` for the currently signed-in Workbench
service account. Linked external/project accounts stay in settings through the
account management surface. Both surfaces use account/auth contracts from
`platform` and must not read tokens from `.workbench` (see
[Account Auth](./account-auth.md)).

### Management surfaces

Command, keybinding, and linked-account management panels share the
`ManagementPanelFrame` primitives from `@workbench-kit/react/workbench`. The
shared frame owns the settings-section wrapper, filter toolbar, summaries, empty
states, and command run-state display so each panel only carries domain-specific
rows/actions.

Modal-based shell surfaces use common `Modal` sizing, scroll, body padding, and
stack layout options instead of per-modal body CSS for repeated shell chrome.

Settings and appearance category assembly lives in `shell-settings.tsx` instead
of `shell.tsx`. That keeps shell layout, view hosting, and settings field
rendering in separate files so parallel work on shell chrome and configuration
UI does not converge on the same large module.

## Data Flow

1. `WorkbenchProvider` loads config and registers extensions.
2. `ExtensionRegistry` merges contributions into registries.
3. `WorkbenchShell` subscribes to layout and context key changes.
4. `WorkbenchCommandHost` registers shell command handlers into the provider command registry.
5. User actions, command palette selections, and chat slash commands dispatch
   through `useWorkbench().executeCommand(...)`.
6. View hosts and editor hosts render extension-provided values via stable SDK
   contracts, mapping valid React nodes and simple text values into the shell.

## Styling

Shell chrome uses `tokens` CSS variables. `react` primitive styles remain importable separately (`@workbench-kit/react/primitives.css` or equivalent).

## Testing Strategy

- Storybook story for the primary provider shell path
- Integration tests with in-memory extension manifests
- No dependency from `react` package tests on `shell-react`

## Related Documents

- [Workbench Core](./workbench-core.md)
- [Extension System](./extension-system.md)
- [Account Auth](./account-auth.md)
