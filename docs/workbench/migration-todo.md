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

## Current Differences From Real Use Cases

The integrated workbench story is closer to an app shell than before, but it is
still not a complete real-use workflow.

| Area                   | Current package behavior                                        | Real-use expectation                                                                        | Todo                                                    |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Explorer selection     | Single active item only                                         | Multi-select with range and toggle selection                                                | Add selection model and selected-row styles             |
| Explorer creation      | No inline create flow                                           | New file/folder at root or inside a folder                                                  | Add inline create component and validation              |
| Explorer rename        | Context menu item is present in stories, but no rename flow     | Inline rename, `F2`, blur commit/cancel                                                     | Add rename state and input row                          |
| Explorer deletion      | File deletion exists mainly through editor/story handlers       | File, multi-file, and folder deletion with confirmation                                     | Add folder and multi-file delete flows                  |
| Explorer drag and drop | Drop target styling primitive exists, but no file move workflow | Drag one or many files to folder/root                                                       | Add drag payload abstraction and move validation        |
| Search                 | Search utility and result list exist                            | Sidebar search with query field, clear button, result count, keyboard actions, context menu | Promote sidebar search panel as a first-class component |
| Workspace editor       | Monaco editor, tabs, dirty state, save/discard, tab menu exist  | Tab actions should coordinate with shared workspace state                                   | Extract tab and draft state helpers                     |
| Chat                   | Generic chat UI exists                                          | Runtime-driven send/cancel, streaming chunks, status integration                            | Add mock-runtime story adapter and streaming fixture    |
| Workbench shell state  | Story-local state only                                          | Active view, sidebar visibility, theme, status, and settings should be reusable             | Add shell state contract or controlled shell component  |
| Settings               | Generic settings modal exists                                   | App-specific sections are injected, not hardcoded                                           | Keep modal generic and add section/story examples       |
| Storybook              | Integrated story owns too much state and behavior               | Stories should compose components with fixtures and mock adapters                           | Move reusable logic into package modules                |

## Missing Features From The Reference Workbench

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
  - `Escape` cancel and blur commit/cancel behavior.
- Inline rename:
  - File rename.
  - Folder rename.
  - `F2` shortcut.
  - Path conflict validation.
  - Folder rename updates descendant paths, expanded paths, open tabs, and
    selection state.
- Delete workflows:
  - File delete confirmation.
  - Multi-file delete confirmation.
  - Folder delete confirmation.
  - Recursive folder deletion.
  - Selection and active tab recovery after deletion.
- Drag and drop:
  - Single-file drag.
  - Multi-file drag.
  - Drop into a folder.
  - Drop to workspace root.
  - Drop target highlight.
  - Invalid drop prevention for same parent or path conflicts.
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
- Result context menu with open, copy path, and delete actions.
- Result preview and highlighting shared with the search helper.

### Workspace Editor

- Shared command integration for open, close, close others, close all, copy path,
  delete, save, and discard.
- Draft state extraction so stories do not own editor persistence rules.
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
- Activity bar and primary sidebar command menus should consume a generic command
  model rather than story-local menu arrays.
- Status bar should accept a generic status model and avoid product-specific
  status labels.

### Chat

- Streaming message fixture support.
- Send/cancel flow through a mock runtime adapter.
- Runtime status to composer disabled/running state.
- Event-to-message derivation helper that stays product-neutral.
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
  - command definitions,
  - menu item builder,
  - command separator helper,
  - workbench command executor,
  - workspace command executor.
- Search helpers:
  - query state,
  - first result activation,
  - result context menu actions.
- Mock runtime helpers:
  - message send,
  - cancel,
  - streaming response sequence,
  - mock write-file events.

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
2. Expose generic methods such as `sendMessage`, `cancel`, `subscribe`, and
   `emitWorkspacePatch`.
3. Use Storybook stories to wire the mock runtime to Chat, Search, Explorer,
   and Workspace Editor.
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

| Module                                     | Responsibility                                                      | Story target                                          |
| ------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `workspace/WorkspaceExplorer`              | Tree rendering, selection, inline create/rename, context menu hooks | Explorer selection, create, rename, delete, drag/drop |
| `workspace/WorkspaceSearchPanel`           | Sidebar search input, results, empty states, result menu hooks      | Search empty, results, keyboard, context menu         |
| `workspace/WorkspaceEditorPanel`           | Open tabs, dirty state, Monaco editor, tab menus                    | Save/discard, close actions, delete confirmation      |
| `workspace/useVirtualWorkspace` or reducer | Headless workspace state and file/folder operations                 | Reducer tests and integrated story                    |
| `workbench/WorkbenchShell`                 | Activity bar, sidebar split, editor area, status bar slots          | Shell layout and sidebar toggle                       |
| `workbench/commands`                       | Generic command definitions and menu helpers                        | Command menu story and integration tests              |
| `chat/ChatPanel`                           | Message list and composer                                           | Empty, streaming, running, disabled, cancel           |
| `chat/mockRuntime` fixture                 | Public mock send/cancel/stream events                               | Chat integration story                                |
| `settings/WorkbenchSettingsModal`          | Generic settings layout and category rendering                      | Scope tabs, search, footer actions                    |

## Recommended Todo Order

1. Extract a headless virtual workspace model.
2. Add unit tests for path operations, create, rename, move, delete, selection,
   and search.
3. Upgrade `WorkspaceExplorer` with create, rename, delete, selection, drag/drop,
   and context menu props.
4. Replace the Storybook explorer mock logic with the new model.
5. Promote `WorkspaceSearchPanel` to the sidebar-oriented real-use component.
6. Add command helpers and use them in Explorer, Search, Editor, ActivityBar,
   and integrated stories.
7. Add mock runtime fixtures for Chat and mock workspace file updates.
8. Add Storybook `play` tests for the main workflows.
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
