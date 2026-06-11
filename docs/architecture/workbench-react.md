# Workbench React

`@workbench-kit/workbench-react` provides the React workbench shell that composes existing primitives from `@workbench-kit/react` with services from `workbench-core` and `platform`.

Phase 3 provides the initial implementation: `WorkbenchProvider` owns registry and layout service creation, resolves `.workbench` extension configuration against bundled manifests, activates startup extensions, and exposes the services through React context. `WorkbenchShell` composes the shell-only layout export from `@workbench-kit/react` and derives activities, views, and default status entries from `workbench-core` registries.

## Relationship to `@workbench-kit/react`

| Layer             | Responsibility                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `react`           | Low-level primitives (`Button`, `SplitView`, `ActivityBar` chrome pieces), styling via `tokens` |
| `workbench-react` | Full workbench layout, registry wiring, extension view hosting, command palette                 |

`workbench-react` **consumes** `react` primitives; it does not fork or duplicate them. Existing exports under `@workbench-kit/react` remain stable for non-workbench consumers.

## Root Components

### WorkbenchProvider

React context provider that:

- Bootstraps `workbench-core` services (`ExtensionRegistry`, `LayoutService`)
- Accepts initial `.workbench` extension configuration and optional extension manifest list
- Resolves enabled and missing extensions from bundled manifests by default
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

Hosts sidebar views registered for the active activity (e.g. Explorer, Search). Phase 3 renders registry-backed labels as the default host; M4 moves built-in view UI into extension-owned components.

### EditorArea

Tabbed or single editor region. Delegates to editor contributions and optional `monaco` package for code editing. Layout splits use `SplitView` from `react`.

### BottomPanel

Panel views (terminal placeholder, problems, output) in a bottom dock. Visibility and size controlled by `LayoutService`.

### StatusBar

Left/right status entries from contributions and platform services (branch name, errors count, encoding — as contributed later).

### CommandPalette

Modal command search UI bound to `CommandRegistry` and `KeybindingRegistry` hints. Filters by context keys and command enablement. Full palette ownership moves to `workbench-react` after the provider path is the default shell entry.

### Account menu entry

Status bar or activity area entry opening account/session UI. Uses `AccountService` from `platform`; does not read tokens from `.workbench` (see [Account Auth](./account-auth.md)).

## Data Flow

1. `WorkbenchProvider` loads config and registers extensions.
2. `ExtensionRegistry` merges contributions into registries.
3. `WorkbenchShell` subscribes to layout and context key changes.
4. User actions dispatch commands through `CommandRegistry`.
5. View hosts render extension-provided React trees via stable SDK contracts.

## Styling

Shell chrome uses `tokens` CSS variables. `react` primitive styles remain importable separately (`@workbench-kit/react/primitives.css` or equivalent).

## Testing Strategy

- Storybook story for the primary provider shell path
- Integration tests with in-memory extension manifests
- No dependency from `react` package tests on `workbench-react`

## Related Documents

- [Workbench Core](./workbench-core.md)
- [Extension System](./extension-system.md)
- [Account Auth](./account-auth.md)
