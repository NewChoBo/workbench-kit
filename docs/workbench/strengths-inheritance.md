# Strengths Inheritance — tile_paper & custom_launcher → workbench-kit

Operational record of what was adopted from reference repos into neutral kit primitives.
Consumers remain reference-only until Phase 4 swap ([json-widget-port-then-replace.md](./json-widget-port-then-replace.md)).

## tile_paper (json-widget track)

| Strength                                                             | Kit mapping                                                       | Status                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| Monaco ↔ tree cursor sync                                            | `useJsonWidgetEditorSync` + `findPathForLineAndColumn`            | Adopted (prior)                              |
| DnD tree reorder + patch types                                       | `WidgetTreePanel` + `@workbench-kit/json-widget` patch            | Adopted (prior)                              |
| `WorkbenchPreviewCanvas` zoom/pan (ctrl+scroll, drag pan, fit scale) | `usePreviewViewport` + `JsonWidgetPreviewCanvas`                  | **Adopted**                                  |
| Monaco Ctrl+S save                                                   | `JsonCodeEditorPane` → `JsonWidgetEditor` / `JsonConfigWorkbench` | **Adopted**                                  |
| View toggle shortcuts (Ctrl+K V, Ctrl+Shift+V)                       | `JsonWidgetEditor.handleEditorMount`                              | **Adopted**                                  |
| Problems panel + status bar (Monaco markers)                         | `JsonCodeEditorPane`                                              | **Adopted**                                  |
| Parse error banner                                                   | `WorkbenchParseError` on editor + preview                         | Adopted (prior)                              |
| Playground inspector sections                                        | `playground/demo-registry` inspector metadata (MVP types)         | Adopted (prior) + **trimmed** to MVP palette |
| Full `WidgetPropertySections` (all builtins)                         | Registry-driven `WidgetInspectorPanel`                            | Partial — playground types only              |
| `createWidgetJsonSchema` (project/launchpad/tile schemas)            | `createPlaygroundWidgetJsonSchema`                                | Partial — playground subset                  |
| Domain widget renderers (`EditorWidgetWrapper`, tile layers)         | `PlaygroundEditorWidgetWrapper` + simplified previews             | **Adopted (simplified)**                     |
| `ProjectConfigEditor` / launchpad schemas                            | —                                                                 | **Deferred** (product-specific)              |

### tile_paper NOT inherited

- tile_paper domain routes, persistence, and storage keys
- Full tile layer compositing editor (badge/image/effects)
- `tile-ref` resolution and runtime data sources
- Project / launchpad / tile multi-schema selector in one editor pane
- Wholesale `@tilepaper/json-widget-tree-react` renderer stack

## custom_launcher (neutral extracts)

| Strength                                             | Kit mapping                                                                       | Status                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| Preview zoom toolbar (+/−/fit, scale label)          | `PreviewZoomToolbar` on `JsonWidgetPreviewCanvas`                                 | **Adopted**                                    |
| Preview validation issue surfacing in toolbar        | `PreviewZoomToolbar.issueMessage` (hook ready; playground uses parse banner)      | Partial                                        |
| Source editor dirty + validation + Apply gating      | `createJsonConfigEditorState` + `JsonConfigValidationBanner` + optional `onApply` | **Adopted**                                    |
| Import/export source transfer commands               | —                                                                                 | **Deferred** (host/file API)                   |
| Sectioned inspector (`LaunchpadTileEditor` sections) | `WorkbenchPropertySection` via registry inspector metadata                        | Adopted (pattern); launchpad sections deferred |
| `launchpad-source-widget-bridge` validation UX       | Parse/schema markers + config validation banner                                   | Partial — no launchpad DTO bridge              |
| Content hub navigation / sidebar views               | —                                                                                 | **Deferred** (product shell)                   |
| Launchpad DTO, snapshot apply pipeline               | —                                                                                 | **Deferred** (Phase 4 consumer)                |
| Display-target preview sizing                        | —                                                                                 | **Deferred** (launchpad-specific)              |

### custom_launcher NOT inherited

- Launchpad workbench shell merge (`#workbench-ui` wholesale replacement)
- `LaunchpadSnapshotDto` / tile placement / execution sections
- API-backed import/export (`exportSource`, `importSource`)
- Preview selection chrome tied to launchpad tile node IDs
- i18n launchpad string tables and product routes

## Figma-inspired patterns (pragmatic scope)

Neutral design-tool UX borrowed from tile_paper `figma-patterns.md` and simplified `EditorWidgetWrapper` — polish only, not a Figma clone.

| Pattern                                 | Kit mapping                                                                  | Status                                             |
| --------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Canvas pan/zoom + fit                   | `usePreviewViewport` + `PreviewZoomToolbar`                                  | **Adopted** (prior)                                |
| Space + drag pan (hand tool)            | `usePreviewViewport` space key + pointer capture                             | **Adopted**                                        |
| 8px snap grid overlay (visual)          | `PreviewZoomToolbar` grid toggle → `WorkbenchPreviewCanvas` viewport grid    | **Adopted**                                        |
| Selection bounding box + corner handles | `PlaygroundEditorWidgetWrapper` + `WorkbenchCanvasResizeHandle` (decorative) | **Adopted**                                        |
| Hover outline on widgets                | `WorkbenchCanvasItemFrame` hover state                                       | **Adopted** (polished)                             |
| Figma-blue selection chrome             | `--ui-workbench-canvas-selection-color` (#0d99ff) in canvas CSS              | **Adopted**                                        |
| Layers ↔ canvas selection sync          | `WidgetTreePanel` + `useJsonWidgetEditorSync`                                | Adopted (prior)                                    |
| Contextual inspector                    | `WidgetInspectorPanel` registry sections                                     | Adopted (prior)                                    |
| Widget drag + snap on move              | —                                                                            | **Deferred** (no position authoring in playground) |
| Resize handles (functional)             | —                                                                            | **Deferred** (grid/stack placement is JSON-only)   |
| Multi-select marquee / alignment guides | —                                                                            | **Deferred**                                       |
| Rulers / persistent guides              | —                                                                            | **Deferred**                                       |
| V select / H hand keyboard tools        | Space pan only; no tool mode switch                                          | Partial                                            |

**Story to exercise:** `JsonWidget/Playground` → `Interactive` — click widgets for selection chrome, toggle grid in preview toolbar, hold Space and drag to pan.

## Implementation notes (this milestone)

- **Zoom/pan**: `packages/react/src/json-widget/usePreviewViewport.ts` ports tile_paper canvas interaction; `PreviewZoomToolbar` ports launcher toolbar UX without launchpad labels.
- **Editor chrome**: `JsonCodeEditorPane` unifies problems footer, Ctrl+S, and dirty status for widget + config workbenches.
- **Config Apply pattern**: `JsonConfigWorkbench` shows validation banner and optional Apply when JSON parses and text differs from baseline (neutral substitute for launchpad source apply).
- **Widget types**: Playground palette trimmed to MVP (`text`, layout containers, `button`, `image`, `tile`, `divider`). Deferred types (`input`, `list-view`, `document`) may still render from saved JSON but are not in the demo registry.
- **Selection chrome**: `PlaygroundEditorWidgetWrapper` ports simplified tile_paper `EditorWidgetWrapper` frame/badge; Figma-style blue outline + decorative corner handles (no drag/resize patches).
- **Figma canvas UX**: Space+drag pan, optional 8px grid toggle, help hint updates on `JsonWidgetPreviewCanvas`.
- **Flutter track filters**: `FilterChip` / `FilterBarActiveChips` in `layout/Panel.tsx`; library/catalog and hub gallery stories demonstrate neutral extracts without Flutter runtime.

## Remaining deferred (Phase 4+)

- Consumer swap runbook and deletion of duplicated chrome in tile_paper / custom_launcher
- Full builtin widget schema parity (`tile-ref`, `spacer`, `dataSource`, …) — headless only until consumer registers them
- Launchpad-specific preview bridge and content-hub navigation
- Product import/export and persistence hooks on config workbench

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build:storybook && pnpm test:storybook-play
```

## Flutter track (legacy reference via custom_launcher docs + tile_paper patterns)

Flutter source code is removed from active repos; UX strengths are documented in
`custom_launcher/docs/developer/architecture/screen-flow.md`,
`launchpad-authoring-editor.md` (Flutter Reference Mapping),
`plugin-strategy.md` (ContentLibrarySourceManagerSheet flow),
and `tile_paper/docs/developer/reference/design-tools/flutter-patterns.md`.
Electron/custom_launcher is the current implementation baseline for several Flutter-origin specs.

### Category comparison

| Category            | Flutter strength                                                                | Electron/custom_launcher today                                            | workbench-kit                                                                        |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Navigation          | `toolbar + tabbed settings + preview + footer`; SharedSettingsLayout split      | VS Code shell: Activity Bar + Primary Side Bar + Editor tabs + Status Bar | `WorkbenchShell`, `WorkbenchSettingsModal`, explorer stories                         |
| Library browse      | Sidebar quick/schema filters; active filter chip bar; 88px rows; metadata chips | `LibraryQueryInput` facets, filter count badge, detail pane               | `LibraryCatalog` story + **FilterBar/FilterChip**                                    |
| Launchpad spatial   | Preview zoom/fit/grid/size chip; wallpaper context; tree↔canvas↔inspector sync  | `LaunchpadPreviewWindowFrame`, explorer outline, draft StatusBar          | `PreviewZoomToolbar`, canvas chrome stories (prior)                                  |
| Settings            | SettingSection + SettingControl; theme preset cards; debounced auto-sync        | `SchemaSettingsForm`, Appearance cards, immediate preview                 | `WorkbenchSectionedPanel`, `WorkbenchSettingsModal`, **SourceManagerSettings** story |
| Preview/zoom        | Tile preview zoom/fit/grid/size chip                                            | Shared preview toolbar + canvas viewport                                  | **Adopted** (`usePreviewViewport`, `PreviewZoomToolbar`)                             |
| Empty/loading/error | Fixed slot skeleton; inline auth failure (not giant banner)                     | EmptyState, skeleton cards, inline provider notices                       | `EmptyState`, `ListEmptyState`, template skeleton story                              |
| Shortcuts/menus     | Tile search workflow; layer reorder                                             | Ctrl+S save, context menus in product shell                               | `ShortcutCommandBridge`, `ContextMenu` primitives; product shortcuts deferred        |

### Adopted (this milestone)

| Strength                                                   | Kit mapping                                                                              | Status                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------- |
| Library active filter chip bar + Clear all                 | `FilterChip`, `FilterBarActiveChips`, `FilterBar.stories`, `LibraryCatalog` enhancement  | **Adopted**           |
| Source manager left-nav + right sectioned detail           | `SourceManagerSettings.stories` (`WorkbenchNavigationPanel` + `WorkbenchSectionedPanel`) | **Adopted (pattern)** |
| Content hub template card gallery                          | `TemplateGallery.stories` (208px cards, category chip, skeleton/empty)                   | **Adopted (pattern)** |
| Sectioned provider settings (Installation/Account/Library) | `WorkbenchSettingsSection` + inline auth notice via `HelpText`                           | **Adopted (pattern)** |
| Preview zoom/fit toolbar                                   | `PreviewZoomToolbar`                                                                     | Adopted (prior)       |
| Draft/explicit-save editor discipline                      | `JsonConfigWorkbench` Apply gating                                                       | Adopted (prior)       |

### Deferred

| Strength                                             | Reason                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| Full Activity Bar route tree + URL restore           | Product shell (`ContentHubViewFrame`)      |
| Launchpad outline ↔ canvas ↔ inspector tri-sync      | Launchpad DTO + Phase 4 consumer           |
| Layer stack reorder DnD + registry editors           | Launchpad-specific; playground subset only |
| Settings theme/locale debounced auto-sync            | Host persistence API                       |
| Library infinite scroll + count-bearing facet labels | Service/query integration in consumer      |
| Tile tilt/lift hover effects                         | Composition effect schema (product)        |
| Keyboard shortcut tables per surface                 | Host command registry                      |

### NOT inherited

- Flutter runtime overlay editor frame
- Nested tab depth inside tile settings (mobile stacking)
- Sembast / Dart persistence and `SourceRegistry` runtime
- Flutter `json_dynamic_widget` renderer stack wholesale
- Feature-local widget styling clones
- `ContentLibrarySourceManagerSheet` as modal (Electron uses inline settings editor instead)
- Playnite/Steam visual clone — flow parity only

### Reference docs consulted

- `custom_launcher/docs/developer/design/ui-ux-screens.md`
- `custom_launcher/docs/developer/architecture/screen-flow.md`
- `custom_launcher/docs/developer/conventions/ui-ux-concept.md`
- `custom_launcher/docs/developer/architecture/launchpad-authoring-editor.md` (§ Flutter Reference Mapping)
- `custom_launcher/docs/developer/architecture/tile-layer-contract.md` (§ Flutter baseline)
- `custom_launcher/docs/developer/architecture/content-hub-template-gallery.md`
- `tile_paper/docs/developer/reference/design-tools/flutter-patterns.md`
