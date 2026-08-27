# Consumer Capabilities Reference

- **Status:** Active consumer contract
- **Last updated:** 2026-08-06
- **Audience:** Host applications that compose `@workbench-kit/react` (browser, desktop, VS Code webviews, sample host)

This document is the **integration contract** for reusable workbench UI. It inventories primitives and shell surfaces that a reference desktop consumer actually wires today. It is not a Storybook catalog — use Storybook and `examples/workbench-sample` for visual exploration.

Related: [Consumer Integration Backlog](./consumer-integration-backlog.md) ·
[Explorer Selection Policy](./explorer-selection-policy.md) ·
[Getting Started](../guides/getting-started.md) ·
[Component Map](../guides/component-map.md) ·
[Sample Screens](../guides/sample-screens.md) ·
[API Reference](../guides/api-reference.md) ·
[Workbench Change Guidelines](./workbench-change-guidelines.md)

---

## How to import

Use official subpath exports from `@workbench-kit/react`. Do not import from `packages/react/src/...` in consuming apps.

| Subpath                                                     | Purpose                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@workbench-kit/react`                                      | Root barrel — includes typed drag MIME helpers (`createTypedDragMime`) |
| `@workbench-kit/react/drag-mime`                            | Leaf — `createTypedDragMime` / `createStringDragMime`                  |
| `@workbench-kit/react/primitives`                           | Controls, editor chrome, library layout, scroll, property grids        |
| `@workbench-kit/platform/versioned-browser-state`           | Leaf — `createVersionedBrowserStateAdapter`                            |
| `@workbench-kit/platform/resize-rect`                       | Leaf — `resizeRect`                                                    |
| `@workbench-kit/platform/tray-close-policy`                 | Leaf — tray hide/quit helpers                                          |
| `@workbench-kit/shell-react/layout-storage`                 | Leaf — framework-free layout persistence helpers                       |
| `@workbench-kit/shell-react/provider`                       | Leaf — host context and extension inventory                            |
| `@workbench-kit/shell-react/host-shell`                     | Leaf — product-owned content slots with Kit layout/chrome              |
| `@workbench-kit/shell-react/keybinding-management-settings` | Leaf — provider-free keyboard shortcut management Settings View        |
| `@workbench-kit/shell-react/shell`                          | Leaf — assembled shell without an implicit editor                      |
| `@workbench-kit/shell-react/command-host`                   | Leaf — command host orchestration                                      |
| `@workbench-kit/shell-react/command-host-controller`        | Leaf — provider-free Command Palette and Quick Open controller         |
| `@workbench-kit/shell-react/command-palette`                | Leaf — shortcut and palette helpers                                    |
| `@workbench-kit/shell-react/command-descriptors`            | Leaf — resolved command descriptor hook                                |
| `@workbench-kit/shell-react/registry-command-descriptors`   | Leaf — provider-free descriptor hook for a host-owned registry         |
| `@workbench-kit/workbench-core/layout`                      | Leaf — framework-free layout state                                     |
| `@workbench-kit/workbench-core/storage`                     | Leaf — storage reader/writer contracts                                 |
| `@workbench-kit/platform/atomic-write`                      | Leaf — Node `atomicWriteText`                                          |
| `@workbench-kit/react/layout`                               | Sidebar/editor frames, section stacks, controlled preview canvas       |
| `@workbench-kit/react/editor-tabs`                          | Tab strip drag-and-drop helpers                                        |
| `@workbench-kit/react/overlay`                              | Context menus; anchored overlay panel positioning helper               |
| `@workbench-kit/react/modal`                                | Low-level modal frame (prefer management wrapper when applicable)      |
| `@workbench-kit/react/workbench/shell`                      | Activity bar, shell layout, view editor, title bar                     |
| `@workbench-kit/react/workbench/standalone`                 | Assembled standalone shell and host bootstrap/state contracts          |
| `@workbench-kit/react/workbench/command-ui`                 | Command palette, Quick Open, shortcut bridge                           |
| `@workbench-kit/react/workbench/theme`                      | Theme resolution and controlled theme hook                             |
| `@workbench-kit/react/workbench/chat`                       | Chat panel, composer, message list/item, conversation bar              |
| `@workbench-kit/react/workbench/management`                 | Dialog frames, integrations shell, notices                             |
| `@workbench-kit/react/workbench/workspace`                  | Workspace explorer, editor panel, selection helpers                    |
| `@workbench-kit/workspace`                                  | Pure path/selection/virtual-workspace helpers (no React)               |
| `@workbench-kit/contracts`                                  | Cross-host DTOs and capability contracts                               |

Import `@workbench-kit/react/styles/core.css` for the broad Workbench feature set, or
`@workbench-kit/react/styles.css` when Auth or Chat is rendered. A non-shell route can
compose `styles/foundation.css` + `styles/overlay.css` when its React components already
provide their co-located leaf styles. Workbench shell routes should retain `core.css`;
the focused entries deliberately omit unrelated feature hubs. See the React package
README for the exact ownership matrix.

---

## Shell and editor chrome

### `WorkbenchShell`

**Purpose:** Top-level workbench grid: activity bar, primary sidebar slot, editor region, optional status bar and overlays.

**Key props:** `activityBar`, `activityBarPosition` (`left` \| `top`), `sidebar`, `editor`, `overlays`, `statusBar`, layout/collapse callbacks (see `WorkbenchShellProps`).

**When to use:** Any host that needs VS Code–shaped shell layout.

**When not to use:** Single-panel dialogs or embedded property sheets — use `WorkbenchEditorFrame` or `Modal` instead.

**VS Code analogue:** `Workbench` grid with `ActivityBar`, `SideBarPart`, `EditorPart`.

**Consumer pattern:** Host passes React nodes for sidebar/editor; keeps routing and IPC outside the kit. `WorkbenchShell` does not create `EditorArea` implicitly, so products only pay for the editor implementation they choose.

---

### `WorkbenchViewEditor`

**Purpose:** Editor region frame with optional tab strip slot and scrollable body.

**Key props:** `tabs` (usually `EditorTabs`), `children` or `emptyState`, `bodyProps`, `data-*` attributes for host telemetry.

**When to use:** Primary editor area below the unified tab bar.

**When not to use:** Modal bodies — use `WorkbenchEditorFrame` inside `WorkbenchDialogFrame`.

**VS Code analogue:** `EditorGroupView` + editor pane container.

---

### `WorkbenchDesktopTitleBar` / `WorkbenchWindowChromeControls` / `useWorkbenchModalViewState`

**Purpose:** Frameless window title bar, platform-aware caption controls, and modal view routing (e.g. settings opened from activity bar).

**Key props:**

| Surface                    | Props                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkbenchThemeProvider`   | `platform` (`darwin` \| `win32` \| `linux`) — sets host platform context + `data-workbench-platform`                                                                                                                                            |
| `WorkbenchDesktopTitleBar` | `chrome` (`platform` default \| `generic`), `leading` / `centerSlot` / `trailing`, `windowControls`                                                                                                                                             |
| `windowControls`           | Host callbacks only: `onMinimize`, `onToggleMaximized`, `onClose`, `isMaximized`, optional labels                                                                                                                                               |
| Title-bar layout toggles   | `WorkbenchShellTitleBarLayoutControls`: omit `onTogglePanel` / `onToggleAuxiliarySidebar` to hide those buttons. `WorkbenchShell` (`@workbench-kit/shell-react`): `showPanelLayoutToggle` / `showAuxiliarySidebarLayoutToggle` (default `true`) |

**I/O contract:** Kit owns chrome markup and darwin/win32 placement. Hosts supply Electron (or similar) IPC callbacks and optional i18n labels — do not fork titlebar markup in the renderer.

**Maximized modals:** Pass `overlays` into `WorkbenchShell`. Modals render inside `.ide-workbench-overlays` (below the title bar, above the workbench body) and maximize to `100%` of that surface — no viewport `calc()` or title bar z-index overrides.

**VS Code analogue:** Custom title bar + command-driven view switching.

---

### `ActivityBar`, `WorkbenchViewSidebar`, `createWorkbenchShellActivityBarFromViewModel`

**Purpose:** Left or top activity bar icons and per-view sidebar chrome.

**Key props:** `activityBarPosition` on `WorkbenchShell` (`left` default, `top` for a horizontal strip below the title bar). Footer/utility icons stay at the trailing edge (bottom when vertical, right when horizontal).

**Sidebar view placement DnD:** `ActivityBar` and `SidebarActionIconBar` share the placement drag payload (`WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE`). Hosts move a view container between sidebar slots with `onSidebarViewPlacementDrop` plus optional `acceptSidebarViewPlacementDrop` (defaults to cross-bar drops only so local reorder keeps working). Shell-level drop targets can use `useWorkbenchSidebarViewPlacementDropZone` from `@workbench-kit/react/workbench/shell`.

**Typed drag MIME helpers:** For host-owned custom MIME payloads (catalog ids, content refs), use `createTypedDragMime` / `createStringDragMime` from `@workbench-kit/react`, `@workbench-kit/react/workbench`, or the leaf subpath `@workbench-kit/react/drag-mime` (preferred for Node strip-types / narrow host tests). Hosts supply the MIME string and codecs; kit owns write/read/has guards, optional `text/plain` fallback, and default `effectAllowed: 'copyMove'`. Plaintext alone never satisfies `has()` — do not treat fallback text as authoritative for privileged drops without host checks.

**Section model:** `buildWorkbenchViewActivityBarModel({ sectionIds: ['core'], footerSectionIds: ['utility'] })` maps contributions to top vs bottom slots.

| Section   | Slot                   | Typical role                                       | Presentation                                                                |
| --------- | ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| `core`    | Top (`items`)          | Primary view containers (sidebar + editor routing) | Host `navigate()` → primary sidebar                                         |
| `utility` | Bottom (`footerItems`) | Global chrome (settings, profile, help entry)      | Host decides: modal (`useWorkbenchModalViewState`), sidebar nav, or overlay |

Utility placement does **not** imply modal-only — host routing chooses the surface.

**When not to use:** In-pane toolbars — use `Toolbar` or `SidebarActionIconBar`.

---

## Monaco editor

### `WorkbenchMonacoEditor` · `@workbench-kit/monaco`

**Purpose:** VS Code–aligned Monaco surface with workbench theme sync (chrome colors **and**
syntax `tokenColors` rules), JSON/TS diagnostics helpers, and read-only mode.

**Key props:** `language`, `value`, `readOnly`, `theme` (`light` \| `dark`), `path` (model identity), `options`, `onMount`.

**Theme sync:**

- `useMonacoWorkbenchThemeSync` / `defineMonacoWorkbenchTheme` re-apply chrome colors and
  default syntax rules when `data-theme` / `data-theme-preset` change (no remount required).
- Hosts may register richer rules via `setWorkbenchMonacoTokenRules` or call
  `defineOrUpdateWorkbenchMonacoTheme(themeId, { base, colors, rules })`.
- `monacoRulesFromTokenColors` maps a VS Code–compatible `tokenColors` subset to Monaco rules.
- **Host responsibility:** TextMate / grammar packs stay host-owned. The kit themes Monaco’s
  built-in tokenizers; hosts that load custom grammars must supply matching token rules.

**When to use:** Read-only JSON inspectors (Admin Data detail), editable workspace JSON tabs (`WorkspaceEditor`), widget source panes.

**When not to use:** Short metadata labels — prefer `WorkbenchPropertyKeyValue`. Host must configure `MonacoEnvironment.getWorker` once at app entry (see `examples/workbench-sample/src/main.tsx`).

**Consumer pattern:** Host adapter configures workers; feature panes import `@workbench-kit/monaco` only — no direct `monaco-editor` imports in renderer business logic.

### `WorkbenchMonacoDiffEditor` · `@workbench-kit/monaco`

**Purpose:** Side-by-side DiffEditor wrapper aligned with `WorkbenchMonacoEditor` theming and
layout defaults for review/patch flows.

**Key props:** `original`, `modified`, `language`, `readOnly`, `theme` (`light` \| `dark`),
`onModifiedChange`, `originalModelPath` / `modifiedModelPath`, `options`, `onMount`.

**Behavior:**

- Reuses `prepareMonacoWorkbenchEditor` / workbench theme ids (same sync path as the single editor).
- Original pane stays non-editable by default; `readOnly` locks the modified pane.
- Models dispose with the DiffEditor unmount (`keepCurrent*Model` defaults remain false).

**When to use:** Host save/patch/review surfaces that previously imported raw Monaco DiffEditor.

**When not to use:** Full SCM UI (blame, staging) or multi-diff review tabs — those stay host-owned.

**Story:** `Workbench Sample/Monaco Diff Editor` - Review / patch (editor/main frame).

---

## Editor tabs and tab actions

### `EditorTabs`

**Purpose:** Horizontal editor tab strip with selection, close, preview/dirty indicators, optional DnD hooks.

**Key props:**

| Prop                  | Role                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tabs`                | `EditorTab[]` — `id`, `label`, `icon` / `iconImageUrl`, `closable`, `pinned`, `dirty`, `preview`, `dropPosition` |
| `activeId`            | Selected tab id                                                                                                  |
| `onSelect`, `onClose` | Tab lifecycle                                                                                                    |
| `addons`              | **Right-aligned action slot** — primary place for item-scoped actions when the active tab represents that item   |
| `onTabContextMenu`    | Host builds `ContextMenu` items                                                                                  |
| DnD event props       | Usually wired via `useEditorTabsStripDnd`                                                                        |

**When to use:** Any multi-document editor group.

**When not to use:** Sidebar list selection — use `List` / `SideBarList`.

**Do not duplicate:** A second horizontal button row inside the active editor body when actions belong to the active tab. Prefer `addons`.

**VS Code analogue:** `EditorTabsControl` + editor group toolbar (`addons` ≈ editor title actions / run controls).

---

### `WorkbenchEditorTabs`, `useWorkbenchEditorTabContextMenu`

**Purpose:** Editor tab strip with a built-in Close / Close others / Close to the right / Close
all context menu for `WorkbenchStandaloneShell` hosts that own tab state without pin, split, or
delete actions.

**Import:** `@workbench-kit/react/editor-tabs` or `@workbench-kit/react/workbench/shell`

**Key props / options:** Same as `EditorTabs`, plus optional `onCloseAll` / `onCloseOthers` /
`onCloseToRight` bulk-close overrides and `getExtraTabContextMenuItems`. Defaults call `onClose`
for the matching closable tabs (`closable !== false`). Additional items append after the built-in
close group rather than replacing it.

**When to use:** Standalone secondary-area tab bars that need the standard close menu with
minimal host glue.

**When not to use:** Full editor hosts that need pin / split / copy path / delete — use
`EditorTabs` + `createWorkbenchEditorTabMenuEntries` (or `shell-react` editor area).

**VS Code analogue:** Editor tab context menu close actions only.

---

### `ButtonGroup`, `Button`

**Purpose:** Compact grouped actions inside `EditorTabs.addons` or inline forms.

**Key props:** `Button`: `variant` (`primary` \| `default` \| `danger`), `secondary`, `icon`. `ButtonGroup`: `ariaLabel`, `role="toolbar"`.

---

### `useEditorTabsStripDnd`, `normalizeEditorTabReorderIndex`

**Purpose:** Shared tab reorder within one editor group (`groupId`, `tabs`, `onMoveTab`, `onSelectTab`).

**When not to use:** Cross-group editor splits — host must add drop targets separately.

**VS Code analogue:** Tab drag service within a group.

---

## Library detail

### `LibraryDetailLayout`

**Purpose:** Record detail shell: hero band (`background` / `banner` / `compact` / `hero-cover`), optional top `toolbar`, in-hero `actions`, scrollable body via `ScrollArea`.

**Key props:**

| Prop / slot                                           | Role                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `mode`                                                | `background` \| `banner` \| `compact` \| `hero-cover`                                  |
| `title`, `summary`                                    | Identity row (title + badges)                                                          |
| `backgroundImageUrl`, `coverImageUrl`, `logoImageUrl` | Hero media                                                                             |
| `heroImageUrl`                                        | Wide band for `hero-cover` (falls back to atmosphere-from-cover when absent/identical) |
| `attribution`                                         | Optional footer under the identity row (`hero-cover`)                                  |
| `description`                                         | Inline under hero (banner/compact/hero-cover)                                          |
| `actions`                                             | Buttons in hero band when no shared editor chrome exists                               |
| `toolbar`                                             | Optional row above hero (navigation) — avoid if editor tab bar already owns navigation |
| `children`                                            | Scrollable metadata sections                                                           |

**When to use:** Game/library record detail, metadata-heavy inspector panes.

**When not to use:** Catalog grid/list browse — use catalog primitives below.

**VS Code analogue:** Custom editor / webview with hero header + scrollable inspector (not built-in; pattern matches extension preview pages).

---

### `RecordMediaHero`, `WorkbenchMediaSlot`, `WorkbenchThumbnail`

**Purpose:** Stable-aspect media with codicon fallback on load failure.

| Component            | Use                                                             |
| -------------------- | --------------------------------------------------------------- |
| `RecordMediaHero`    | Hero band / cover (`layout`: `background`, `banner`, `compact`) |
| `WorkbenchMediaSlot` | Generic image slot (posters, tab icons)                         |
| `WorkbenchThumbnail` | Sized thumbnails (`size`: `library`, `icon`, etc.)              |

**When not to use:** Arbitrary `<img>` without fallback policy — breaks library UX consistency.

---

### `WorkbenchPropertySection`, `WorkbenchPropertyGrid`, `WorkbenchMetricGrid`, `WorkbenchPropertyKeyValue`

**Purpose:** Inspector-style labeled sections and key/value grids.

**Key props:** Section: `title`, optional `actions`, optional `collapsible` / `collapsed` /
`defaultCollapsed` / `onCollapsedChange` (disclosure chevron when collapsible), optional
`level` (`category` | `group`) for inspector hierarchy. Grid: `columns`, `gap`. KeyValue:
`name`, `value`.

**When to use:** About, stats, metadata, secondary `<details>` blocks in library detail;
collapsible category sections in authoring inspectors.

**When not to use:** Settings forms with validation — prefer `Field` / `SchemaForm` in `@workbench-kit/react/workbench/settings`.

**VS Code analogue:** Properties view / settings tree sections.

### `WorkbenchPropertySearch` + `filterWorkbenchPropertyFields`

**Purpose:** Declared-first inspector search — filter property fields by a host-owned
manifest (field id + resolved label + optional `sectionId` / keywords). No DOM scrape.

| API                                                | Role                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `WorkbenchPropertyFieldManifestEntry`              | `{ id, label, sectionId?, keywords? }`                                     |
| `filterWorkbenchPropertyFields({ fields, query })` | Token match → `{ fields, fieldIds, sectionIds }`                           |
| `isWorkbenchPropertySearchActive(query)`           | True when query is non-whitespace                                          |
| `WorkbenchPropertySearch`                          | Sticky FilterBar + ClearableTextInput chrome (default “Search properties”) |

**I/O contract:** Host owns which fields exist (product registry) and resolves labels
(i18n). Kit owns search chrome + pure filter. Hide sections whose `sectionId` is absent
from `sectionIds` after filter; show an empty state when `fieldIds` is empty and search
is active.

**When to use:** Authoring inspectors / Details panes with a declared field list.

**When not to use:** Free-text DOM label scraping, or catalog browse search
(`CatalogBrowsePane` / `FilterBar` on item lists).

### `WorkbenchPropertyOverrideLabel`

**Purpose:** Sparse-override inspector label chrome — Custom vs Default badge plus an
optional compact Reset action. Compose into `Field label={...}` or property rows.

| Prop                 | Role                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `label`              | Field title (`ReactNode`)                                          |
| `overridden`         | Host-computed override state — drives badge + Reset visibility     |
| `onReset?`           | Host handler; Reset renders only when `overridden` and this is set |
| `customBadgeLabel?`  | Default `"Custom"`                                                 |
| `defaultBadgeLabel?` | Default `"Default"`                                                |
| `resetLabel?`        | Default `"Reset"` — icon `aria-label` / text button children       |
| `resetAppearance?`   | `"icon"` (default) or `"text"`                                     |
| `resetIcon?`         | Icon Reset glyph; default `codicon-discard`                        |

**I/O contract:** Host owns which fields are overridden and what Reset writes. Kit owns
layout, badge variants (`accent` / `muted`), and the compact Reset control (`IconButton`
by default; optional text `Button`).

**When to use:** Settings / property inspectors with sparse overrides on top of defaults.

**When not to use:** Domain merge/clear algorithms, locale tables, or baking override into
`WorkbenchProperty*Row` APIs.

---

## Catalog browse

### `CatalogBrowsePane`

**Purpose:** Product-neutral catalog browse frame — search toolbar, optional
facet slot, sort + grid/list view mode, feedback states, `ScrollArea` body, and
infinite-load footer.

| Prop / slot                         | Role                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `items`                             | `CatalogBrowseItem[]` — kit presentational rows for default grid/list render           |
| `facetStrip`                        | `ReactNode` slot — `CatalogBrowseFacetChips`, `LibraryFacetFilterStrip`, or host chips |
| `renderGridItem` / `renderListItem` | Override default tiles/rows for product cards                                          |
| `viewMode` + `onViewModeChange`     | `grid` \| `list` via `SegmentedControl`                                                |
| `hasMore` / `onLoadMore`            | Wired through `useScrollAreaInfiniteLoad`                                              |

**`CatalogBrowseItem` fields:** `id`, `label`, optional `description` / `imageUrl` /
`imageAlt` / `meta`. Hosts map their domain summary onto this shape; keep provider
identity and merge models in the host — do not put them on the kit type.

**Composition helpers (same package):**

| Helper                     | Role                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `filterCatalogBrowseItems` | Client-side text filter over `label` / `meta` / `description` after host maps domain → items |
| `CatalogBrowseFacetChips`  | Single-select All + option chips for `facetStrip` (simple type/category filters)             |

Typical host flow: map domain → `CatalogBrowseItem[]` → optional domain facet →
`filterCatalogBrowseItems(items, searchQuery)` → pass into `CatalogBrowsePane`.

**When to use:** Main editor catalog browse surfaces that share FilterBar + scroll layout.

**When not to use:** Sidebar-only compact lists — compose `FilterBar` + `List` locally, or keep a host sidebar pane. Domain models stay in the host.

### `LibraryFacetFilterStrip`

**Purpose:** Compact facet filter control for catalog toolbars — filter icon trigger,
cascade field menus, clear-all, and show more/less for secondary fields.

| Prop / type          | Role                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `primaryFields`      | Visible field descriptors (`LibraryFacetField`: `id`, `kind`, `options[]`) |
| `secondaryFields`    | Extra fields revealed when `expanded`                                      |
| `selectedValues`     | `Record<fieldId, string[]>` selection map                                  |
| `activeChips`        | Host-computed chip labels for tooltip / clear affordance                   |
| `onToggleFacetValue` | `(fieldId, value, kind) => void` — host owns filter state / query mapping  |
| `resolveFieldLabel`  | Host i18n for field titles                                                 |

**When to use:** Inline facet trigger in `CatalogBrowsePane.facetStrip` (or equivalent FilterBar slot).

**When not to use:** Full multi-section filter dialog — use `LibraryFacetFilterPanel` /
`LibraryFacetFilterDialog`. Hosts must map domain DTOs to `LibraryFacetField` and omit
sentinel/empty options before passing. Optional `onOpenMoreFilters` + `moreFiltersLabel`
open that dialog from the cascade menu while keeping primary field menus.

**VS Code analogue:** Extensions view filter / category menus (not 1:1).

### `CatalogFilterOverlay`

**Purpose:** Presentational filter overlay shell — elevated surface, fixed-height
title row with Clear (always mounted; `clearDisabled` when idle), and a body slot
for facet sections. Product-neutral companion to `CatalogBrowsePane`.

| Prop / type       | Role                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`           | Host copy for the overlay heading                                                                                         |
| `titleId`         | `aria-labelledby` target id                                                                                               |
| `clearLabel`      | Accessible label for Clear                                                                                                |
| `onClear`         | Host clears selection                                                                                                     |
| `clearDisabled`   | Keep Clear sized/mounted but inert (avoids header height jump)                                                            |
| `children`        | Usually `LibraryFacetFilterPanel` (or host-authored section lists)                                                        |
| Portal / position | Prefer `useAnchoredOverlayPanel` for portal root, fixed coords, dismiss, and remeasure; host may still own these manually |

**When to use:** Anchored filter popover / flyout next to browse chrome.

**When not to use:** Full modal dialog — use `LibraryFacetFilterDialog`. Keep dense
product-specific multi-section chrome in the host; this shell stays structural only.

### `LibraryFacetFilterPanel` / `LibraryFacetFilterDialog`

**Purpose:** Multi-section facet editing surface — grouped options per field, visible
active chips with dismiss, clear-all. Complements the cascade strip.

| Prop / type           | Role                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `sections`            | `LibraryFacetSection[]` (`id` + `fields[]`) — host orders / groups fields |
| `selectedValues`      | Same map as strip                                                         |
| `showActiveChips`     | Default `true`; set `false` to hide chip strip (host owns Clear chrome)   |
| `activeChips`         | Optional chip row when `showActiveChips` (dismiss via `onRemoveChip`)     |
| `onToggleFacetValue`  | Same live toggle signature as strip                                       |
| `resolveFieldLabel`   | Host i18n for field titles                                                |
| `resolveSectionLabel` | Optional host i18n for section titles                                     |
| Dialog chrome         | `LibraryFacetFilterDialog` wraps panel in `WorkbenchDialogFrame`          |

**When to use:** Modal “More filters” editing; denser metadata field lists than cascade menus.
Pair with `CatalogFilterOverlay` for anchored flyouts (`showActiveChips={false}`).

**When not to use:** Toolbar-only quick filters — prefer `LibraryFacetFilterStrip`.

### Building blocks still used directly

| Primitive                                                               | Role                                                                                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FilterBar`, `FilterBarRow`                                             | Search + filter toolbars                                                                                                                                                                                     |
| `ClearableTextInput`                                                    | Search field                                                                                                                                                                                                 |
| `SegmentedControl`                                                      | Grid/list view toggle                                                                                                                                                                                        |
| `Select`                                                                | Sort control                                                                                                                                                                                                 |
| `ScrollArea`, `useScrollAreaInfiniteLoad`, `ScrollAreaInfiniteSentinel` | Catalog scroll + infinite load                                                                                                                                                                               |
| `List`, `ListItem`, `ListEmptyState`                                    | List mode rows                                                                                                                                                                                               |
| `CatalogBrowseCard`                                                     | Kit-owned grid tile (`variant`: `cover` \| `row`; optional `media` / `mediaOverlay` / `trailing` actions) — consumer injects product media; trailing keeps secondary controls outside the primary hit target |
| `IconButton`, `Toolbar`                                                 | Refresh and compact actions                                                                                                                                                                                  |
| `EmptyState`, `Badge`                                                   | Empty, loading, status chips                                                                                                                                                                                 |

**VS Code analogue:** Extensions view list + filter; not 1:1 with dense media library grids.

---

## Sidebar

### `SideBarViewFrame`, `WorkbenchSidebarSection`, `WorkbenchSidebarSectionStack`

**Purpose:** Primary sidebar panel frame and collapsible sections.

**Scroll ownership:** `SideBarViewFrame` body is `PanelBody` (`ScrollArea`). Explorer-style sidebars scroll on the body surface (see `WorkspaceExplorerPanel` + `WorkbenchSidebarSection`). For fixed header + scrolling list, keep the body as a flex slot and put `ScrollArea` on the list region only — do not clip the body with `overflow: hidden` without that inner scroll chain.

**Section list nesting:** By default (`nestListItems`, default `true`), `SideBarListItem` depth under a `WorkbenchSidebarSection` is offset by +1 so rows read as children of the section header. Relative `depth` still stacks on top of that base. Set `nestListItems={false}` only when a consumer must own the full indent plane. Non-list content can read the base via `useSidebarSectionBaseDepth()` (Explorer inline rename uses this).

**VS Code analogue:** `PaneComposite` + view sections.

---

### `SideBarTree`

**Purpose:** Controlled expand/collapse + selection tree for library / provider sidebars,
built on `SideBarList` / `SideBarListItem`.

**Import:** `@workbench-kit/react/layout` (also re-exported from `@workbench-kit/react`)

**Key props:** `items`, controlled `expandedIds` / `selectedIds`, `onExpandedIdsChange` /
`onSelectedIdsChange`, optional `selectionMode` (`single` | `multi`), `keyboardNavigation`
(default `true`).

**Leaf vs branch:** Items with a `children` array (even empty) are branches; items without
`children` are leaves. Hosts own the id sets.

**When not to use:** Full workspace file explorer with rename/DnD — use `WorkspaceExplorer`.
Low-level row chrome without tree state — use `SideBarListItem` / `WorkbenchTreeItem`.

**Non-goals (v1):** Virtualization, DnD reorder.

**VS Code analogue:** TreeView / collapsible category trees.

---

### Fill / scroll layout contract (`WorkbenchFill`, `WorkbenchFillChain`, `WorkbenchScrollRegion`)

**Purpose:** Keep editor-in-pane hosts from scrolling the document. Flex parents mark
themselves as fill (clip); only named scroll owners may overflow.

| Export                                                         | Role                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `WORKBENCH_FILL_SCROLL_ROLE_ATTR` (`data-ui-fill-scroll-role`) | Stable DOM marker (`fill` \| `scroll`) for tests and layout probes                                                  |
| `workbenchFillScrollRoleProps(role)`                           | Spread helper for host-owned elements                                                                               |
| `resolveWorkbenchFillScrollRole(owner, registry)`              | Resolve role from host `fillOwners` / `scrollOwners` id lists                                                       |
| `WorkbenchFill`                                                | Flex fill slot that clips (`overflow: hidden`); column; last child fills remaining space                            |
| `WorkbenchFillChain`                                           | Fill root; descendant `[data-ui-fill-scroll-role]` nodes inherit clip/scroll overflow; same last-child fill default |
| `WorkbenchScrollRegion`                                        | Named scroll owner (`overflow: auto`)                                                                               |

**When to use:** Design/editor panes hosted inside `WorkbenchViewEditor` (or similar) that must fill the pane without growing page scroll.

**When not to use:** Sidebar body scroll — prefer `SideBarViewFrame` / `ScrollArea` as above. Do not put product owner id vocabularies into the kit; hosts keep those registries.

**Import:** `@workbench-kit/react/layout` (also re-exported from `@workbench-kit/react` and `./primitives`).

**VS Code analogue:** Editor group / pane flex clip chain (no workbench-level document scroll).

---

### `SidebarActionIconBar`

**Purpose:** Dense icon actions with overflow menu (`actions`, `overflowActions`, `overflowMenuLabel`).

**When to use:** Source manager, refresh, open related views in sidebar header.

**When not to use:** Full text toolbar — use `Toolbar` + `Button`.

---

### `WorkspaceExplorer` / `WorkspaceExplorerPanel`

**Purpose:** File tree with expand/collapse, selection, optional context menu and toolbar.

**Key props / ports:**

| Surface / API                     | Detail                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `WorkspaceExplorerPanel` toolbar  | `toolbarLeading` / `toolbarTrailing` / `toolbarStatus` plus optional New file/folder/refresh |
| `onBackgroundContextMenu`         | Empty-tree / background context menu (item menus keep `onItemContextMenu`)                   |
| `renderItemActions`               | Per-row trailing actions (folder hover new-file/folder/delete, etc.)                         |
| ARIA tree keyboard                | `role="tree"` / `treeitem`; Arrow/Home/End; `selectionFollowsFocus` (default true)           |
| `canMutatePath` (controller port) | Guard create/rename/delete/move (`boolean` or error `string`)                                |
| `inlineEditMessages` (controller) | Override invalid-name / already-exists / failure copy for i18n                               |
| `resolveExplorerActionPaths`      | `@workbench-kit/workspace` — VS Code-like focus vs selection for command targets             |
| `applyWorkspaceFolderMove`        | Pure folder-move apply helper for external stores                                            |

**When to use:** Workspace file navigation in a sidebar host.

**When not to use:** Product-specific library browsers — use catalog primitives.

**Selection / keyboard policy:** See [explorer-selection-policy.md](./explorer-selection-policy.md).

---

### `ChatPanel` / `ChatMessageItem` · `@workbench-kit/react/workbench/chat`

**Purpose:** Sidebar chat surface (message list + composer) and message chrome.

**Key props:**

| Surface                 | Props                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ChatPanel`             | `onFilesDrop`, `filesDropLabel`, `renderMessageList`, `renderComposer`, `messageListAddon`, composer/runtime props                                           |
| `ChatMessageItem`       | `footer`, `attachments` (in-bubble), `afterMessage` (outside), `labelIcon` (`ReactNode \| false`), plus `tone` / `contentMode`                               |
| `ChatMessage`           | `tone?: 'default' \| 'error' \| 'warning'`, `contentMode?: 'plain' \| 'markdown'`                                                                            |
| `ChatPhasedRunProgress` | Phase list + optional `labels` (expand/collapse, summary, status badges) for host i18n                                                                       |
| `ChatConversationBar`   | Density tokens: `--workbench-chat-conversation-pill-min-width` (default `7.5rem`), `--workbench-chat-conversation-session-pill-min-width` (default `5.5rem`) |

**Defaults:** Assistant layout messages render Markdown unless `contentMode: 'plain'`. User/peer default to plain. Markdown uses `remark-gfm` plus `rehype-sanitize`, and shared anchor rendering allows only HTTP(S), `mailto:`, relative, and same-document hash links. Disallowed schemes render as non-navigable text. Hosts that need unsanitized HTML should render outside kit chat/preview surfaces. File drop is ignored while `disabled` or `isRunning`.
Compose `ChatPhasedRunProgress` into `ChatMessageItem` `footer` / `afterMessage` (or a hybrid timeline slot); hosts own phase ids and copy.

**When to use:** Host chat sidebars that should delete local message/composer chrome forks.

**When not to use:** Full product chat products that own the entire timeline — use slots (`renderMessageList`, `afterMessage`) rather than forking kit BEM.

**Storybook:** `Workbench UI/Chat/Components` → host-gaps drop/tone story.

---

## Overlays and management

### `ContextMenu`

**Purpose:** Fixed-position menu (`items`, `x`, `y`, `onClose`). Items: label, icon, shortcut, `onSelect`, separators. Icon and shortcut columns are opt-in: when no item provides `icon` / `shortcut`, those columns are omitted (`data-has-icons` / `data-has-shortcuts`) so empty grid tracks do not add side padding. Selecting an item calls `onSelect` then `onClose`. Dismiss also runs on outside pointer down, Escape, scroll, and resize (`useFixedOverlayDismiss`). Coordinates are viewport (`clientX` / `clientY`).

**Keyboard / a11y:** `role="menu"` / `menuitem` with a WAI-ARIA menu model — ArrowUp/ArrowDown and Home/End move highlight (skipping disabled items and separators), Enter/Space activate, Escape closes. On Escape only, focus returns to a connected `returnFocusTarget` when supplied, or to the active element captured before menu-item focus. Activation, outside pointer, scroll, and resize dismissal do not restore focus. Highlight stays in sync with pointer hover (`data-highlighted`); roving `tabIndex` keeps only the highlighted enabled item at `0`. Nested submenus are out of scope for this surface.

**When to use:** Tab context menu, catalog item menu, facet overflow.

**When not to use:** Persistent filter panels — use `LibraryFacetFilterStrip` for toolbar cascade menus, or `LibraryFacetFilterPanel` / dialog for a full dialog. Hosts that hand-build `.ui-context-menu` markup (facet strip, chat history) must set `data-has-icons` / `data-has-shortcuts` themselves; those attributes are an internal layout contract, not a public props API.

**VS Code analogue:** `Menu` / context menu service.

---

### `useContextMenuState`

**Purpose:** Generic pointer-state helper for opening a `ContextMenu` (`target`, `x`, `y`). `open(event, target)` prevents default and stops propagation; `openAt` anchors from a button rect or other coordinates; `close` clears state. `target` may be an id string or a small payload object (for example `{ ariaLabel, items }` in sample hosts).

**When to use:** Sidebar lists, catalog cards, overflow icon bars that only need coordinates + target identity. Sample reference: `IntegratedShellDemo` and Storybook `Atomic UI/Overlays/Dialog Actions` → Context menu pointer state.

**When not to use:** Building domain menu items, or deciding whether right-click changes selection — keep those in the host.

---

### `measureAnchoredOverlayPanel` / `useAnchoredOverlayPanel`

**Purpose:** Host-neutral helper for panel-sized overlays anchored to a trigger:
side/below/above placement with viewport clamping, Escape + outside dismiss,
remeasure on resize/scroll (does not close on those events), and portal root via
the same `resolvePortalContainer` heuristic as SearchableMultiSelect. Nested
portaled SMS listboxes stay inside the dismiss boundary
(`isSearchableMultiSelectPortalTarget`).

**When to use:** Pair with `CatalogFilterOverlay` (or a similar panel shell) for
toolbar/filter flyouts. Storybook: `Atomic UI/Overlays/Anchored Panel`.

**When not to use:** Select/SMS listbox positioning (`measureOverlayPosition`) or
context menus that should dismiss on scroll/resize (`useFixedOverlayDismiss`).

---

### `Modal` (low-level)

**Purpose:** Draggable/resizable dialog with title bar, body layouts, optional footer.

**Prefer:** `WorkbenchDialogFrame` for management-sized dialogs with preset dimensions.

---

### `WorkbenchDialogFrame`

**Purpose:** Management dialog wrapper over `Modal` with preset sizes.

**Key props:** `frameSize` (`source-manager`, `wide`, `asset-library`, …), `bodyLayout` (`column-fill`, `padded-fill`), `title`, `onClose`, `dataAttributes`.

**When to use:** Source manager, provider settings, large configuration dialogs.

**VS Code analogue:** Modal editor / multi-step dialog (simplified).

---

### `LibraryCatalogPickerDialog`

**Purpose:** Asset/catalog picker shell — `WorkbenchDialogFrame` + searchable cover
grid + optional `headerActions` slot for host install/import controls.

| Prop / slot       | Role                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `items`           | Neutral `{ id, label, meta?, imageUrl? }` rows for default `CatalogBrowseCard` covers |
| `onPick`          | Single-select activation (primary pointer / double-click) — host closes and applies   |
| `headerActions`   | `ReactNode` slot above the grid (install image, refresh, …)                           |
| `labels`          | Host i18n for search / empty / loading / no-matches                                   |
| `renderItemMedia` | Optional cover media override when `imageUrl` is not enough                           |
| `frameSize`       | Defaults to `asset-library`; body defaults to `column-fill`                           |

**When to use:** Modal pickers that choose one catalog/asset id and leave persistence to the host.

**When not to use:** Full editor catalog browse (sort / view mode / infinite load) — use
`CatalogBrowsePane`. Do not put asset storage or install IPC inside the kit.

**Import:** `@workbench-kit/react/workbench/management`

---

### `IntegrationsShell`

**Purpose:** Split sidebar + detail editor for provider/integration management.

**Key props:** `sidebar`, `sourceTitle`, `sourceDescription`, `children` (detail body).

**When to use:** Provider manager content inside `WorkbenchDialogFrame`.

---

### `WorkbenchNoticeProvider`, `useWorkbenchNotice`, `WorkbenchNoticeViewport`

**Purpose:** Toast/notice stack for management surfaces (aria-live viewport, queue, dismiss,
auto-dismiss).

**Host rule:** Wrap dialog host once; show feedback via `showNotice`, not ad hoc DOM.

### `createWorkbenchNotify` / `useWorkbenchNotify`

**Purpose:** NotificationService-shaped facade (`notify.info` / `notify.error` / `success` /
`warning`, optional action buttons that invoke once then dismiss) over the notice controller.
Does not replace modal confirms.

```ts
const notify = useWorkbenchNotify();
notify.info('Installed', { actions: [{ label: 'Open', onAction: open }] });
notify.error('Save failed');
```

---

## Field Remap / Schema Mapper

**Purpose:** Reshape a source structure into a target structure with `MappingEdge[]` and
`convertToShape`. Runtime lives in `@workbench-kit/field-remap`; sample UI lives in
`@workbench-kit/shell-react` plus `extensions/samples.field-remap`.

**Mental model:** Source schema column (A) → optional convert nodes → target schema column
(B), wired by port DnD. Convert nodes are `MappingEdge.transformIds` steps (not a free graph).
Shapes stay host-owned; the persisted document is edges (+ optional v2 `operators[]`).

| Layer     | Package / surface                                      | Role                                                                                                   |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Runtime   | `@workbench-kit/field-remap`                           | Edges, shapes, builtins, `convertToShape` / `convertMappedInputs`, port helpers (`arePortsCompatible`) |
| Shell UI  | `@workbench-kit/shell-react/field-remap` (also barrel) | Embeddable mapper (`FieldRemapPanel` controlled/uncontrolled, Flow, Convert UI)                        |
| Extension | `extensions/samples.field-remap`                       | Sample activity / editor host wiring (repo-local)                                                      |

**When to use:** Hosts that need A→B field mapping with optional transform chains, list
context (`itemEdges`), and preview conversion.

**When not to use:** Free-form node graphs that diverge from `MappingEdge` + `transformIds`;
deep JSON Schema structural validation; production mapper chrome that must not depend on
sample extension packaging.

**Model notes:**

- Canvas layout is two schema columns plus middle convert (`xf:*`) nodes. Array item-schema
  ports (`*.item.*`) stay out of the main columns; edit them via list-context `itemEdges`.
- Canvas “convert nodes” are `transformIds` steps on an edge, not a separate document type.
  Place-then-wire drafts are ephemeral UI state until both ports finalize an edge.
- Input/output shapes may be host-owned; `FieldRemapDocument` stores edges plus optional
  `operators[]`. The shell `FieldRemapShapeIoEditor` / panel shape IO path pastes
  JSON → ingest and edits `FieldDataType`; call `pruneMappingEdgesForShapes` when ids disappear.
  Optional `classRef` / `hidden` on `SourceField` / `TargetSlot` plus `projectShapes` /
  `projectSourceFields` / `projectTargetSlots` (`includeHidden`, default omit hidden) support
  browse-first hosts. Panel `ioChrome: 'browse' | 'edit' | 'none'` (defaults from
  `editableShapes`) and `FieldRemapIoClassBrowse` render read-only class/field trees.
- Supported Flow connects: source↔target ports, source→xf / xf→target splice, and cross-edge
  xf→xf append/merge. Live connects are gated by `arePortsCompatible` (permissive on
  missing/`unknown`, strict on known mismatch).
- Flow chrome is convert-first:
  - **Convert palette** (primary left rail): place-then-wire drafts + optional Add combine/split
    (`FieldRemapConvertPalette`).
  - Side rail is selection-gated:
    - empty → convert-first guidance
    - **Draft convert** → wire status until both ports finalize (then opens Convert editor)
    - **Binding detail** (`edge`): chain overview, add-convert, list-context `itemEdges`
    - **Convert note editor** (`transformStep` / `xf:*`): registry id + options
    - **Operator** (`combine` / `split`): create/wire/delete n→m ports (document v2)
- Graph/Tree mappers in shell-react are sample-oriented; prefer the panel/flow surfaces for
  new host integration.

**Key APIs:** `convertToShape`, `convertMappedInputs`, `createBuiltinValueTransformRegistry`,
`arePortsCompatible`, `areFieldTypesCompatible`, `pruneMappingEdgesForShapes`,
`projectShapes` / `projectSourceFields` / `projectTargetSlots`, `ClassRef`,
`FieldRemapPanel` (controlled `edges` / `onEdgesChange`, `ioChrome`, `includeHidden`),
`FieldRemapFlowMapper`, `FieldRemapFlowActions` (`flowActionsRef.fitView`),
`FieldRemapConvertPalette`, `FieldRemapDetailPanel`, `ConvertNoteEditor`,
`FieldRemapIoClassBrowse`, `FieldRemapShapeIoEditor`, `TransformOptionsEditor`.

**Flow host chrome:** `showMinimap` (omit MiniMap when false), pane/node/edge context-menu
callbacks with selection payload (host owns menu UI), and `flowActionsRef.fitView` so hosts
do not query Controls DOM. `chrome="embed"` omits the demo hint and bottom binding list;
`showFlowHint`, `showBindingsList`, and `showConvertPalette` override those defaults. A hidden
palette is unmounted and the workspace expands rather than retaining an empty rail. `emptyDetail`
is `hint` by default for card chrome and `collapse` for embed chrome; collapse unmounts the empty
detail rail until an edge, draft, transform, or operator is selected. Both palette and visible
detail rails use nested kit `SplitView` splitters (pointer and keyboard accessible), so hosts no
longer need CSS grid overrides for their widths. Empty-detail title/body also accept
`labels.emptyDetailTitle` / `labels.emptyDetailDescription`.
Panel forwards the same props. Chrome nouns (`Bindings`, Convert palette copy) accept `labels`
/ optional `t(key, fallback)` on Flow and Panel — hosts can override to “Field maps” /
“Mappings” without CSS text hacks (`resolveFieldRemapChromeLabels`).

**Runtime preview:** `FieldRemapPanel` has one headless preview execution owner. Its existing
output pane and optional `showFlowPreview` Flow rail consume the same precomputed snapshot.
Direct `FieldRemapFlowMapper` embeds are presentation-only: inject a
`FieldRemapPreviewState` through `preview`, and set `showPreview={false}` to unmount the rail
and splitter track. `hidden` / `no-sample` snapshots also reserve no track.

Selection changes do not evaluate mappings. Empty/operator selection shows final output after
operators; edge selection shows its pre-operator slot value; transform-step selection shows
the same final binding value with an explicit no-intermediate notice. Draft, stale selection,
transform-step intermediate, and operator-local intermediate values are not executable preview
states. The snapshot is runtime-only and never enters document, history or persistence state.

**Narrow embeds:** Flow workspace breakpoints use the width of `.workbench-field-remap-flow`,
not the browser viewport, so a narrow secondary pane stacks palette, canvas, and detail instead
of collapsing the canvas. Hosts can use a simple block wrapper; for the supported narrow layout,
give it at least `22.5rem` inline size and let it provide the vertical space for Flow.

**Edge-fill embeds:** `chrome="embed"` also removes the nested card borders and radii from
the palette, canvas, and detail rail. The Flow rails meet with hairline dividers, so the host
wrapper owns the outer border and radius. Omit `chrome` (or use `chrome="card"`) for the
backward-compatible card presentation.

```tsx
<div style={{ minInlineSize: '22.5rem', minBlockSize: '26rem' }}>
  <FieldRemapFlowMapper
    chrome="embed"
    emptyDetail="collapse"
    showConvertPalette={false}
    // sources, targets, edges, transforms, and onEdgesChange as usual
  />
</div>
```

**Browse badge labels:** Direct `FieldRemapIoClassBrowse` consumers can override its hidden
badge copy and `classRef` tooltip without forking the tree. Omit either value to retain the English defaults
(`Hidden` and `classRef`).

```tsx
<FieldRemapIoClassBrowse
  includeHidden
  labels={{ hiddenBadge: 'Internal', classRefTitle: 'Class reference' }}
  sources={sources}
  targets={targets}
/>
```

---

## Shell chrome label / `t()` injection (#126)

Kit does **not** ship locale packs. Hosts inject chrome copy via:

| Surface                  | API                                                                            |
| ------------------------ | ------------------------------------------------------------------------------ |
| `WorkbenchShell`         | `labels?: Partial<WorkbenchShellChromeLabels>` and/or `t?: WorkbenchTranslate` |
| Field Remap Flow / Panel | `labels` / `t` (`FieldRemapChromeLabels` / `FieldRemapTranslate`)              |

**Resolution order** (per string): `labels[key]` → `t(capabilityId, EnglishDefault)` → English default.

Stable shell keys (see `workbenchShellChromeLabelKeys`): `shell.activityBar`, `shell.statusBar`,
`shell.profile`, `shell.profileTitle`, `shell.settings`, `commandPalette.title`,
`commandPalette.placeholder`, `commandPalette.close`, `commandPalette.empty`,
`quickOpen.title`, `quickOpen.placeholder`, `quickOpen.close`, `quickOpen.empty`.

```tsx
<WorkbenchShell
  locale={locale}
  t={(key, fallback) => registry.localizations.translate(locale, key, fallback)}
  // or labels={{ settingsLabel: '설정', commandPaletteTitle: '명령 팔레트' }}
/>
```

Sample: `examples/workbench-sample` wires `t` from the active locale; KO strings live in
`extensions/samples.locale-ko`. Missing `t` keeps English defaults.

**Embed recipe:** import `@workbench-kit/shell-react/field-remap` (+ optional
`…/field-remap/view.css`). Persist `MappingEdge[]` via controlled panel props; evaluate with
`convertMappedInputs` (or `convertToShape` when you already own conversion/shape registries).
Browse-first Storybook: `Workbench Sample/Field Remap` → **I/O browse (classRef / hidden)**.

**Related:** [Field Remap README](../../packages/field-remap/README.md) ·
[Sample screens](../guides/sample-screens.md#field-remap-editor) ·
[Storybook e2e coverage](./storybook-e2e-coverage.md) ·
[Component map](../guides/component-map.md#field-remap)

---

## Settings patterns (reference)

Integrating hosts typically compose settings modals from the kit theme provider
and settings sections in `@workbench-kit/react/workbench/settings` (not
duplicated here). For schema-driven forms see
[schema-form-field-widgets.md](./schema-form-field-widgets.md).

**VS Code analogue:** Settings editor / preferences UI.

---

## Controls reference (short)

| Component    | Purpose                                                         | VS Code analogue              |
| ------------ | --------------------------------------------------------------- | ----------------------------- |
| `Toolbar`    | Horizontal action container (`ui-toolbar`)                      | Toolbar widget                |
| `IconButton` | Icon-only control with `label` for a11y                         | Toolbar action                |
| `ScrollArea` | Themed scroll container (`orientation`, `scrollbars`, `gutter`) | Scrollable editor pane        |
| `EmptyState` | Centered empty/loading message with codicon                     | Empty editor / welcome        |
| `Badge`      | Status chip (`variant`: accent, muted, danger)                  | Badge in lists                |
| `FileIcon`   | Themed file-type codicon                                        | ThemeIcon + file associations |

---

## Host integration rules

Keep host-specific UI/UX ownership notes in the integrating host’s private
tracker. This public inventory only records the kit-side ownership rules below
(see also [public-reference-policy.md](../conventions/public-reference-policy.md)).

1. **Shell chrome belongs to the kit** — activity bar, editor tabs, dialog frames, property sections, scroll areas.
2. **Tab-scoped actions → `EditorTabs.addons`** — not a duplicate row in the detail pane.
3. **Hero-scoped actions → `LibraryDetailLayout.actions`** — only when there is no shared tab bar.
4. **Domain logic stays in the host** — DTO mapping, IPC, provider APIs, i18n strings passed as props.
5. **Product-specific visual tuning** — CSS variables (`--shell-*`) and `data-*` hooks, not forked layout markup.
6. **Extend the kit before copying** — if a second consumer needs the same browse frame, add a primitive (see backlog) instead of a third copy in the host.

---

## Gaps (kit backlog, not host workarounds)

| Gap                          | Host impact                                                                                                     | Tracking   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| Consumer type shims          | Local type declaration drift                                                                                    | Backlog §3 |
| `exactOptionalPropertyTypes` | Partial kit cleanup + `pnpm typecheck:react-exact-optional`; linked-source graphs may still need split tsconfig | Backlog §4 |

---

## Verification

After changing exports or props consumed by hosts:

```powershell
pnpm check:public-exports
pnpm validate:static
```

Storybook demos for library detail: `examples/workbench-sample` (`LibraryDetailLayout` stories).
