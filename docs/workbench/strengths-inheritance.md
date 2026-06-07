# Strengths Inheritance — tile_paper & custom_launcher → workbench-kit

Operational record of what was adopted from reference repos into neutral kit primitives.
Consumers remain reference-only until Phase 4 swap ([json-widget-port-then-replace.md](./json-widget-port-then-replace.md)).

## tile_paper (json-widget track)

| Strength | Kit mapping | Status |
| -------- | ----------- | ------ |
| Monaco ↔ tree cursor sync | `useJsonWidgetEditorSync` + `findPathForLineAndColumn` | Adopted (prior) |
| DnD tree reorder + patch types | `WidgetTreePanel` + `@workbench-kit/json-widget` patch | Adopted (prior) |
| `WorkbenchPreviewCanvas` zoom/pan (ctrl+scroll, drag pan, fit scale) | `usePreviewViewport` + `JsonWidgetPreviewCanvas` | **Adopted** |
| Monaco Ctrl+S save | `JsonCodeEditorPane` → `JsonWidgetEditor` / `JsonConfigWorkbench` | **Adopted** |
| View toggle shortcuts (Ctrl+K V, Ctrl+Shift+V) | `JsonWidgetEditor.handleEditorMount` | **Adopted** |
| Problems panel + status bar (Monaco markers) | `JsonCodeEditorPane` | **Adopted** |
| Parse error banner | `WorkbenchParseError` on editor + preview | Adopted (prior) |
| Playground inspector sections | `demo-playground-registry` inspector metadata | Adopted (prior) + **extended** (button, list-view, tile) |
| Full `WidgetPropertySections` (all builtins) | Registry-driven `WidgetInspectorPanel` | Partial — playground types only |
| `createWidgetJsonSchema` (project/launchpad/tile schemas) | `createPlaygroundWidgetJsonSchema` | Partial — playground subset |
| Domain widget renderers (`EditorWidgetWrapper`, tile layers) | `PlaygroundWidgetRenderer` simplified previews | Partial — neutral simplified tile |
| `ProjectConfigEditor` / launchpad schemas | — | **Deferred** (product-specific) |

### tile_paper NOT inherited

- tile_paper domain routes, persistence, and storage keys
- Full tile layer compositing editor (badge/image/effects)
- `tile-ref` resolution and runtime data sources
- Project / launchpad / tile multi-schema selector in one editor pane
- Wholesale `@tilepaper/json-widget-tree-react` renderer stack

## custom_launcher (neutral extracts)

| Strength | Kit mapping | Status |
| -------- | ----------- | ------ |
| Preview zoom toolbar (+/−/fit, scale label) | `PreviewZoomToolbar` on `JsonWidgetPreviewCanvas` | **Adopted** |
| Preview validation issue surfacing in toolbar | `PreviewZoomToolbar.issueMessage` (hook ready; playground uses parse banner) | Partial |
| Source editor dirty + validation + Apply gating | `createJsonConfigEditorState` + `JsonConfigValidationBanner` + optional `onApply` | **Adopted** |
| Import/export source transfer commands | — | **Deferred** (host/file API) |
| Sectioned inspector (`LaunchpadTileEditor` sections) | `WorkbenchPropertySection` via registry inspector metadata | Adopted (pattern); launchpad sections deferred |
| `launchpad-source-widget-bridge` validation UX | Parse/schema markers + config validation banner | Partial — no launchpad DTO bridge |
| Content hub navigation / sidebar views | — | **Deferred** (product shell) |
| Launchpad DTO, snapshot apply pipeline | — | **Deferred** (Phase 4 consumer) |
| Display-target preview sizing | — | **Deferred** (launchpad-specific) |

### custom_launcher NOT inherited

- Launchpad workbench shell merge (`#workbench-ui` wholesale replacement)
- `LaunchpadSnapshotDto` / tile placement / execution sections
- API-backed import/export (`exportSource`, `importSource`)
- Preview selection chrome tied to launchpad tile node IDs
- i18n launchpad string tables and product routes

## Implementation notes (this milestone)

- **Zoom/pan**: `packages/react/src/json-widget/usePreviewViewport.ts` ports tile_paper canvas interaction; `PreviewZoomToolbar` ports launcher toolbar UX without launchpad labels.
- **Editor chrome**: `JsonCodeEditorPane` unifies problems footer, Ctrl+S, and dirty status for widget + config workbenches.
- **Config Apply pattern**: `JsonConfigWorkbench` shows validation banner and optional Apply when JSON parses and text differs from baseline (neutral substitute for launchpad source apply).
- **Widget types**: Playground adds simplified `button`, `list-view`, `tile` (schema + renderer + inspector + insert templates).

## Remaining deferred (Phase 4+)

- Consumer swap runbook and deletion of duplicated chrome in tile_paper / custom_launcher
- Full builtin widget schema parity (`input`, `divider`, `image`, `tile-ref`, …)
- Launchpad-specific preview bridge and content-hub navigation
- Product import/export and persistence hooks on config workbench

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build:storybook && pnpm test:storybook-play
```
