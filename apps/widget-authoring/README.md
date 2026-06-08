# Widget Authoring Studio (legacy prototype)

> **Canonical studio:** [studio-engine](../../../studio-engine) — generic UI engine; imports `@workbench-kit/contracts` + `@workbench-kit/json-widget` (+ `react/workbench` for shell/forms). **tilepaper-app** (future) adds product branding.
>
> This app remains a **kit-composed reference** for Storybook dogfooding and regression. New product features belong in **tilepaper-app**; engine work in **studio-engine**; kit primitives in workbench-kit. See [KIT_SURFACE.md](../../docs/workbench/KIT_SURFACE.md).

Standalone app for composing JSON widget layouts with the Workbench Kit editor surface.

## Run locally

From the monorepo root:

```bash
pnpm install
pnpm dev:widget-authoring
```

Open [http://127.0.0.1:6020](http://127.0.0.1:6020).

## Features (MVP)

- Starter layout templates (empty grid, welcome, dashboard) via gallery route
- **Components** panel — click or drag widgets onto the canvas
- **Assets** panel — upload images to IndexedDB, reuse via `asset:{id}` references
- Widget tree with drag-and-drop reorder
- GUI-first preview mode with canvas size presets and empty-canvas quick actions
- Monaco JSON editor with schema validation
- Interactive canvas preview with selection chrome
- Tabbed side panel: Inspector | Components | Assets
- Duplicate / delete selected widgets
- Copy or download JSON export
- Local layout persistence via `localStorage` (auto-save on edit, explicit save updates baseline)

### Browser storage keys (this app only)

| Key / store                               | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `workbench-kit/widget-authoring/document` | Document autosave (`localStorage`)       |
| `widget-authoring.sidebar-placement`      | Sidebar panel placement (`localStorage`) |
| `widget-authoring-assets`                 | Uploaded images (`IndexedDB`)            |

See [ITERATION_LOG.md](./ITERATION_LOG.md) for the improvement roadmap toward Figma-level authoring.

## Related packages

- `@workbench-kit/react/json-widget/playground` — `WidgetAuthoringWorkbench`, playground templates
- `@workbench-kit/react/json-widget` — `JsonWidgetEditor`, preview canvas (slim barrel)
- `@workbench-kit/react/authoring` — sidebar panels, drag/drop helpers
- `@workbench-kit/json-widget` — parse, patch, registry primitives

Storybook playground stories remain available under **JsonWidget/Playground** for component-level demos.
