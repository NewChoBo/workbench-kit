# Consumer Integration Backlog

**Status:** Active reference backlog  
**Last updated:** 2026-07-03  
**Source:** Workbench Kit adoption work driven by a desktop launcher consumer (library browse, ContentHub shell, provider integrations).

## Purpose

This document tracks Workbench Kit features and improvements identified while integrating a reference desktop consumer. Items are product-neutral: they describe reusable kit surfaces, not consumer-specific domain logic.

Use this backlog when:

- Prioritizing `@workbench-kit/react` primitives ahead of consumer-local UI.
- Deciding whether a consumer adapter (`tilepaper-ui`, renderer host) should stay local or move into the kit.
- Planning Storybook / `workbench-sample` coverage for library and shell flows.

Related kit docs: [current-state.md](./current-state.md), [future-capabilities.md](./future-capabilities.md), [layout-css-improvement-plan-2026-06-20.md](./layout-css-improvement-plan-2026-06-20.md).

---

## Completed in session

Landings below are merged in `workbench-kit` unless noted as **uncommitted WIP** in the working tree.

| Item                           | Package / API                                                                        | Commit (when merged)                                   | Notes                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Shell chrome design tokens     | `@workbench-kit/tokens` (`--shell-*` spacing, typography, radius)                    | `fd0f0ab8`                                             | Consumed by react layout and catalog/detail CSS.                                         |
| Library detail layout shell    | `@workbench-kit/react` `LibraryDetailLayout`, `RecordMediaHero`                      | `72fd856b`                                             | Modes: `banner`, `background`, `compact`; detail hero tokens in `primitives/styles.css`. |
| Media placeholder policy       | `useWorkbenchMediaImage`, `CatalogBrowseCard`, `WorkbenchThumbnail`                  | `e8575c5b`, `72fd856b`                                 | Codicon fallback on missing/error URLs; stable aspect boxes.                             |
| Editor tab strip DnD hook      | `@workbench-kit/react/editor-tabs` `useEditorTabsStripDnd`                           | `4914824e`                                             | Deduped consumer-local tab reorder logic.                                                |
| `FilterBarRow` export          | `@workbench-kit/react/primitives`, `@workbench-kit/react/layout`                     | `490ea1e7`                                             | Filter strip rows available from primitives barrel.                                      |
| Compact sidebar action bar     | `@workbench-kit/react/layout` `SidebarActionIconBar`                                 | `4914824e`                                             | Overflow menu for dense primary sidebar chrome.                                          |
| Catalog browse card primitive  | `@workbench-kit/react/primitives` `CatalogBrowseCard`                                | `e8575c5b`                                             | Grid `cover` / `poster` variants for library tiles.                                      |
| Integration management shell   | `@workbench-kit/react/workbench/management` `IntegrationsShell` and related surfaces | `a01116a1`                                             | Provider/settings framing for integrations UI.                                           |
| Official subpath exports       | `@workbench-kit/react` `./layout`, `./editor-tabs`, `./overlay`                      | `1fc6d99d`+ (exports in `packages/react/package.json`) | Reduces need for deep imports; consumer may still use local type shims until removed.    |
| Dev host port split            | Root `pnpm dev` (sample `65173`), `pnpm dev:storybook` (`61009`), `pnpm dev:all`     | `adb6d9ae`, `ba83b4c9`                                 | `scripts/dev-workbench.mjs` modes: `sample`, `storybook`, `all`.                         |
| Epic launcher protocol mapping | `@workbench-kit/contracts`                                                           | `8518bad5`                                             | Launch URL contract for Epic Games (consumer execution path).                            |
| Split / sidebar collapse fixes | `@workbench-kit/react` layout CSS                                                    | `a74ea77b`, `22510e6c`, `5a96a196`                     | Height fill when sidebars collapse.                                                      |
| Library detail Storybook       | `examples/workbench-sample` `LibraryDetailLayout.stories.tsx`                        | `72fd856b` (kit stories) + sample story                | Banner/background demo wired in sample host.                                             |

### In progress (local WIP, not yet committed)

| Item                           | Package / API                                                                              | Status                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scroll-area infinite load hook | `@workbench-kit/react/primitives` `useScrollAreaInfiniteLoad`                              | Implemented and exported from primitives barrel; **no unit test file committed**; consumer catalog still uses explicit **Load more** button.      |
| Platform window chrome         | `WorkbenchPlatformProvider`, `WorkbenchWindowChromeControls`, `workbenchPlatformChrome.ts` | Darwin traffic lights + Win32 caption buttons; wired into `WorkbenchThemeProvider`, `ModalTitlebar`, `WorkbenchDesktopTitleBar`; **uncommitted**. |

---

## High priority pending

Blocks library browse UX parity and reduces consumer shim surface.

### 1. Publish scroll-area infinite load

| Field                  | Detail                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Commit `useScrollAreaInfiniteLoad` with Vitest coverage. Hook uses `IntersectionObserver` rooted on `.ui-scroll-area` (or an explicit ref). |
| **Consumer pain**      | Catalog grid/list uses manual **Load more**; Steam-style endless scroll needs shared observer lifecycle and in-flight guard.                |
| **Suggested package**  | `@workbench-kit/react/primitives` — export hook + document sentinel placement inside `ScrollArea`.                                          |
| **Storybook / sample** | Add `ScrollArea` + catalog grid story showing automatic pagination.                                                                         |

### 2. Generic `LibraryCatalogBrowsePane`

| Field                  | Detail                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Description**        | Product-neutral pane: view-mode toggle (`SegmentedControl`), optional facet strip slot, `ScrollArea` + grid (`CatalogBrowseCard`) / list (`List` + `WorkbenchThumbnail`), empty/loading/error states, infinite scroll or load-more footer. |
| **Consumer pain**      | `TilepaperKitLibraryCatalogBrowsePane` duplicates kit layout/CSS; every consumer rebuilds the same browse frame.                                                                                                                           |
| **Suggested package**  | `@workbench-kit/react/primitives` or `@workbench-kit/react/layout` — headless-ish props for items, `onOpenItem`, `onLoadMore`, `facetStrip?: ReactNode`.                                                                                   |
| **Storybook / sample** | `workbench-sample` route: mock catalog with 100+ items and infinite scroll.                                                                                                                                                                |

### 3. Steam-style `LibraryFacetFilterPanel`

| Field                  | Detail                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Description**        | Multi-section facet panel for modal or expandable strip: grouped checkboxes/chips per field, active chip row, clear-all, show more/less for secondary fields. Data-agnostic field descriptor + selected value map. |
| **Consumer pain**      | `TilepaperKitLibraryFacetFilterStrip` is product-local; filter dialog UX was removed from consumer and needs a kit-owned dialog primitive to return safely.                                                        |
| **Suggested package**  | `@workbench-kit/react/primitives` `LibraryFacetFilterPanel` + optional `LibraryFacetFilterDialog` (overlay).                                                                                                       |
| **Storybook / sample** | Story with provider/platform/genre sections; play test for toggle + chip removal.                                                                                                                                  |

### 4. Remove consumer type shims for official exports

| Field                  | Detail                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Consumer `shared/types/workbench-kit/react-*.d.ts` and `tsconfig` path overrides exist because linked package typing was brittle. Kit now exports `./layout`, `./editor-tabs`, `./overlay`, `./modal`, etc. |
| **Consumer pain**      | Duplicate declaration files drift from kit source; new exports require shim updates.                                                                                                                        |
| **Suggested package**  | Kit: keep `check:public-exports` green. Consumer: delete shims and import from published subpaths once typing is stable.                                                                                    |
| **Storybook / sample** | N/A — consumer migration task; document in consumer foundation plan.                                                                                                                                        |

### 5. `exactOptionalPropertyTypes` compatibility for linked consumers

| Field                  | Detail                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Description**        | Consumer enables `exactOptionalPropertyTypes`; kit props often use `prop?: T \| undefined`. Consumer currently uses `tsconfig.workbench-linked.json` with the flag disabled for kit paths. |
| **Consumer pain**      | Type errors on otherwise valid kit usage; forces split tsconfig or `as` casts at boundaries.                                                                                               |
| **Suggested package**  | `@workbench-kit/react` — audit exported props; prefer explicit optional fields or helper types (`                                                                                          | undefined` only where required). |
| **Storybook / sample** | Add typecheck job variant with `exactOptionalPropertyTypes: true` in CI or consumer contract smoke.                                                                                        |

### 6. Platform window chrome (finish and document)

| Field                  | Detail                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Land WIP: `WorkbenchPlatformProvider`, `WorkbenchWindowChromeControls`, modal + desktop titlebar integration, `workbench-platform-chrome.css`. |
| **Consumer pain**      | Electron frameless/custom chrome hosts need darwin vs win32 control placement without forking modal/titlebar markup.                           |
| **Suggested package**  | `@workbench-kit/react/workbench` exports + CSS imported from `styles.css` / workbench shell entry.                                             |
| **Storybook / sample** | Stories for `platform="darwin"` and `platform="win32"` on modal and desktop titlebar.                                                          |

---

## Medium priority

Generic components to extract from consumer adapters; improves reuse without blocking MVP browse.

### 7. Collapsible category tree (sidebar)

| Field                  | Detail                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Sidebar tree with expand/collapse, depth indentation, optional action icons — for library categories, collections, or provider groupings. |
| **Consumer pain**      | Library sidebar category UI is stubbed; hosts hand-roll tree markup on `SideBarList` / `Collapsible`.                                     |
| **Suggested package**  | `@workbench-kit/react/layout` — extend `SideBarViewFrame` tree helpers (`sideBarTreeDepthStyle`) into `SideBarTree` / `SideBarTreeItem`.  |
| **Storybook / sample** | Sidebar panel story with nested categories and selection.                                                                                 |

### 8. Facet filter strip (inline, non-modal)

| Field                  | Detail                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Lighter-weight inline strip built on `FilterBar` / `FilterBarRow` / `FilterChip` for primary facets + active chips (consumer strip behavior without domain DTOs). |
| **Consumer pain**      | `TilepaperKitLibraryFacetFilterStrip` couples to `LibraryFilterFieldDto`.                                                                                         |
| **Suggested package**  | `@workbench-kit/react/primitives` — generic strip accepting `fields: { id, label, options[] }[]`.                                                                 |
| **Storybook / sample** | Pair with catalog browse sample.                                                                                                                                  |

### 9. `LibraryDetailLayout` compact mode in sidebar

| Field                  | Detail                                                                       |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Description**        | `compact` mode for sidebar item preview (small cover + one-line meta).       |
| **Consumer pain**      | Sidebar preview still uses catalog list rows instead of detail preview slot. |
| **Suggested package**  | `@workbench-kit/react/primitives` `LibraryDetailLayout` `mode="compact"`.    |
| **Storybook / sample** | Sidebar + detail split story (Playnite/Steam reference pattern).             |

### 10. Media gallery region (deferred detail slot)

| Field                  | Detail                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Description**        | Optional `mediaGallery` slot on detail layout for screenshots/trailers carousel.                         |
| **Consumer pain**      | Detail DTO has no gallery yet; layout contract should reserve region before consumer wires Steam assets. |
| **Suggested package**  | `@workbench-kit/react/primitives` `LibraryDetailLayout` children region or named slot.                   |
| **Storybook / sample** | Placeholder gallery with static images.                                                                  |

### 11. Workbench-sample integration demos

| Field                  | Detail                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Sample host demos beyond `LibraryDetailLayout`: catalog browse, facet filter dialog, platform chrome, integrations shell with mock providers.       |
| **Consumer pain**      | Consumer dogfoods unfinished APIs; regressions found late in Electron shell.                                                                        |
| **Suggested package**  | `examples/workbench-sample` routes + Storybook entries; update [storybook-e2e-coverage.md](./storybook-e2e-coverage.md) when flows become required. |
| **Storybook / sample** | Primary deliverable for this item.                                                                                                                  |

### 12. Consolidate editor-area DnD surface

| Field                  | Detail                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Tab strip DnD lives in `@workbench-kit/react`; `shell-react` `editor-area-dnd.ts` re-exports react helpers and keeps shell-only group drop helpers. Evaluate moving remaining helpers to react or a shared `@workbench-kit/workbench-dnd` module. |
| **Consumer pain**      | Consumers importing from `shell-react` vs `react/editor-tabs` see split ownership.                                                                                                                                                                |
| **Suggested package**  | `@workbench-kit/react/workbench` or `workbench-core` for pure drop-side math; `shell-react` imports only.                                                                                                                                         |
| **Storybook / sample** | Existing editor tab stories + shell editor-area plays.                                                                                                                                                                                            |

---

## Long-term

### 13. `WorkbenchHostContext` (platform + host ports)

| Field                  | Detail                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Extend platform context with optional host ports: desktop bridge base URL, dev server ports, feature flags, native window controls callbacks. Distinct from `WorkbenchPlatformProvider` (OS chrome only). |
| **Consumer pain**      | Electron preload bridge, VS Code webview, and browser sample each wire ports differently with ad hoc props.                                                                                               |
| **Suggested package**  | `@workbench-kit/react/workbench` context + `@workbench-kit/contracts` DTOs for bridge metadata.                                                                                                           |
| **Storybook / sample** | Sample host injects mock bridge; document in [sample-host-backend-api.md](./sample-host-backend-api.md).                                                                                                  |

### 14. Theme pack / per-surface token overrides

| Field                  | Detail                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | User-selectable detail hero sizing (`--shell-detail-hero-cover-width`, band height), catalog density, sidebar compactness via theme preset or CSS variable pack. |
| **Consumer pain**      | Product maps app settings to kit presets manually; detail hero tokens are fixed defaults.                                                                        |
| **Suggested package**  | `@workbench-kit/tokens` + `WorkbenchThemeProvider` attribute API — see [theme-pack-architecture.md](./theme-pack-architecture.md).                               |
| **Storybook / sample** | Theme switcher story toggling detail/catalog density.                                                                                                            |

### 15. Electron host shell package

| Field                  | Detail                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**        | Optional `@workbench-kit/electron-shell` (or sample-only module): frameless window, IPC titlebar, tray, multi-window restore — without pulling Electron into `react`. |
| **Consumer pain**      | Each Electron consumer reimplements titlebar IPC and restore policy.                                                                                                  |
| **Suggested package**  | New app-layer package or documented sample in `examples/` only until API stabilizes.                                                                                  |
| **Storybook / sample** | N/A in browser Storybook; electron sample app when scope is explicit.                                                                                                 |

### 16. Collection / dynamic collection save UI

| Field                  | Detail                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Description**        | Generic save-collection dialog, rule builder UI, and pinned collection chips for library views.      |
| **Consumer pain**      | Domain-specific collection model lives in consumer; no shared save UX.                               |
| **Suggested package**  | Defer until collection contract is extracted to `@workbench-kit/contracts` or consumer-neutral core. |
| **Storybook / sample** | Deferred — track in [future-capabilities.md](./future-capabilities.md) when contract exists.         |

### 17. Published `@prototype` consumer CI

| Field                  | Detail                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Description**        | Consumer CI consumes published `@workbench-kit/*@prototype` instead of sibling `file:` checkout. |
| **Consumer pain**      | Local-only path aliases and shim files mask publish gaps.                                        |
| **Suggested package**  | Release process — see [npm-release.md](../conventions/npm-release.md).                           |
| **Storybook / sample** | Consumer CI change; kit publishes all `NPM_PUBLISH_ORDER` packages together.                     |

---

## Summary counts

| Priority              | Count | Focus                                                                                 |
| --------------------- | ----- | ------------------------------------------------------------------------------------- |
| Completed (merged)    | 13    | Tokens, library detail, media, DnD, sidebar actions, integrations, exports, dev ports |
| In progress (WIP)     | 2     | Infinite scroll hook, platform chrome                                                 |
| High priority pending | 6     | Catalog pane, facet panel, shims, strict types, chrome finish                         |
| Medium priority       | 6     | Category tree, facet strip, compact detail, gallery, samples, DnD consolidation       |
| Long-term             | 5     | Host context, theme packs, electron shell, collections, published CI                  |

---

## Maintenance

- When an item ships, move it to **Completed** with commit hash and remove duplicate entries from [todo.md](./todo.md) or [future-capabilities.md](./future-capabilities.md).
- New consumer-driven gaps: add a row with consumer pain stated generically (no product trademark in public kit docs per [public-reference-policy.md](../conventions/public-reference-policy.md)).
- Verify kit status against `packages/react/src` before marking **Done** — uncommitted files are not release truth.
