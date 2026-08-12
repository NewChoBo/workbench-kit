# Sample Screens

Example screen recipes for integrating hosts. Each recipe points at the sample
host and/or Storybook — not a private product UI.

Run locally:

```powershell
pnpm install
pnpm build:workbench-extensions
pnpm dev              # http://127.0.0.1:65173/
pnpm dev:storybook    # http://127.0.0.1:61009/
```

Related: [Getting Started](./getting-started.md) · [Component Map](./component-map.md) ·
[examples/workbench-sample/README.md](../../examples/workbench-sample/README.md)

## Auth gate

| Field            | Detail                                                       |
| ---------------- | ------------------------------------------------------------ |
| **What you see** | Sign-in before the workbench shell                           |
| **Sample**       | Open `pnpm dev` — use `tester` / `tester`                    |
| **Storybook**    | Workbench Sample/Dev App (auth journey plays)                |
| **Kit pieces**   | Host owns auth; kit provides shell after session exists      |
| **Non-goals**    | Kit does not ship a product login brand or identity provider |

## Authenticated workbench shell

| Field            | Detail                                                    |
| ---------------- | --------------------------------------------------------- |
| **What you see** | Activity bar, primary sidebar, editor area, status bar    |
| **Sample**       | After sign-in in workbench-sample                         |
| **Storybook**    | Workbench UI/Shell · Workbench Sample/Dev App             |
| **Kit pieces**   | `WorkbenchShell`, activity/sidebar slots, status sections |
| **Host keeps**   | Routing, IPC, which views exist, theme preference storage |

## Explorer + editor

| Field            | Detail                                                             |
| ---------------- | ------------------------------------------------------------------ |
| **What you see** | File tree, open tabs, text/document editor body                    |
| **Sample**       | Explorer activity in workbench-sample                              |
| **Storybook**    | Workbench UI/Editor/Chrome · Workbench UI/Workspace/Search         |
| **Kit pieces**   | `WorkspaceExplorer` / panel, editor tabs helpers, workspace editor |
| **Host keeps**   | File I/O, save ports, language services                            |

## Chat sidebar

| Field            | Detail                                        |
| ---------------- | --------------------------------------------- |
| **What you see** | Conversation list / messages / composer       |
| **Sample**       | Chat surfaces in the sample host when enabled |
| **Storybook**    | Workbench UI/Chat/Components                  |
| **Kit pieces**   | `@workbench-kit/react/workbench/chat`         |
| **Host keeps**   | Model transport, tool results, persistence    |

## Settings / management dialog

| Field            | Detail                                          |
| ---------------- | ----------------------------------------------- |
| **What you see** | Modal or overlay settings / integrations shell  |
| **Sample**       | Settings-related slices in the sample showcase  |
| **Storybook**    | Atomic UI/Overlays/Dialog Actions               |
| **Kit pieces**   | Modal frame, management dialog helpers, notices |
| **Host keeps**   | Preference schema, save/load, account linking   |

## Library detail

| Field            | Detail                                                    |
| ---------------- | --------------------------------------------------------- |
| **What you see** | Detail layout with media hero, property sections, actions |
| **Sample / SB**  | Workbench Sample/Library Detail                           |
| **Kit pieces**   | `LibraryDetailLayout`, property grids, media slots        |
| **Host keeps**   | Domain records, actions, filter catalogs                  |

## Catalog browse / facets

| Field            | Detail                                        |
| ---------------- | --------------------------------------------- |
| **What you see** | Browse pane with facet filters / overlays     |
| **Sample**       | Library showcase in workbench-sample          |
| **Storybook**    | —                                             |
| **Kit pieces**   | `CatalogBrowsePane`, facet strip/panel/dialog |
| **Host keeps**   | Query model, persisted filter presets         |

## Field Remap editor

| Field            | Detail                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What you see** | Schema columns A/B + optional middle convert notes, wired by port DnD (`nested-ab` default). Select a convert note to open the dedicated Convert editor side rail; select a binding for lighter mapping detail. |
| **Sample / SB**  | Workbench Sample/Field Remap                                                                                                                                                                                    |
| **Kit pieces**   | `@workbench-kit/field-remap` + `@workbench-kit/shell-react` Flow panel + sample extension host                                                                                                                  |
| **Host keeps**   | Persistence of mappings (`FieldRemapDocument`), schema sources (host-owned shapes)                                                                                                                              |

## JDW / widget tree

| Field            | Detail                                                        |
| ---------------- | ------------------------------------------------------------- |
| **What you see** | Widget document preview / lab / composed fixtures             |
| **Sample**       | JDW fixtures under sample workspace (`jdw/...`)               |
| **Storybook**    | JDW/WidgetTree/Lab · jdw-editor stories                       |
| **Kit pieces**   | `@workbench-kit/jdw`, `@workbench-kit/react/jdw`, widget-tree |
| **Host keeps**   | Document store, publish pipeline                              |

## Theme switching

| Field            | Detail                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **What you see** | Light/dark (and host presets) applied to shell chrome                   |
| **Sample**       | Theme controls in workbench-sample                                      |
| **Kit pieces**   | `@workbench-kit/tokens`, theme provider / presets under react/workbench |
| **Host keeps**   | Preference key, OS sync, product accent mapping                         |

## Checklist for new consumer screens

1. Prefer composing documented kit surfaces over custom chrome.
2. Add or update a row in [Component Map](./component-map.md) when introducing a
   new public composition pattern.
3. Keep Storybook curated; use the sample host for multi-surface journeys
   ([Storybook conventions](../conventions/storybook.md)).
4. Never document private host paths or product codenames in these guides.
