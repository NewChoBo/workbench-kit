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
| P1       | Document view provider registry   | Promote code/form/preview providers from `EditorArea` locals into a registry or extension contribution path.              |
| P1       | Context menu contribution parity  | Route editor-tab and explorer context menus through canonical command/menu contribution points.                           |
| P2       | Stale workbench planning docs     | Refresh or archive WB-28/WB-29-era docs that no longer match current code truth.                                          |
| P2       | JDW validation/render consistency | Reuse parsed/validated JDW results across code/form/preview and decide `WorkbenchDocument` boundary.                      |
| P2       | Scrollbar standardization         | Replace new raw scroll containers with `ScrollArea`; keep custom overlay scrollbars only where intentionally specialized. |
| P2       | Theme/token layering              | Split tokens into color, shape, density, shell, editor, and file-icon groups.                                             |
| P2       | Markdown preview fidelity         | Add GFM and a real Mermaid renderer if Markdown preview becomes product-facing.                                           |
| P3       | Public export narrowing           | Keep broad `@workbench-kit/react` exports under review and prefer stable narrow subpaths.                                 |
| P3       | Distributed verification          | Document changed-package verification commands and reserve full gates for cross-package/release slices.                   |

## Next Recommended Goal

After this run, the next highest-value implementation goal is:

**Editor layout ownership in `EditorService`.**

Scope:

1. Add service operations for split direction and nested layout updates.
2. Move editor drop-zone decisions into reusable helpers with tests.
3. Preserve same-group reorder, no-op self-drop, cross-group move, split left,
   split right, and empty-group cleanup.
4. Keep React as renderer/dispatcher for the service-owned layout model.
