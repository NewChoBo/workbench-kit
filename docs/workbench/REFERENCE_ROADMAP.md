# Widget Authoring — Reference Alignment Roadmap (C안)

Last updated: 2026-06-08

> **Start here for direction:** [FOUNDATION.md](./FOUNDATION.md) — product identity, core principles, reference matrix, MVP scope, architecture, and restart plan. This roadmap is **tactical detail** (gaps, iterations) and must align with the foundation.

Strategic alignment for **beginner-first** widget authoring (regular users, not pro designers), using **Canva UX** as the primary interaction reference, **Penpot** for document structure, **tldraw** for canvas manipulation, and **Figma** only for polish/shortcuts — within the **C안 hybrid** ([reference-implementation-strategy.md](./reference-implementation-strategy.md)).

**Combo:** Figma placement + Canva templates + tldraw canvas + Webflow runtime output.

## Current position (2026-06-08)

| User MVP phase                          | Status       | Evidence                                                                                        |
| --------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| **Phase 1** — single-user canvas editor | **~85%**     | `JsonWidgetPreviewCanvas`, zoom/pan, select/move/resize (grid/stack), inspector, JSON save/load |
| **Phase 2** — widget/component system   | **~40%**     | Registry + palette + `WidgetPatch`; no published components / variants                          |
| **Phase 3** — templates/presets         | **~50%**     | Starter templates + empty CTA; no Canva-style gallery / categories                              |
| **Phase 4** — collaboration             | **Deferred** | Correct — not started                                                                           |

**Iteration 1 (assets):** implemented in `apps/widget-authoring/` and `packages/react/src/json-widget/playground/`.

**Iteration 2 (reliability):** undo/redo, keyboard shortcuts, inspector asset picker — implemented in kit playground and studio-engine.

## Architecture decision: keep WidgetPatch, adopt tldraw UX only

| Layer          | Keep (TilePaper truth)                                       | Adopt from references                                     |
| -------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Document model | `GenericWidget` tree + `WidgetPatch`                         | Excalidraw-style versioned JSON file envelope             |
| Registry       | `createWidgetRegistry` + inspector metadata                  | Penpot component / variant IDs (later)                    |
| Canvas engine  | Custom `PlaygroundWidgetRenderer` + `WorkbenchPreviewCanvas` | tldraw camera, selection, handle interaction **patterns** |
| Runtime output | JSON → React renderer (Webflow/Framer direction)             | Penpot code-inspect export hooks (later)                  |

**Do not** replace `JsonWidgetPreviewCanvas` with **tldraw SDK** as the document engine. tldraw shapes ≠ `GenericWidget`; migration cost blocks TilePaper runtime parity.

**Do** optionally add `@tldraw/editor` later as a **viewport/camera submodule** if infinite canvas is required — still map patches to widget tree, not tldraw store.

## Gap table (reference vs implementation)

| Pattern            | Penpot           | tldraw        | Excalidraw    | Current kit                          | Gap                               |
| ------------------ | ---------------- | ------------- | ------------- | ------------------------------------ | --------------------------------- |
| Infinite canvas    | pages + viewport | camera store  | bounded board | fixed preset frame                   | Medium                            |
| Zoom / pan         | yes              | yes           | yes           | `usePreviewViewport`                 | **Done**                          |
| Select / move      | yes              | yes           | yes           | single select, grid/stack drag       | Multi-select, freeform x/y        |
| Resize handles     | constraints      | shape handles | yes           | grid colSpan/rowSpan only            | Freeform resize, all handles      |
| Layers panel       | left sidebar     | —             | —             | `WidgetTreePanel`                    | **Done** (basic)                  |
| Components library | design system    | —             | —             | `ComponentPalettePanel`              | Published components              |
| Asset library      | media + symbols  | —             | —             | `AssetLibraryPanel` (images)         | SVG, symbols, picker in inspector |
| Property panel     | right inspector  | style panel   | —             | `WidgetInspectorPanel`               | Asset picker, tokens              |
| Undo / redo        | yes              | yes           | yes           | `widget-patch-history` + editor sync | **Done** (Iteration 2)            |
| JSON persistence   | transit / file   | snapshot      | `.excalidraw` | `formatWidgetJson` + localStorage    | File envelope + schema version    |
| Templates          | libraries        | —             | —             | toolbar starter buttons              | Canva gallery UX                  |
| Collaboration      | yes              | multiplayer   | —             | none                                 | Deferred (correct)                |

## Iteration roadmap

### Iteration 2 — Editor reliability (Phase 1 completion)

**Goal:** Phase 1 exit criteria — trustworthy edit loop before Figma parity features.

| Feature                | Reference study                            | Target module                                                                               |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Undo / redo            | Penpot `history` / tldraw `Editor.history` | `packages/json-widget/src/widget-patch-history.ts` (new), wire in `useJsonWidgetEditorSync` |
| Keyboard shortcuts     | Figma V/H, Del, Ctrl+Z                     | `packages/react/src/authoring/authoring-shortcuts.ts`                                       |
| Inspector asset picker | Penpot assets panel                        | `WidgetInspectorPanel` image `src` field → asset browser                                    |
| Commit Iteration 1     | —                                          | `apps/widget-authoring/` + `WidgetAuthoringWorkbench`                                       |

**Penpot modules:** `frontend/src/app/main/data/history.cljs`, change tracking on shapes.

**tldraw patterns:** `useCanUndo` / `useCanRedo` hooks; batch pointer moves into single history mark.

### Iteration 3 — Canvas UX parity (tldraw primary)

**Goal:** tldraw-grade manipulation on widget tree (not shape store).

| Feature                      | Reference study                              | Target module                                                                                          |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Multi-select                 | tldraw `Editor.getSelectedShapeIds`          | `useJsonWidgetEditorSync` selection → `Set<pathKey>`                                                   |
| Marquee selection            | tldraw `BrushSession`                        | `JsonWidgetPreviewCanvas` overlay                                                                      |
| Snap + alignment guides      | Figma / Penpot snap                          | `packages/react/src/authoring/snap-guides.ts`                                                          |
| Freeform `stack` positioning | Penpot flex / absolute                       | extend `stack` child `left`/`top` for all types                                                        |
| Tool modes (select / hand)   | tldraw tools                                 | `PreviewZoomToolbar` tool toggle                                                                       |
| Left palette (Canva)         | Canva sidebar (add-first, not inspect-first) | move Components + Assets to **left** `WidgetEditorSidePanel`; right panel = contextual properties only |
| Simplified inspector mode    | Canva top toolbar + minimal right panel      | hide raw JSON by default; "Advanced" accordion for `code` mode                                         |
| Template-first empty state   | Canva home / blank-canvas CTA                | replace toolbar starter buttons with gallery cards + "Start blank"                                     |

**Penpot modules:** `workspace_viewport`, `snap`, `guides`.

**Excalidraw lesson:** store only serializable props; transient drag state stays in React refs (already in `PlaygroundEditorWidgetWrapper`).

### Iteration 4 — Component system (Phase 2)

**Goal:** reusable published widgets (Figma components / Webflow symbols).

| Feature                   | Reference study         | Target module                                    |
| ------------------------- | ----------------------- | ------------------------------------------------ |
| Component definition file | Penpot `component-file` | `packages/json-widget/src/component-registry.ts` |
| Instance + overrides      | Penpot instances        | `type: 'component-instance'` widget + patch ops  |
| Detach / reset overrides  | Figma                   | inspector actions on instance                    |
| Symbol from selection     | Figma                   | toolbar "Create component"                       |

**Penpot modules:** `components.cljs`, `variants.cljs`, library sync.

### Iteration 5 — Templates & presets (Phase 3, Canva UX)

| Feature                       | Reference study                            | Target module                                                      |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Template-first landing        | Canva home ("What will you design today?") | `TemplateGallery` as **default route** before editor               |
| Template gallery (cards)      | Canva category rows + hover preview        | `apps/widget-authoring/src/features/templates/TemplateGallery.tsx` |
| Categories + search           | Canva filter chips + global search         | reuse `FilterBar`; search across name + tags                       |
| Customize from template       | Canva one-click → editable doc             | extend `PLAYGROUND_STARTER_TEMPLATES`; clone on select             |
| Brand kit lite (optional)     | Canva Brand Kit (colors/fonts)             | `@workbench-kit/tokens` preset picker in toolbar                   |
| Export bundle (JSON + assets) | Canva Download + Webflow export            | `exportAuthoringBundle()` in app                                   |

**Canva UX specs (Iteration 5):**

- **Landing:** hero + category cards (Launcher, Dashboard, Minimal, …) + recent projects row; no blank canvas as default.
- **Gallery card:** thumbnail, title, tag chips; click = load clone; secondary "Preview" opens read-only modal.
- **Search:** single field filters templates by title/tag; empty state suggests top categories.
- **Onboarding:** first visit tooltip on "Pick a template" only; skip JSON/code tour.

### Iteration 6 — Runtime output bridge (Webflow / Framer)

| Feature                  | Reference study | Target module                                    |
| ------------------------ | --------------- | ------------------------------------------------ |
| React code preview       | Penpot code tab | `packages/react/src/json-widget/code-export/`    |
| Launchpad / tile runtime | Webflow publish | custom_launcher `launchpad-source-widget-bridge` |
| Design tokens            | Penpot tokens   | `@workbench-kit/tokens` integration in inspector |

### Iteration 7+ — Collaboration (explicitly later)

Penpot `rpc` / presence — **only after** file format + patch history stable. Not before Iteration 5.

## Study order (mapped to iterations) — non-expert product priority

> **Product stance:** Widget Authoring Studio targets regular users customizing tiles/launcher screens, not professional designers. **Canva UX outweighs Figma** for layout, onboarding, and property editing decisions.

1. **Canva UX** — template-first landing, left add-panel, simplified properties, fast export → Iterations 3, 5 (+ early empty-state / inspector)
2. **Penpot source** — file format, components, history, layers tree → Iterations 2, 4, 6
3. **tldraw UX** — camera, selection, tools, history marks → Iterations 2–3
4. **Excalidraw storage** — JSON schema versioning, file envelope → Iteration 2 (persistence)
5. **Webflow** — component → runtime output → Iteration 6
6. **Figma UX mimic** (last) — multi-select polish, snap guides, pro shortcuts → Iterations 2–3 only where Canva patterns are insufficient

### Canva patterns to adopt early (before Iteration 5)

| Pattern               | Canva behavior                                    | Widget Authoring target                                                   |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Add-first left panel  | Elements / Text / Uploads tabs add content        | Move Components + Assets to **left**; Inspector stays right               |
| Upload and place      | Uploads tab → click or drag to canvas             | **Done** (Iter 1); add search within uploads                              |
| Contextual properties | Top toolbar + minimal panel on select             | `WidgetInspectorPanel` shows 3–5 fields per widget type; JSON in Advanced |
| Empty canvas CTA      | "Start with a template" prominent                 | Extend Iter 1 empty CTA → link to gallery                                 |
| Size presets          | Document type picker (Instagram, Presentation, …) | **Done** (phone/tablet/desktop presets)                                   |
| One-click theme       | Brand Kit color row applies palette               | Token preset row in toolbar (Iteration 3+)                                |

### Reference role split (when to use each)

| Reference  | Use for                                                                | Avoid for                                       |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| **Canva**  | Onboarding, templates, drag-drop, non-expert property UI, export/share | Component graph, patch history, code export     |
| **Penpot** | Document model, components/instances, layers, undo, file format        | Beginner onboarding copy, template marketing UX |
| **tldraw** | Canvas camera, selection handles, tool modes                           | Template gallery, brand kit                     |
| **Figma**  | Snap guides, keyboard shortcuts, multi-select polish                   | Default inspector density, first-run flow       |

## File map (where work lives)

```
packages/json-widget/src/            # WidgetPatch, parse, tree ops (KEEP)
packages/react/src/authoring/        # Palette, presets, drop protocol, side panels
packages/react/src/json-widget/      # Editor, canvas, generic renderer (ENHANCE)
  JsonWidgetEditor.tsx               # Shell: code | preview | tree | side panel
  JsonWidgetPreviewCanvas.tsx        # Viewport host + drop target
  playground/                        # Demo registry, WidgetAuthoringWorkbench, playground renderer
apps/widget-authoring/               # Standalone studio (assets, templates, chat, persistence)
docs/workbench/                      # Strategy docs (this file)
```

## Iteration 1 dependencies (before Iteration 2)

- [ ] Commit `apps/widget-authoring` + `WidgetAuthoringWorkbench` to git
- [ ] CI: add `dev:widget-authoring` build/typecheck gate
- [ ] Inspector image `src` asset picker (listed in ITERATION_LOG as medium — blocks polished asset workflow)
- [ ] SVG import (optional; can slip to Iteration 3)

## Verification per iteration

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @workbench-kit/react test
pnpm storybook  # JsonWidget/Playground, WidgetAuthoring stories
pnpm dev:widget-authoring  # manual: upload → drag → inspect → export JSON
```

## Related docs

- [FOUNDATION.md](./FOUNDATION.md) — **authoritative restart direction** (read first)
- [apps/widget-authoring/ITERATION_LOG.md](../../apps/widget-authoring/ITERATION_LOG.md)
- [strengths-inheritance.md](./strengths-inheritance.md)
- [reference-implementation-strategy.md](./reference-implementation-strategy.md)
- [json-widget-port-then-replace.md](./json-widget-port-then-replace.md)
