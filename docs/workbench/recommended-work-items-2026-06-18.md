# Recommended Work Items - 2026-06-18

This list converts the current project-wide review into executable work slices.
Priority is based on user-visible risk, VS Code parity, reuse of existing
services, and package-boundary clarity.

## Selected Goal For This Run

**Goal:** finish Settings modal window parity as a reusable `Modal` capability.

Why this goal:

- It directly addresses a visible regression against expected workbench UX.
- It reuses the existing shared `Modal` instead of creating a settings-only
  workaround.
- It creates a reusable base for Help, future preference windows, and command
  palette-adjacent overlays.

Acceptance:

- Settings opens in the existing modal flow.
- Settings can move by dragging the titlebar.
- Settings can maximize and restore from titlebar controls.
- Existing confirm/basic modal behavior remains centered by default.
- Tests cover both SSR markup and real DOM pointer/click interaction.

Status: completed in this run.

## Near-Term Recommendations

| Priority | Item                              | Recommended next action                                                                                                   |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P1       | Settings modal window parity      | Completed: common `Modal` supports `movable`/`maximizable`; Settings enables it; tests cover drag and maximize/restore.   |
| P1       | Editor layout ownership           | Move split direction, ratios, nested split intent, and group merge into `EditorService` operations.                       |
| P1       | Document view provider registry   | In progress: manifest/runtime document view contribution is wired; next step is richer matching and host docs.            |
| P1       | Context menu contribution parity  | Progress: editor-tab and explorer item menus are command-backed; next is extension/user menu contribution ordering.       |
| P2       | Stale workbench planning docs     | Refresh or archive WB-28/WB-29-era docs that no longer match current code truth.                                          |
| P2       | JDW validation/render consistency | Reuse parsed/validated JDW results across code/form/preview and decide `WorkbenchDocument` boundary.                      |
| P2       | Scrollbar standardization         | Replace new raw scroll containers with `ScrollArea`; keep custom overlay scrollbars only where intentionally specialized. |
| P2       | Theme/token layering              | Split tokens into color, shape, density, shell, editor, and file-icon groups.                                             |
| P2       | Markdown preview fidelity         | Add GFM and a real Mermaid renderer if Markdown preview becomes product-facing.                                           |
| P3       | Public export narrowing           | Keep broad `@workbench-kit/react` exports under review and prefer stable narrow subpaths.                                 |
| P3       | Distributed verification          | Document changed-package verification commands and reserve full gates for cross-package/release slices.                   |

## Next Recommended Goal

After the 2026-06-25 editor layout hardening, the next highest-value
implementation goal is:

**JDW outline/validation host polish** or the remaining host-backed storage adapter
work.

Scope:

1. Keep source-range highlighting, semantic source problems, outline horizontal
   keyboard navigation, and workspace host save gating covered while closing
   remaining outline edge gaps.
2. Keep validation banner, Monaco diagnostics, and preview rendering on the same
   parsed/validated JDW contract.
3. If staying in shell infrastructure, provide a concrete file-backed storage
   adapter and plugin install/update plan on top of existing storage contracts.
4. Keep React as renderer/dispatcher for the service-owned layout model.

Progress as of 2026-06-25:

- `EditorService` owns split direction and primary size ratio state for the
  current layout tree.
- React `EditorArea` renders the service-owned split orientation/size and writes
  sash resize changes back through the service.
- Editor tab context menu exposes both `Split Right` and `Split Down`; DnD
  left/right/top/bottom split operations pass layout intent to the service.
- Drop-zone side resolution and move-option mapping are extracted into
  framework-neutral `workbench-core` helpers with geometry-based tests.
- New group insertion preserves nested split intent instead of flattening the
  whole editor layout tree.
- `EditorService` accepts restored editor state, normalizes stale layout nodes,
  and resumes tab/group id sequences without collisions.
- Existing-target split/move calls ignore stray split-direction hints and
  preserve service-owned nested layout; empty source groups prune through layout
  reconciliation.
- `shell-react` persists editor state in browser storage and restores tabs,
  groups, split direction, and split ratios on provider startup.
- `WorkbenchProvider` accepts `Storage`-compatible adapters for editor state,
  workbench layout, keybinding overrides, local preference persistence, and
  extension install-state management, so a non-browser shell can bridge those
  snapshots to host-owned `state.json` or user-data storage.
- Remaining work: provide a concrete host file-backed adapter and define the
  plugin store install/update plan on top of the shared extension install-state
  storage contract.

Document view provider progress as of 2026-06-21:

- `shell-react` owns an `EditorDocumentViewProviderRegistry` instead of keeping
  JSON form, JDW preview, and Markdown preview resolution local to `EditorArea`.
- `WorkbenchProvider` registers default document view providers and accepts
  host-provided document view providers through `documentViewProviders`.
- `EditorArea` reads provider-level registry state and keeps its `viewProviders`
  prop as a local override path for embedded or specialized editor surfaces.
- Extension manifests can declare `contributes.documentViews`, feature specs and
  management UI expose those providers, and activated extensions can register
  runtime providers through `context.editorDocumentViews.registerProvider(...)`.
- Remaining work: document advanced matching rules and decide whether document
  view provider rendering should remain shell-react-owned or become a broader
  host adapter contract.

Context menu contribution progress as of 2026-06-21:

- Editor tab `Pin`/`Unpin`, `Split Right`, and `Split Down` are defined in the
  shared editor command preset and resolved through the same menu pipeline as
  copy/close/delete.
- `EditorArea` keeps only surface-specific callback context for the active tab
  and group, so future keybinding/palette/menu surfaces can target the same
  command ids.
- Explorer item menus already use workspace command preset entries for open,
  create, rename, delete, and copy path.
- Remaining work: accept extension/user-provided context menu contributions and
  define deterministic ordering/visibility rules.
