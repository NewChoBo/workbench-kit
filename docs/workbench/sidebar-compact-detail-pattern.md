# Sidebar Compact + Editor Detail Pattern

> Consumer-neutral spike for moving heavy sidebar UI into editor tabs while keeping
> primary sidebar views compact.

## Problem

Primary sidebar views should stay **compact**: filter, short lists, icons, and
primary actions only. Long copy, diagnostics, feature matrices, and inspector
forms belong in the **main editor area** as tabs (VS Code settings JSON, extension
detail, jconsole-style consoles).

## Pattern: `SidebarDetailPattern`

```
Sidebar list row (compact)
  ├─ single click / primary action → run, open file, toggle, etc.
  └─ inspect gesture → editorService.openEditor({ resourceUri, title, pinned })
         ↓
Editor resolver (`editorResolvers.registerResolver`)
         ↓
Editor host factory (`editorHostFactories.registerFactory`)
         ↓
Shell surface (`EditorHostSurface` branch or generic host frame)
         ↓
Detail panel component (reuses management / settings primitives)
```

### Resource URI convention

Use stable, product-neutral URIs under a `workbench://` scheme:

| Detail kind        | URI example                                              |
| ------------------ | -------------------------------------------------------- |
| Command inspector  | `workbench://command/inspect/{encodeURIComponent(id)}`   |
| Extension detail   | `workbench://extension/inspect/{id}` _(backlog)_         |
| Search result doc  | open workspace file URI in existing text editor          |

Helpers for commands live in `@workbench-kit/react/workbench/management`:

- `buildCommandInspectorUri(commandId)`
- `parseCommandInspectorUri(resourceUri)`
- `isCommandInspectorUri(resourceUri)`

Extension hosts may duplicate minimal parse logic to avoid depending on React.

### API surface (extensions)

No new manifest render kind is required for editor details. Reuse existing
contribution points:

1. **`editorResolvers`** — map `resourceUri` → `editorId`
2. **`editorHostFactories`** — create `EditorHost` for `editorId`
3. **`EditorHost.render()`** — return a typed render payload (`kind` discriminator)
4. **Shell surface** — map render payload → React detail component

Optional future: `workbench.openDetail` command that accepts `{ resourceUri }` so
consumers do not call `editorService` directly.

VS Code analog: sidebar list + `vscode.openWith` / custom editor for detail.

### Sidebar component contract

Sidebar components accept an optional inspect callback:

```ts
onInspectItem?: (id: string) => void;
```

Gesture defaults:

- **Commands pilot:** double-click row → inspect; single click → run (debounced
  so double-click does not also run)
- **Extensions backlog:** row select + Install/Enable in sidebar; double-click or
  Inspect → extension detail tab

## Pilot: Commands (implemented)

| Layer        | File |
| ------------ | ---- |
| URI helpers  | `packages/react/src/workbench/management/command-inspector-uri.ts` |
| Detail UI    | `packages/react/src/workbench/management/CommandInspectorPanel.tsx` |
| Sidebar      | `CommandManagementSidebar` — `onInspectCommand`, double-click |
| Shell wiring | `packages/shell-react/src/commands-view.tsx` |
| Editor host  | `extensions/builtin.commands/src/command-inspector-editor-host.ts` |
| Surface      | `packages/shell-react/src/command-inspector-surface.tsx` |

**Before:** sidebar list only; rich metadata visible in Settings → Commands panel.

**After:** sidebar stays a compact runnable list; double-click opens a pinned
editor tab with ID, description, source, keybinding, menu surfaces, and Run.

## Sidebar audit (2026-06-22)

| View       | Current sidebar content                         | Too heavy? | Detail candidate (editor tab)        |
| ---------- | ----------------------------------------------- | ---------- | ------------------------------------ |
| Explorer   | Tree, section header, toolbar actions           | No         | File preview / properties _(backlog)_ |
| Search     | Query + compact result list                     | Borderline | Multi-line match preview, replace UI |
| Commands   | Filter, grouped list, shortcuts, run footer     | Medium     | **Command inspector (pilot)**        |
| Extensions | Segmented tabs, chips, descriptions, diagnostics | **Yes**    | Extension manifest / install plan    |
| Chat       | Message stream + composer overlay               | OK in panel | Long transcripts / tool logs _(later)_ |

## CSS compact pass

Global sidebar tokens in `packages/react/src/styles.css`:

- `--ui-side-bar-inline-padding`: 8px → 6px
- `--ui-side-bar-row-block-padding`: 6px → 4px
- Header control bottom padding tightened

Scoped command / extension sidebar rules unchanged except extension control grid
padding aligned to new tokens.

## Backlog

1. **Extensions** — compact row (icon, name, status badge, primary action);
   move description, diagnostics, feature counts, install plan to editor tab.
2. **Search** — keep sidebar hits minimal; open result preview in editor or bottom
   panel for multi-match context.
3. **Explorer** — optional file preview tab instead of inline peek.
4. **Shared command** — `workbench.openManagementDetail` with URI validation.
5. **Command console** — invocation JSON + audit trail (see
   `command-core-alignment-plan-2026-06-20.md`).

## References

- `docs/workbench/sidebar-simplification-plan-2026-06-20.md`
- `docs/workbench/command-core-alignment-plan-2026-06-20.md`
- `extensions/builtin.editor` — text / missing-resource editor hosts
- `packages/shell-react/src/editor-host-surface.tsx`
