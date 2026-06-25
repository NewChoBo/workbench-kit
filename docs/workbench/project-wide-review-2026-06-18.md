# Project-Wide Review - 2026-06-18

This review applies [Workbench Change Guidelines](./workbench-change-guidelines.md)
to the current repository state.

## Scope

Reviewed package boundaries, built-in extension flow, editor state, explorer
state, JDW rendering, sample host, docs, token/scrollbar usage, and validation
scripts. This was a static repository review, not a browser UX pass.

## Confirmed Current State

- The current target package graph is coherent: `platform` owns command/context
  primitives, `workbench-core` owns registries and services, `shell-react`
  assembles the shell, and `react` keeps primitives/domain UI.
- The built-in explorer is no longer a placeholder. It registers workspace
  commands such as `workspace.init`, `workspace.open`, `workspace.newFile`,
  `workspace.rename`, `workspace.delete`, and
  `workbench-kit.builtin.explorer.move`, and routes mutations through workspace
  transactions.
- `EditorService` now owns editor groups, tabs, dirty/pinned/preview state,
  editor host creation, tab movement, and a first-pass layout tree.
- `EditorArea` consumes `EditorService`, renders tab groups, handles tab
  reorder/move/split gestures, uses file icons, and resolves code/form/preview
  by document-view providers.
- The sample host initializes the virtual workspace through `workspace.init`,
  includes `example.jdw.json`, imports JDW schema files from
  `@workbench-kit/jdw`, exposes theme selection through Settings, and keeps the
  empty editor state minimal.
- Markdown preview exists and recognizes Mermaid code fences, but the Mermaid
  path is a lightweight summary visualization rather than a full Mermaid
  renderer.
- Scrollbar tokens and `ScrollArea` exist, and recent editor form/preview panes
  use them.

## Findings

### P1 - Planning docs require drift control

2026-06-20 follow-up: the main planning documents now reflect that WB-28 is
landed and WB-29 command handlers are implemented, with closeout focused on
selection/reveal/search behavior and sample smoke coverage.

Impact: because the active lane is still moving, docs can drift back into
already-landed behavior unless closeout updates happen in the same slice as code.

Recommended work:

- Keep `todo.md`, `session-work-plan.md`, `completion-plan.md`, and
  `structural-review.md` aligned whenever WB-29 closeout status changes.
- Keep this review and `workbench-change-guidelines.md` as the entry point for
  future implementation instructions.
- Treat historical slice plans as reference material, not the source of the next
  active task.

### P1 - Editor layout is present but not yet a durable split model

`EditorLayoutNode` exists, but layout is still derived from group order and
defaults to a horizontal split when more than one group exists. React DnD can
move tabs and create group splits, but direction, ratios, nested split intent,
and persisted layout changes are not yet owned as first-class service
operations.

Impact: VS Code-like split semantics will stay fragile if React continues to
infer layout from gesture handling.

Recommended work:

- Add `EditorService` operations for split direction, nested layout updates,
  group merge, and size ratio persistence.
- Move drop-zone interpretation into reusable editor layout helpers so tests can
  prove no-op drops, same-group reorder, cross-group move, and split creation.
- Let React render the service layout instead of reconstructing intent from
  group order.

2026-06-21 progress:

- Split direction and primary size ratio are now first-class `EditorService`
  layout state.
- `EditorArea` renders service-owned split orientation and controlled resize
  state instead of keeping split size local to React.
- The editor tab menu supports `Split Right` and `Split Down`.
- Editor group DnD supports left/right/top/bottom split zones with horizontal or
  vertical layout intent.
- Drop-zone side resolution and move-option mapping now live in framework-neutral
  `workbench-core` helpers.
- New group insertion preserves nested split intent instead of flattening the
  whole editor layout tree.
- `EditorService` accepts restored editor state, normalizes stale layout nodes,
  and resumes tab/group id sequences without collisions.
- `shell-react` persists editor state in browser storage and restores tabs,
  groups, split direction, and split ratios on provider startup.
- `WorkbenchProvider` accepts `Storage`-compatible adapters for editor state,
  workbench layout, keybinding overrides, local preference persistence, and
  extension install-state management, so a non-browser shell can bridge those
  snapshots to host-owned `state.json` or user-data storage.
- 2026-06-25 hardening: existing-target split/move calls no longer let stray
  direction hints rebuild the layout tree; `EditorService` preserves nested
  split intent and prunes only empty groups.
- Still open: a concrete host file-backed adapter and plugin store install/update
  planning on top of the shared extension install-state storage contract.

### P1 - Document view modes need a registry boundary

`EditorArea` has a good local provider shape for code/form/preview, but the
default providers are currently a module-local list. JDW preview, Markdown
preview, JSON form, and future schema-specific forms should be contributed
through a registry or extension contribution surface.

Impact: every new file type risks another local branch in `EditorArea` instead
of reusable workbench behavior.

Recommended work:

- Promote `EditorDocumentViewProvider` into a core or shell-react registry.
- Allow built-in extensions to contribute form/preview providers by MIME type,
  path pattern, and priority.
- Keep `EditorArea` as the resolver/renderer only.

2026-06-21 progress:

- `shell-react` now owns `EditorDocumentViewProviderRegistry`.
- `WorkbenchProvider` registers default JSON form, JDW preview, and Markdown
  preview providers and accepts host-provided document view providers.
- `EditorArea` reads provider-level registry state and remains the renderer; its
  `viewProviders` prop is retained for local surface-specific overrides.
- Extension manifests can declare `contributes.documentViews`, feature specs and
  management UI expose those providers, and activated extensions can register
  runtime providers through `context.editorDocumentViews.registerProvider(...)`.
- Still open: advanced matching docs and a decision on whether document view
  rendering remains shell-react-owned or becomes a broader host adapter
  contract.

### P1 - Context menus are partially command-backed

Explorer and editor tabs use command registries for standard menu items, but
some entries are still local closures, such as tab pin/split and explorer
folder-specific creation wiring.

Impact: command palette, keybindings, context menus, and extension contributions
can diverge.

Recommended work:

- Add canonical editor-tab and explorer context menu contribution points.
- Register pin, split, reveal, create, rename, delete, copy path, and open
  through the same command/menu pipeline.
- Keep surface-specific callbacks only for pointer coordinates and focus.

2026-06-21 progress:

- Editor tab pin/unpin and split-right/split-down are now first-class editor
  command preset entries instead of local `EditorArea` context-menu closures.
- `EditorArea` builds the full tab menu through `resolveCommandMenuItems` and
  supplies only host-specific command context callbacks such as current tab id,
  group id, and split direction.
- Explorer item menus were checked and already use workspace command preset
  entries for open, create, rename, delete, and copy-path behavior.
- Still open: extension-contributed context menu placement and user/extension
  overrides for menu ordering.

### P2 - JDW/render contracts are still split

`@workbench-kit/jdw` owns parsing/validation/layout while React owns
`renderJdw`, `JdwPreview`, JSON config workbench, widget-tree lab, and
`WorkbenchDocument` rendering. This is usable, but the contracts still invite
parallel document models and multiple parse/validation passes.

Impact: schema diagnostics, form editing, preview rendering, and save gating can
drift between JDW documents, generic JSON documents, and `WorkbenchDocument`.

Recommended work:

- Define the canonical persisted format for JDW documents and schema documents.
- Reuse `@workbench-kit/jdw` parse/validate results across code/form/preview.
- Decide whether `WorkbenchDocument` is an adapter format, a separate authoring
  model, or a replacement path, and document that boundary.

### P2 - Scrollbar standardization is started but incomplete

`ScrollArea` and shared scrollbar CSS exist. Several surfaces still use raw
`overflow: auto` or custom side bar overlay scrollbar behavior.

Impact: scrollbar appearance and gutter behavior can drift as new panels are
added.

Recommended work:

- Prefer `ScrollArea` for new scroll containers.
- Use `ui-workbench-scrollbar` only when a primitive cannot wrap the element.
- Treat custom overlay scrollbar code as a deliberate specialized component,
  not the default pattern.

### P2 - Theme tokens are useful but not yet layered

The token package has base color, file icon, radius, and scrollbar variables.
Theme selection is exposed in Settings. Shape, shell chrome, density, and
semantic editor/workbench tokens are not yet separated into a library-ready
contract.

Impact: consumers can switch dark/light, but cannot yet compose design, shape,
and shell token packs independently.

Recommended work:

- Split tokens into color, file-icon, shape, typography, density, shell, and
  editor semantic groups.
- Keep default tokens in `@workbench-kit/tokens`.
- Let `WorkbenchShell` accept token/theme packs while Settings edits the active
  selection through the same public settings path.

### P2 - Markdown preview should use real Markdown/Mermaid plugins if it becomes product-facing

The current Markdown preview is enough for an integrated sample. It is not yet a
GitHub-like preview engine.

Recommended work:

- Add `remark-gfm` for tables, task lists, and GitHub-style markdown.
- Add a sanitized rendering path before accepting arbitrary markdown.
- Use the official Mermaid renderer or a proven wrapper when diagram fidelity
  matters.

### P3 - Public `@workbench-kit/react` exports remain broad

The package intentionally exposes primitives plus many workbench/domain modules.
The architecture plan says some orchestration and settings/workspace behavior
should continue moving into `shell-react` and built-in extensions.

Impact: the public surface can harden before package boundaries are fully
settled.

Recommended work:

- Keep adding narrow subpath exports for stable UI pieces.
- Avoid exporting demo orchestration or host-specific wiring.
- Run `check:public-exports` whenever moving files or changing subpaths.

### P3 - Validation can be more distributed

The root scripts already provide package-specific typecheck groups and focused
Storybook gates. Full validation is still expensive for frequent UI iteration.

Recommended work:

- Add a documented "changed package" verification matrix.
- Prefer focused Vitest files plus package typecheck during inner-loop work.
- Reserve `validate:fast`, `validate`, and `validate:full` for cross-package,
  UI, release, or pre-commit gates.

## Suggested Next Slice

The highest-value next implementation slice is host-backed storage / install-state planning:

1. Keep the newly wired source-range feedback, semantic source-problem feedback, outline horizontal keyboard navigation, outline root-drop edge handling, outline Storybook coverage, and workspace host save gate covered.
2. Keep Monaco diagnostics, validation banner, and preview rendering aligned on
   the same parsed/validated JDW contract.
3. Cover the behavior with focused widget-tree tests and required Storybook play
   only when the user-visible flow changes.
4. If staying in shell infrastructure, take the concrete host file-backed
   storage adapter or plugin install/update plan next.

Editor layout ownership is now service-owned for split direction, ratios,
nested insertions, existing-target moves, and empty-group pruning.
