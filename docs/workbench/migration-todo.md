# Workbench Migration Todo

This document tracks the remaining work needed to turn the current workbench
stories into reusable public UI components and realistic Storybook validation
scenarios. The reference implementation is treated only as a migration aid; do
not copy product-specific runtime details, storage keys, private sample data, or
internal command names into this package.

## Goals

- Keep public APIs generic enough for workbench-style products.
- Move reusable behavior out of Storybook and into components, hooks, or
  headless state helpers.
- Keep Storybook as the visual and interaction validation surface.
- Use public mock data and mock runtime adapters for integration scenarios.
- Split product-neutral logic into framework-neutral packages before expanding
  React components, so Vue, desktop, and future bindings can share the same
  workspace, command, and runtime contracts.

## Reference Analysis

The migration should use nearby reference implementations as behavior and
architecture examples, not as source to copy wholesale. Public documentation
must avoid naming private projects, local repository paths, internal package
names, storage keys, service names, or product-specific command IDs.

### Functional Reference

The closest functional reference covers the missing workspace and chat behavior.

- The virtual workspace state model provides file, folder, tab, selection,
  expansion, rename, move, delete, and search-query behavior. The package should
  reuse the behavior shape, but not the framework store, persistence key,
  actor naming, or product-specific defaults.
- The Explorer implementation covers most missing workflows: multi-select,
  range select, inline create, inline rename, folder delete, drag and drop, root
  drop, context menus, and keyboard shortcuts. The reusable parts should be
  extracted as headless helpers and controlled component props rather than
  copied as one large component.
- The command/menu implementation should inform workspace command IDs, labels,
  shortcut metadata, menu item projection, and command execution wiring.
- The runtime implementation provides a useful event shape for chat, status,
  streaming chunks, and file write events. Public runtime contracts must avoid
  private service and domain terminology.

### Architecture Reference

The stronger architecture reference covers workbench-scale package boundaries.

- The core command model shows a framework-neutral command registry with
  context-key based visibility and enabled state.
- The workbench chrome model shows how shell UI can be separated into activity
  bar, shell, tabs, toolbar, panes, breadcrumbs, and status surfaces.
- The UI implementation depends on internal aliases, Tailwind utility classes,
  and product-specific naming, so only the package boundaries and contracts
  should be reused.

### VS Code Reference

VS Code is the added public product reference for workbench interaction
conventions. The package should use VS Code as a behavioral benchmark, not as a
visual clone.

- Explorer workflows should align with familiar file tree behavior: active item
  versus multi-selection, range selection, inline create and rename, drag and
  drop, context menus, and keyboard actions such as `F2` and `Delete`.
- Search workflows should follow sidebar search expectations: query input,
  result counts, result previews, match highlighting, first-result activation,
  and clear/cancel keyboard behavior.
- Editor workflows should follow tab and dirty-state conventions: active tab,
  close, close others, close all, save, discard, copy path, and delete
  coordination with shared workspace state.
- Command and menu APIs should support command IDs, labels, icons, shortcuts,
  visibility/enabled state, and context-aware menu projection in a product-neutral
  form.
- Workbench shell components should preserve the mental model of activity bar,
  primary sidebar, editor area, panel/status surfaces, and settings entry points
  while keeping styling and product identity independent.

## Target Package Map

The package should evolve beyond a single React package.

| Package                    | Role                                                                                 | Initial source of truth                                    |
| -------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `@newchobo-ui/tokens`      | CSS variables, base theme, visual tokens                                             | Existing tokens package                                    |
| `@newchobo-ui/core`        | Framework-neutral command registry, context keys, event/disposable helpers           | Architecture reference patterns and VS Code conventions    |
| `@newchobo-ui/workspace`   | Framework-neutral workspace paths, tree, search, selection, mutations, draft helpers | Existing React workspace helpers plus functional behaviors |
| `@newchobo-ui/runtime`     | Framework-neutral chat/runtime events, mock runtime, workspace patch adapters        | Product-neutral runtime event shape                        |
| `@newchobo-ui/react`       | React primitives and workbench components bound to the neutral packages              | Existing React package and VS Code interaction conventions |
| Story/test fixture modules | Public mock files, mock messages, scenario adapters                                  | Storybook only unless consumers need them                  |

## Current Implementation Progress

- `@newchobo-ui/core` owns framework-neutral command registry, execution,
  separator, visibility/enabled-state, and menu projection helpers.
- `@newchobo-ui/workspace` owns framework-neutral path, tree, search, selection,
  type, editor draft, and virtual workspace model helpers.
- `@newchobo-ui/runtime` owns framework-neutral runtime chat message,
  status, workspace patch event types, and a public mock runtime helper for
  send/cancel/stream fixtures.
- `@newchobo-ui/react` consumes `@newchobo-ui/workspace` and keeps existing
  workspace exports available through the React binding package.
- `@newchobo-ui/react` consumes `@newchobo-ui/core` through a small adapter that
  converts resolved command menu items into `ContextMenuItem` values.
- `WorkspaceExplorer` accepts controlled file selection props and emits
  selection changes for single, toggle, range, and toggle-range interactions.
- Explorer context menus receive selection-aware action paths, and the
  integrated story uses them for multi-file open, copy, and delete confirmation.
- Explorer rows emit selection-aware `F2` rename and `Delete` delete requests so
  host applications can keep confirmation and inline edit state controlled.
- Explorer rows support configurable drag payloads and emit move requests for
  folder and workspace-root drops; `@newchobo-ui/workspace` exposes a move-plan
  helper that validates multi-file moves before reducer actions are dispatched.
- Explorer renders controlled inline create and rename rows; the integrated
  story validates simple names and path availability before dispatching create
  or rename reducer actions.
- `WorkspaceExplorer` has component-level Storybook play coverage for root and
  folder create, `F2` rename, keyboard delete, multi-selection recovery, and
  multi-file drag/drop.
- `WorkspaceSearchPanel` is a sidebar-oriented controlled component with query
  input, clear action, result count, empty states, `Enter` first-result
  activation, `Escape` clear behavior, and result context-menu hooks.
- `WorkspaceSearchPanel` has component-level Storybook play coverage for
  command-backed Search result menus, including shortcut metadata, danger
  styling, copy path, and delete execution.
- The integrated Workbench story uses command-backed menu projection for the
  Activity bar, primary sidebar, Explorer root, Workspace item, and Search
  result context menus.
- The integrated Workbench story has Storybook play coverage for command-backed
  Activity bar, Search result, Editor tab, and primary sidebar menu flows.
- `WorkspaceEditorPanel` uses command-backed menu projection for editor tab
  context menus including copy path, close, close others, close all, and delete.
- `WorkspaceEditorPanel` routes Save and Discard toolbar actions through the
  same command registry enabled-state and execution helpers.
- `WorkspaceEditorPanel` consumes framework-neutral editor draft helpers from
  `@newchobo-ui/workspace` for dirty-state, save, and discard behavior.
- The integrated Workbench story wires `@newchobo-ui/runtime` to Chat,
  runtime status, streaming response chunks, and mock workspace write patches.
- The integrated Workbench story has Storybook play coverage for a runtime
  Chat submit that writes a mock workspace file.
- Unit tests cover path operations, search, selection, create, rename, move, and
  delete behavior, workspace editor draft helpers, runtime send/cancel/stream
  events, plus core command menu projection and execution.
- The next migration step is to expand Storybook play coverage around Chat
  cancel/streaming timing and runtime workspace patch edge cases.

## Current Differences From Real Use Cases

The integrated workbench story is closer to an app shell than before, but it is
still not a complete real-use workflow.

| Area                   | Current package behavior                                                                                                                                        | Real-use expectation                                                            | Todo                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Explorer selection     | Controlled file selection props with selected-row styles and selection-aware menu/keyboard/drag targets                                                         | Multi-select should stay aligned through inline edit and drag/drop workflows    | Component play coverage added; keep expanding edge cases  |
| Explorer creation      | Controlled inline create row with root/folder entry and path validation                                                                                         | New file/folder at root or inside a folder                                      | Component play coverage added; add test-runner gate later |
| Explorer rename        | Controlled inline rename row from context menu or `F2`, with path validation                                                                                    | Inline rename, `F2`, blur commit/cancel                                         | Component play coverage added; add blur/cancel variants   |
| Explorer deletion      | Explorer emits controlled delete requests; integrated story confirms file, multi-file, and folder targets                                                       | File, multi-file, and folder deletion with controlled component callbacks       | Component play coverage added; add folder-delete variant  |
| Explorer drag and drop | Explorer emits configurable drag payloads and move requests; story validates and dispatches multi-file moves                                                    | Drag one or many files to folder/root with visual and interaction test coverage | Component play coverage added; add root-drop variant      |
| Search                 | Sidebar search panel owns the controlled query field, clear action, result count, keyboard actions, empty states, and command-backed result menu story coverage | Search panel should share command/menu projection with other workspace surfaces | Add test-runner gate for Search play coverage             |
| Workspace editor       | Monaco editor, tabs, dirty state, command-backed save/discard toolbar actions, command-backed tab context menus, and framework-neutral draft helpers exist      | Tab actions should coordinate with shared workspace state                       | Add delete/open-tab coordination coverage                 |
| Chat                   | Generic chat UI plus integrated mock runtime adapter for send, cancel, streaming chunks, status, and workspace write patches                                    | Runtime-driven send/cancel, streaming chunks, status integration                | Add cancel and streaming timing play coverage             |
| Workbench shell state  | Story-local state only                                                                                                                                          | Active view, sidebar visibility, theme, status, and settings should be reusable | Add shell state contract or controlled shell component    |
| Settings               | Generic settings modal exists                                                                                                                                   | App-specific sections are injected, not hardcoded                               | Keep modal generic and add section/story examples         |
| Storybook              | Integrated story owns too much state and behavior                                                                                                               | Stories should compose components with fixtures and mock adapters               | Move reusable logic into package modules                  |

## Missing Or Incomplete Features From The Reference Workbench

### Explorer

- Multi-file selection:
  - `Ctrl`/`Cmd` toggles a file in the current selection.
  - `Shift` selects a visible range from the current anchor.
  - Selected files remain highlighted separately from the active file.
  - Multi-selection affects context menus, deletion, and drag payloads.
- Inline create:
  - Root-level new file and new folder actions.
  - Folder-level new file and new folder actions.
  - Default names such as `untitled.md` and `new-folder`.
  - Duplicate-name suffixing.
  - Simple-name validation.
  - `Escape` cancel and blur/Enter commit behavior.
  - Component-level Storybook play coverage covers root file creation and
    folder-level file creation.
  - Remaining: root folder, folder-level folder, blur commit, and cancel
    variants in component play coverage.
- Inline rename:
  - File rename.
  - Folder rename.
  - `F2` shortcut.
  - Path conflict validation.
  - Folder rename updates descendant paths, expanded paths, open tabs, and
    selection state.
  - Component-level Storybook play coverage covers `F2` file rename.
  - Remaining: folder rename, conflict validation, blur commit, and cancel
    variants in component play coverage.
- Delete workflows:
  - File delete confirmation.
  - Multi-file delete confirmation.
  - Folder delete confirmation.
  - Recursive folder deletion.
  - Selection and active tab recovery after deletion.
  - Component-level Storybook play coverage covers keyboard file delete and
    selection recovery.
  - Remaining: folder delete and multi-file delete component play variants.
- Drag and drop:
  - Single-file drag through a configurable Explorer drag payload.
  - Multi-file drag through the current Explorer selection.
  - Drop into a folder.
  - Drop to workspace root.
  - Drop target highlight.
  - Invalid drop prevention for same parent or path conflicts through a
    framework-neutral move-plan helper.
  - Component-level Storybook play coverage covers multi-file drop into a
    folder.
  - Remaining: single-file drop, root drop, and invalid-drop component play
    variants.
- Context menus:
  - Root menu: new file, new folder.
  - File menu: open, rename, copy path, delete.
  - Folder menu: new file, new folder, rename, copy path, delete.
  - Multi-select aware delete label and disabled rename state.
- Keyboard support:
  - `F2` rename.
  - `Delete` delete.
  - Focus-visible states on tree rows and inline inputs.

### Search

- Sidebar-oriented search panel instead of a card-style editor panel.
- Query input with clear action.
- Result count in the panel header.
- Empty state for no query.
- Empty state for no results.
- First-result open on `Enter`.
- Query clear on `Escape`.
- Result context menu hook with story coverage for open, copy path, and delete
  actions.
- Result preview and highlighting shared with the search helper.
- Integrated story menus now use core command projection for Search result
  actions.
- Component-level Storybook play coverage uses core command projection for
  Search result menu shortcut metadata, danger styling, copy path, and delete
  execution.
- Remaining: add a test-runner gate if Storybook play functions should become
  part of `pnpm validate`.

### Workspace Editor

- Shared command integration for tab close, close others, close all, copy path,
  delete, save, and discard.
- Framework-neutral draft state helpers so stories do not own editor persistence
  rules.
- Delete confirmation that coordinates with open tabs and selected path.
- Optional split-editor affordance should stay visual-only until a real split
  contract exists.

### Workbench Shell

- Reusable shell component or hook for:
  - active view container,
  - primary sidebar visibility,
  - sidebar size,
  - theme preference,
  - status item model,
  - settings open state.
- Activity bar and primary sidebar command menus consume the generic command
  model in the integrated story.
- Remaining: decide whether shell command definitions should be exported as
  package presets or supplied only by host applications.
- Status bar should accept a generic status model and avoid product-specific
  status labels.

### Chat

- `@newchobo-ui/runtime` provides streaming message fixture support.
- Integrated story send/cancel flow runs through a mock runtime adapter.
- Runtime status maps to composer disabled/running state in the integrated
  story.
- Runtime workspace write patches are applied through the virtual workspace
  reducer in the integrated story.
- Remaining: add focused play coverage for cancellation and chunk-by-chunk
  streaming timing.
- Assistant label should remain configurable and generic.

### Settings

- Keep the current modal, navigation, scope tabs, footer, and section slots.
- Add generic examples for appearance, workspace, permissions, and maintenance
  without binding them to a real runtime.
- Add dirty-state and save/reset examples through controlled props or story
  fixtures.

## Storybook Logic To Move Into Core Modules

Storybook should stop owning reusable behavior. It should provide fixtures,
state adapters, and interaction scenarios.

Move these out of `Workbench.stories.tsx`:

- Workspace fixture helpers:
  - file and folder builders,
  - default open path selection,
  - generic mock content.
- Virtual workspace reducer or hook:
  - files,
  - folders,
  - open paths,
  - selected path,
  - expanded paths,
  - search query,
  - create/write/move/rename/delete/select/close/toggle actions.
- Explorer interaction helpers:
  - visible path calculation,
  - selection range calculation,
  - create/rename validation,
  - drag/drop move validation.
- Command model:
  - `@newchobo-ui/core` now owns the command registry, separator helper, menu
    projection, and command executor.
  - Remaining: shared command definition presets for common workspace, editor,
    and shell actions if the package should provide default command IDs.
- Search helpers:
  - query state,
  - first result activation,
  - result context menu actions.
- Mock runtime helpers:
  - `@newchobo-ui/runtime` now owns message send, cancel, streaming response
    sequence, and mock write-file events.
  - Remaining: story-specific response plans and edge-case play flows.

Keep these in Storybook:

- Public fixture data.
- Scenario-specific initial state.
- Story args and controls.
- `play` interaction tests.
- Visual smoke compositions.

## Mock Runtime Testing Plan

Mock runtime testing is possible and recommended. The package does not need a
real service process to validate workbench UI behavior.

Recommended setup:

1. Add a small `createMockWorkbenchRuntime()` helper under a test or story
   fixture module.
   - Done in `@newchobo-ui/runtime`.
2. Expose generic methods such as `sendMessage`, `cancel`, `subscribe`, and
   `emitWorkspacePatch`.
   - Done in `@newchobo-ui/runtime`.
3. Use Storybook stories to wire the mock runtime to Chat, Search, Explorer,
   and Workspace Editor.
   - Partially done for integrated Chat status, streaming, and workspace write
     patches.
4. Add interaction tests with Storybook `play` functions for:
   - creating a file,
   - renaming a folder,
   - deleting multiple selected files,
   - dragging a file into a folder,
   - opening a search result,
   - sending and cancelling a chat message,
   - streaming an assistant response,
   - applying a mock file write event.
5. Consider adding MSW only if HTTP-style request/response behavior becomes
   part of the public story surface. For the current package, a local mock
   runtime object is lighter and avoids unnecessary network semantics.

## Component Separation Plan

Create or promote these components/modules so stories can test each layer
independently.

| Module                                     | Responsibility                                                       | Story target                                          |
| ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `workspace/WorkspaceExplorer`              | Tree rendering, selection, inline create/rename, context menu hooks  | Explorer selection, create, rename, delete, drag/drop |
| `workspace/WorkspaceSearchPanel`           | Sidebar search input, results, empty states, result menu hooks       | Search empty, results, keyboard, context menu         |
| `workspace/WorkspaceEditorPanel`           | Open tabs, dirty state, Monaco editor, tab menus                     | Save/discard, close actions, delete confirmation      |
| `workspace/useVirtualWorkspace` or reducer | Headless workspace state and file/folder operations                  | Reducer tests and integrated story                    |
| `workbench/WorkbenchShell`                 | Activity bar, sidebar split, editor area, status bar slots           | Shell layout and sidebar toggle                       |
| `@newchobo-ui/core/commands`               | Framework-neutral command registry, execution, and menu projection   | Unit tests and integrated command menu wiring         |
| `workbench/commands`                       | React adapter from resolved command menu items to context menu items | Command menu story and integration tests              |
| `chat/ChatPanel`                           | Message list and composer                                            | Empty, streaming, running, disabled, cancel           |
| `@newchobo-ui/runtime/mockRuntime`         | Public mock send/cancel/stream events and workspace patches          | Chat integration story                                |
| `settings/WorkbenchSettingsModal`          | Generic settings layout and category rendering                       | Scope tabs, search, footer actions                    |

## Recommended Todo Order

1. Extract a headless virtual workspace model.
2. Add unit tests for path operations, create, rename, move, delete, selection,
   and search.
3. Upgrade `WorkspaceExplorer` with create, rename, delete, selection, drag/drop,
   and context menu props.
4. Replace the Storybook explorer mock logic with the new model.
5. Promote `WorkspaceSearchPanel` to the sidebar-oriented real-use component.
   - Done for controlled query, keyboard, empty state, result count, and result
     menu hooks.
6. Add command helpers and use them in Explorer, Search, Editor, ActivityBar,
   and integrated stories.
   - Core command registry, executor, separator, and menu projection helpers are
     implemented.
   - Integrated ActivityBar, Explorer root, Workspace item, and Search result
     menus now use command-backed projection.
   - Editor tab context menus now use command-backed projection.
   - `WorkspaceSearchPanel` result menu story coverage now exercises
     command-backed projection.
   - Editor Save and Discard toolbar actions now use command-backed enabled-state
     and execution.
   - Integrated Workbench command menus now have Storybook play coverage.
   - Remaining: shared command definition presets if the package should provide
     default command IDs.
7. Add mock runtime fixtures for Chat and mock workspace file updates.
   - Done for framework-neutral runtime events, send/cancel/stream helpers,
     and integrated mock workspace write patches.
8. Add Storybook `play` tests for the main workflows.
   - Integrated Chat submit plus runtime workspace write patch coverage added.
   - Remaining: focused cancel, streaming timing, and patch edge cases.
9. Run `pnpm validate` and browser smoke after each major feature group.

## Additional Decisions Needed

- Should the virtual workspace model be part of `@newchobo-ui/react`, or should
  it be split into a framework-neutral package later?
- Should persistence be excluded, optional, or provided through a storage
  adapter?
- Should drag payload names be configurable to avoid coupling host apps to one
  MIME type?
- Should command IDs be exported as package defaults, or should consumers supply
  their own IDs and labels?
- Should folder operations be UI-only callbacks, or should the package provide a
  full reducer with descendant path updates?
- Should Storybook interaction tests be mandatory in `pnpm validate`, or only
  used in targeted UI validation at first?
- Should the package add MSW, or keep mock runtime adapters in plain TypeScript
  until HTTP semantics are needed?
