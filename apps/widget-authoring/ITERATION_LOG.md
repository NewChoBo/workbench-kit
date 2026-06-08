# Widget Authoring Studio — Iteration Log

## Iteration 1 (2026-06-08) — Asset library + placement MVP

### Done

- **Asset library (app-local)**
  - `AuthoringAsset` model (`id`, `name`, `type`, `mimeType`, `createdAt`)
  - IndexedDB persistence for image data URLs
  - Assets panel tab with upload, thumbnail grid, remove, click-to-place, drag-to-canvas
  - `asset:{id}` reference convention with preview resolver
- **Placement workflow**
  - Components palette moved from toolbar to right **Components** tab
  - Click-to-insert and drag-to-canvas (templates + image assets)
  - Image widgets bind to library assets via `asset:` references
  - Grid drop maps pointer position to `col`/`row` when root is a grid
- **UX quick wins**
  - Default mode **preview** (GUI-first)
  - Canvas size presets (phone / tablet / desktop)
  - Empty canvas CTA with quick-add buttons
- **Foundation**
  - Tabbed right panel (`Inspector | Components | Assets`)
  - Storybook stories for palette and side panel
  - All placement flows use existing `WidgetPatch` / `insertPlaygroundWidget`

### How to use

1. `pnpm dev:widget-authoring` → open http://127.0.0.1:6020
2. **Assets** tab → **Upload image** → click thumbnail or drag onto canvas
3. **Components** tab → click or drag widgets onto canvas
4. Inspector edits properties; image `src` shows `asset:{id}` for library images

---

## Iteration 2 (2026-06-08) — Editor reliability (Phase 1 completion)

### Done

- **Undo / redo**
  - `packages/json-widget/src/widget-patch-history.ts` — past/present/future stack for document strings
  - Wired into `useJsonWidgetEditorSync` (`applyPatch`, `commitDocument`, `undo`, `redo`, `canUndo`, `canRedo`)
  - Editor header + authoring toolbar undo/redo buttons (`undo-widget`, `toolbar-undo`, etc.)
  - `historyResetKey` clears stack on starter template load
- **Keyboard shortcuts** (`authoring/authoring-shortcuts.ts`)
  - Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z redo)
  - Delete removes selected widget when `onDeleteSelected` is provided
  - Ignores shortcuts when focus is in editable fields
- **Inspector asset picker**
  - `InspectorAssetPickerRow` — thumbnail grid for image `src` when `imageSrcAssets` is provided
  - `AuthoringStudioWorkbench` maps IndexedDB assets into inspector picker
- **CI / tests**
  - Storybook play smoke test already uses Components tab + `palette-text` (prior CI failure was stale)
  - 394 unit tests passing (includes history + shortcut tests)

### Verification

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Iteration 3 (2026-06-08) — Canvas UX parity (tldraw / Canva patterns)

### Done

- **Multi-select**
  - `selectWidgetPathWithOptions` with `{ additive }` (Shift/Ctrl/Meta) in canvas, tree, and editor sync
  - `deletePlaygroundWidgets` / `duplicatePlaygroundWidgets` bulk ops with path normalization
  - Multi-select hint in inspector when `selectedCount > 1`
- **Select / Hand tools**
  - `PreviewZoomToolbar` select + hand toggle; V/H shortcuts; hand tool enables pan via `panToolActive`
- **Snap guides**
  - `authoring/snap-guides.ts` — scalar/point/delta snapping
  - Drag release snaps stack/grid children to sibling alignment guides
  - Grid overlay toggle wires `showSnapGrid` into preview context
- **Canva left add panel**
  - `leftPanelTabs` on `JsonWidgetEditor` — Components | Templates | Assets (app)
  - Right panel = Inspector only (contextual properties)
- **Simple inspector mode**
  - `inspectorMode="simple"` with per-type field allowlist + Advanced accordion for placement
- **Templates tab**
  - Starter template cards in left panel (`PLAYGROUND_STARTER_TEMPLATES`)

### Verification

```bash
pnpm typecheck && pnpm lint && pnpm test   # 399 tests
pnpm test:storybook-play:required          # InteractiveSmoke passes
```

---

## Iteration 4 (2026-06-08) — Bulk selection ops polish

### Done

- Fixed `playground-ops.ts` bulk delete (no recursive call); `normalizePlaygroundSelectionPaths` filters ancestor overlap
- `WidgetAuthoringWorkbench` duplicate/delete use full selection state, not only `selectedPath`
- Tree + canvas additive select uses Ctrl/Meta in addition to Shift
- Storybook smoke test updated for left-panel layout (inspector always visible on right)

---

## Iteration 5 (2026-06-08) — Template gallery landing (Canva UX)

### Done

- `apps/widget-authoring/src/features/templates/TemplateGallery.tsx` — hero, starter cards, Start blank CTA
- `AuthoringStudioPage` — gallery-first route; **Templates** header button returns to gallery
- Template select clones document + persists to localStorage before entering editor

### Verification

```bash
pnpm dev:widget-authoring  # gallery → pick template → editor
```

---

## Iteration 6 (2026-06-08) — Create assets one by one

### Done

- **Asset types extended** — `image`, `icon` (SVG), `color` (named swatch); `color:#hex` storage convention
- **Create Asset dialog** — type picker (Image / SVG icon / Color), name + content form, create & edit modes
- **Per-asset actions** — Edit (rename / replace content), Duplicate, Remove
- **Clipboard paste** — paste raster image anywhere in the app to add an image asset
- **Placement**
  - Image & SVG icon → image widget (`asset:{id}`), drag or click
  - Color swatch → tile widget with `layers[0].color: asset:{id}`
- **Preview resolver** — `asset:{id}` resolves to data URL (image/icon) or hex (color); tile backgrounds resolve color refs
- **Inspector picker** — includes SVG icon assets alongside images

### How to create assets one by one

1. `pnpm dev:widget-authoring` → open editor → **Assets** tab (left panel)
2. Click **Create asset** → choose type:
   - **Image** — pick a file
   - **SVG icon** — paste `<svg>…</svg>` markup
   - **Color** — pick/name a hex swatch
3. Save → asset appears in the grid with Edit / Duplicate / Remove
4. **Quick upload** or **Ctrl+V** (paste image) for fast image import
5. Click or drag asset onto canvas; color swatches insert a tile

### Verification

```bash
pnpm typecheck && pnpm lint && pnpm test   # 410 tests
```

---

## Next iteration candidates

| Priority | Feature                                         |
| -------- | ----------------------------------------------- |
| Medium   | Marquee (brush) selection on canvas             |
| Medium   | Component instances lite (Phase 2)              |
| Low      | Inspector typing debounce → single history mark |
| Low      | Text preset / widget snippet assets             |
| Low      | Export bundle (JSON + assets)                   |

### MVP checklist (2026-06-08)

| Item                                         | Status                              |
| -------------------------------------------- | ----------------------------------- |
| Undo/Redo                                    | ✅                                  |
| Asset library + placement                    | ✅                                  |
| Multi-select + bulk ops                      | ✅                                  |
| Simple inspector + Advanced toggle           | ✅                                  |
| Left add panel (Components/Assets/Templates) | ✅                                  |
| Snap/guides (basic)                          | ✅                                  |
| Select/Hand tools                            | ✅                                  |
| Template gallery landing                     | ✅                                  |
| CI validate:full                             | ✅ (this run)                       |
| Storybook play required                      | ✅                                  |
| No playground-kit coupling in wrong layer    | ✅ (WidgetPatch/registry preserved) |

---

## Core MVP focus (2026-06-08)

Prioritized pillars only: **widget tree**, **per-widget inspector**, **asset drag-and-drop placement**. Deferred: collaboration, infinite canvas, Figma polish, template gallery (unless core), multi-select polish, snap extras, npm publish.

### Pillar status

| Pillar              | Status           | Notes                                                                                                                                          |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget tree         | **Solid (core)** | DnD reparent/reorder, selection sync, search/filter, label rename, hidden/locked, box/document insert rules                                    |
| Per-widget settings | **Solid (core)** | Registry inspectors for all playground types, simple/advanced mode, image asset picker, tile layer color, Widget section (label/hidden/locked) |
| Asset DnD placement | **Solid (core)** | IndexedDB images + SVG + colors, create/edit/duplicate, drag/click place, grid cell + stack position mapping                                   |

### This run (Core MVP)

- **Tree**: search filter with ancestor expansion; hidden/locked flags in tree + inspector; box `set-box-child` and document inner-grid insert/reparent fixes
- **Inspector**: common Label/Hidden/Locked section; fixed simple-mode drift (tile, list-view); tile `layerColor` → `layers[0].color`
- **Placement**: `resolveInsertTarget` handles box/document/root edge cases; stack drop uses pointer `left`/`top`; SVG accepted in asset upload

### Core MVP remaining (deferred)

- Full tile layers array editor
- Canvas hit-test drop into nested containers (still uses selection + root type rules)
- Bundled icon packs / text preset assets
- Inline tree rename (double-click); lock blocks selection entirely
- Inspector typing debounce → single history mark

### Verify

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Slim kit cleanup (2026-06-08)

### Removed

- Deprecated `rightPanelTabs` on `JsonWidgetEditor` (use `renderRightSidebar` + `leftPanelTabs`)
- `renderToolbar` override and duplicate undo/redo on `WidgetAuthoringToolbar` (editor header owns history)
- Templates tab inside `WidgetAuthoringWorkbench` (app `TemplateGallery` is canonical)
- Playground palette/registry entries: `input`, `list-view`, `document`
- Starter templates: `media-card`, `form-column`, `document-shell`
- Unused `replaceRootWidget` export; public `PlaygroundPlacementSections` export
- Duplicate story `WidgetAuthoringWorkbench.stories.tsx` (covered by `PlaygroundInteractive`)

### Kept

- `WidgetAuthoringWorkbench` in kit (app composes via `AuthoringStudioWorkbench`)
- MVP playground types, insert/ops, renderer, symmetric sidebar placement
- `WidgetPatch`, `JsonWidgetEditor`, asset/chat features in app

### Docs

- `FOUNDATION.md` — slim kit policy + sidebar default without Templates tab
- `DIRECTORY_STRUCTURE.md` — slim kit policy section
- `strengths-inheritance.md` — registry trim notes (not deleted)
