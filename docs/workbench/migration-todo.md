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

### VS Code UX Audit

The current implementation should be compared against public VS Code UX
documentation, not private app behavior.

- Shell layout: VS Code documents editor, primary sidebar, secondary sidebar,
  status bar, activity bar, and panel regions. The package currently covers
  editor, primary sidebar, status bar, and activity bar conventions; secondary
  sidebar and panel are future extension points.
- State restoration: VS Code restores folder, layout, and opened files between
  sessions. The package has reusable virtual workspace state, but persistence
  remains an adapter decision.
- Tabs: VS Code uses editor tabs and supports reorder plus multi-tab actions.
  The package covers tab selection, close, dirty state, context menus, save, and
  discard; tab reorder and multi-tab selection are not modeled yet.
- Settings: VS Code separates user and workspace scopes, supports searchable
  settings, and lets extensions contribute settings. The package covers generic
  scopes, categories, search, dirty state, save, and reset; installed
  contribution settings are not modeled yet.
- Extensions: VS Code installs and manages extensions from an Extensions view,
  command palette, command line, and VSIX packages, with publisher trust,
  recommendations, enable/disable, uninstall, and update concerns. A future
  plugin installation model should adapt installed plugins into command, menu,
  view, and settings contributions instead of mutating component internals.

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
- `@newchobo-ui/react` exposes shell command presets for activity switching,
  primary sidebar toggling, and settings opening.
- `@newchobo-ui/react` exposes editor command presets for save, discard, copy
  path, close, close others, close all, and delete.
- `@newchobo-ui/react` exposes workspace command presets for new file, new
  folder, open/reveal, copy path, rename, and delete menus.
- `@newchobo-ui/react` exposes search result command presets for open, copy
  path, and delete menus.
- `@newchobo-ui/react` exposes a reusable `useWorkbenchShellState` hook and
  reducer for active activity, primary sidebar visibility and size, theme, and
  settings modal state.
- `@newchobo-ui/react` exposes a reusable StatusBar section/item model while
  keeping children-based custom status bar content supported.
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
  folder/root drag-drop flows.
- `WorkspaceSearchPanel` is a sidebar-oriented controlled component with query
  input, clear action, result count, empty states, `Enter` first-result
  activation, `Escape` clear behavior, and result context-menu hooks.
- `WorkspaceSearchPanel` has component-level Storybook play coverage for
  command-backed Search result menus, including shortcut metadata, danger
  styling, copy path, and delete execution.
- The integrated Workbench story uses command-backed menu projection for the
  Activity bar, primary sidebar, Explorer root, Workspace item, and Search
  result context menus.
- The integrated Workbench story consumes shared workspace command presets
  rather than owning local workspace command definitions.
- The integrated Workbench story has Storybook play coverage for command-backed
  Activity bar, Search result, Editor tab, and primary sidebar menu flows.
- `WorkbenchSettingsModal` has component-level Storybook examples for generic
  appearance, workspace, permissions, and maintenance categories.
- `WorkbenchSettingsModal` has component-level Storybook play coverage for
  controlled dirty-state, save, reset, category navigation, and injected
  maintenance actions.
- `WorkspaceEditorPanel` uses command-backed menu projection for editor tab
  context menus including copy path, close, close others, close all, and delete.
- `WorkspaceEditorPanel` routes Save and Discard toolbar actions through the
  same command registry enabled-state and execution helpers.
- `WorkspaceEditorPanel` consumes shared editor command presets rather than
  owning local command definitions.
- `WorkspaceEditorPanel` consumes framework-neutral editor draft helpers from
  `@newchobo-ui/workspace` for dirty-state, save, and discard behavior.
- The integrated Workbench story wires `@newchobo-ui/runtime` to Chat,
  runtime status, streaming response chunks, and mock workspace write patches.
- The integrated Workbench story has Storybook play coverage for a runtime
  Chat submit that writes a mock workspace file.
- `ChatPanel` has component-level Storybook play coverage for mock runtime
  streaming completion, cancellation after the first chunk, workspace write
  patch events, and workspace delete patch events.
- Unit tests cover path operations, search, selection, create, rename, move, and
  delete behavior, workspace editor draft helpers, runtime send/cancel/stream
  events, plus core command menu projection and execution.
- Root package scripts execute tools through `pnpm`, so `npm run <script>`
  delegates script execution to the pnpm-managed toolchain while the pnpm
  lockfile remains the source of truth.
- `@newchobo-ui/core` exposes reusable command menu entry and command
  contribution helpers so built-in presets and future plugin adapters can share
  one command/menu extension shape.
- `@newchobo-ui/react` command presets consume the shared menu entry helpers
  instead of repeating raw command-entry object literals.
- `@newchobo-ui/core` command menu entries support optional `surfaces` metadata so
  one shared command registry can serve different workbench surfaces (for example,
  Explorer, Search, Editor, Settings) with menu filtering done at projection time.
- The next migration step is to expand Storybook play coverage around remaining
  Explorer edge cases or decide whether Storybook play functions should be part
  of `pnpm validate`.

## Current Differences From Real Use Cases

The integrated workbench story is closer to an app shell than before, but it is
still not a complete real-use workflow.

| Area                   | Current package behavior                                                                                                                                        | Real-use expectation                                                            | Todo                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Explorer selection     | Controlled file selection props with selected-row styles and selection-aware menu/keyboard/drag targets                                                         | Multi-select should stay aligned through inline edit and drag/drop workflows    | Component play coverage added; keep expanding edge cases  |
| Explorer creation      | Controlled inline create row with root/folder entry and path validation                                                                                         | New file/folder at root or inside a folder                                      | Component play coverage added; add test-runner gate later |
| Explorer rename        | Controlled inline rename row from context menu or `F2`, with path validation                                                                                    | Inline rename, `F2`, blur commit/cancel                                         | Component play coverage added; add test-runner gate later |
| Explorer deletion      | Explorer emits controlled delete requests; integrated story confirms file, multi-file, and folder targets                                                       | File, multi-file, and folder deletion with controlled component callbacks       | Component play coverage added; add test-runner gate later |
| Explorer drag and drop | Explorer emits configurable drag payloads and move requests; story validates and dispatches multi-file moves, root drops, and blocked conflicts                 | Drag one or many files to folder/root with visual and interaction test coverage | Component play coverage added; add test-runner gate later |
| Search                 | Sidebar search panel owns the controlled query field, clear action, result count, keyboard actions, empty states, and command-backed result menu story coverage | Search panel should share command/menu projection with other workspace surfaces | Add test-runner gate for Search play coverage             |
| Workspace editor       | Monaco editor, tabs, dirty state, command-backed save/discard toolbar actions, command-backed tab context menus, and framework-neutral draft helpers exist      | Tab actions should coordinate with shared workspace state                       | Component play coverage added; add test-runner gate later |
| Chat                   | Generic chat UI plus mock runtime story coverage for send, cancel, streaming chunks, status, workspace write patches, and workspace delete patches              | Runtime-driven send/cancel, streaming chunks, status integration                | Add test-runner gate later if desired                     |
| Workbench shell state  | Reusable shell state hook, shell command presets, and StatusBar item model cover activity, sidebar, theme, settings, and status surfaces                        | Active view, sidebar visibility, theme, status, and settings should be reusable | Add shell component composition only if needed            |
| Settings               | Generic settings modal plus controlled category examples and dirty-state play coverage exists                                                                   | App-specific sections are injected, not hardcoded                               | Add test-runner gate later if desired                     |
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
  - Component-level Storybook play coverage covers root file creation,
    folder-level file creation, root folder creation, folder-level folder
    creation, duplicate-name suffixing, simple-name validation, duplicate-name
    validation, `Escape` cancel, and blur/Enter commit.
  - Remaining: automated test-runner gate if desired.
- Inline rename:
  - File rename.
  - Folder rename.
  - `F2` shortcut.
  - Path conflict validation.
  - Folder rename updates descendant paths, expanded paths, open tabs, and
    selection state.
  - Component-level Storybook play coverage covers `F2` file rename, folder
    rename, conflict validation, `Escape` cancel, and blur commit.
  - Remaining: automated test-runner gate if desired.
- Delete workflows:
  - File delete confirmation.
  - Multi-file delete confirmation.
  - Folder delete confirmation.
  - Recursive folder deletion.
  - Selection and active tab recovery after deletion.
  - Component-level Storybook play coverage covers keyboard file delete,
    multi-file delete, folder delete, and selection recovery.
  - Remaining: automated test-runner gate if desired.
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
  - Component-level Storybook play coverage covers single-file root drop and
    same-parent invalid root drop recovery.
  - Component-level Storybook play coverage covers path-conflict invalid-drop
    recovery.
  - Component-level Storybook play coverage covers folder/root drop-target
    highlight state.
  - Remaining: automated test-runner gate if desired.
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
- Component-level Search result menus consume shared search result command
  presets rather than owning local command definitions.
- Remaining: add a test-runner gate if Storybook play functions should become
  part of `pnpm validate`.

### Workspace Editor

- Shared command integration for tab close, close others, close all, copy path,
  delete, save, and discard.
- Framework-neutral draft state helpers so stories do not own editor persistence
  rules.
- Delete confirmation that coordinates with open tabs and selected path.
- Component-level `WorkspaceEditorPanel` stories cover tab selection, close
  recovery, close-all empty state, delete confirmation, and selected-tab
  recovery after deleting active and inactive open files.
- Remaining: add a test-runner gate if these play flows should become mandatory
  in `pnpm validate`.
- Optional split-editor affordance should stay visual-only until a real split
  contract exists.

### Workbench Shell

- Reusable shell component or hook for:
  - active view container: done through `useWorkbenchShellState`,
  - primary sidebar visibility: done through `useWorkbenchShellState`,
  - sidebar size: done through `useWorkbenchShellState`,
  - theme preference: done through `useWorkbenchShellState`,
  - settings open, navigation, scope, and search state: done through
    `useWorkbenchShellState`,
  - status item model: done through `StatusBar` section and item models.
- Activity bar and primary sidebar command menus consume the generic command
  model in the integrated story.
- Shell command presets are exported for activity switching, primary sidebar
  toggling, and settings opening.
- Status bar accepts generic section and item models while still supporting
  custom children for host-rendered content.

### Chat

- `@newchobo-ui/runtime` provides streaming message fixture support.
- Integrated story send/cancel flow runs through a mock runtime adapter.
- Runtime status maps to composer disabled/running state in the integrated
  story.
- Runtime workspace write patches are applied through the virtual workspace
  reducer in the integrated story.
- Component-level `ChatPanel` stories cover streaming completion, cancellation
  timing, workspace write patch logging, and workspace delete patch logging.
- Remaining: add a test-runner gate if these play flows should become mandatory
  in `pnpm validate`.
- Assistant label should remain configurable and generic.

### Settings

- Keep the current modal, navigation, scope tabs, footer, and section slots.
- Generic component-level examples cover appearance, workspace, permissions, and
  maintenance without binding them to a real runtime.
- Component-level Storybook play coverage validates controlled dirty-state,
  save, reset, category navigation, and injected maintenance actions.
- Remaining: add a test-runner gate if these play flows should become mandatory
  in `pnpm validate`.

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
  - `@newchobo-ui/core` now owns command menu entry and command contribution
    helpers for built-in and future installed-plugin command sources.
  - `@newchobo-ui/react` now owns shell command presets for activity switching,
    primary sidebar toggling, and settings opening.
  - `@newchobo-ui/react` now owns editor command presets for save, discard,
    copy path, close, close others, close all, and delete.
  - `@newchobo-ui/react` now owns workspace and search result command presets
    for common Explorer, Search, and integrated workbench menus.
- Search helpers:
  - query state,
  - first result activation,
  - result context menu actions.
- Workbench shell state:
  - active activity,
  - primary sidebar visibility and size,
  - theme preference,
  - settings modal open, category, scope, and search state,
  - reusable status bar sections and items.
- Mock runtime helpers:
  - `@newchobo-ui/runtime` now owns message send, cancel, streaming response
    sequence, and mock write-file events.
  - `ChatPanel` stories now own focused streaming, cancellation, write patch,
    and delete patch response plans.
  - Remaining: decide whether these play flows should be included in automated
    validation beyond Storybook build and browser smoke.

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

| Module                                     | Responsibility                                                      | Story target                                          |
| ------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `workspace/WorkspaceExplorer`              | Tree rendering, selection, inline create/rename, context menu hooks | Explorer selection, create, rename, delete, drag/drop |
| `workspace/WorkspaceSearchPanel`           | Sidebar search input, results, empty states, result menu hooks      | Search empty, results, keyboard, context menu         |
| `workspace/WorkspaceEditorPanel`           | Open tabs, dirty state, Monaco editor, tab menus                    | Save/discard, close actions, delete confirmation      |
| `workspace/useVirtualWorkspace` or reducer | Headless workspace state and file/folder operations                 | Reducer tests and integrated story                    |
| `workbench/WorkbenchShell`                 | Activity bar, sidebar split, editor area, status bar slots          | Shell layout and sidebar toggle                       |
| `workbench/StatusBar`                      | Generic status sections and status item projection                  | Model-based status footer                             |
| `@newchobo-ui/core/commands`               | Framework-neutral command registry, execution, and menu projection  | Unit tests and integrated command menu wiring         |
| `workbench/commands`                       | React adapter plus shell, editor, workspace, and search presets     | Command menu story and preset tests                   |
| `chat/ChatPanel`                           | Message list and composer                                           | Empty, streaming, running, disabled, cancel           |
| `@newchobo-ui/runtime/mockRuntime`         | Public mock send/cancel/stream events and workspace patches         | Chat integration story                                |
| `settings/WorkbenchSettingsModal`          | Generic settings layout and category rendering                      | Scope tabs, search, footer actions                    |

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
   - Shell command presets are exported and covered by unit tests.
   - Editor command presets are exported and covered by unit tests.
   - Workspace and Search result command presets are exported and covered by
     unit tests.
7. Add mock runtime fixtures for Chat and mock workspace file updates.
   - Done for framework-neutral runtime events, send/cancel/stream helpers,
     and integrated mock workspace write patches.
8. Add Storybook `play` tests for the main workflows.
   - Integrated Chat submit plus runtime workspace write patch coverage added.
   - Component-level Chat streaming, cancel, write patch, and delete patch
     coverage added.
   - Component-level Explorer root-drop and same-parent invalid-drop coverage
     added.
   - Component-level Explorer blur/cancel, folder delete, and path-conflict
     invalid-drop coverage added.
   - Component-level Explorer duplicate-name validation, default name
     suggestion, rename conflict/folder rename, and multi-file delete coverage
     added.
   - Component-level Explorer drop-target highlight coverage added.
   - Component-level Settings dirty-state, save/reset, category navigation, and
     maintenance action coverage added.
   - Remaining: optional automated test-runner gate.
9. Extract reusable shell state.
   - Done for active activity, primary sidebar visibility and size, theme, and
     settings modal state.
   - Done for generic StatusBar section and item models.
   - Done for shell command presets.
10. Run `pnpm validate` and browser smoke after each major feature group.

## Additional Decisions Needed

- Which additional workspace helpers should be exported from
  `@newchobo-ui/workspace` versus kept as React story-local examples?
- Should persistence be excluded, optional, or provided through a storage
  adapter?
- Which folder operations should stay as controlled UI callbacks, and which
  should be demonstrated through the `@newchobo-ui/workspace` reducer?
- Should StatusBar items support host-provided ordering/grouping metadata beyond
  the current section and item arrays?
- Should Storybook interaction tests be mandatory in `pnpm validate`, or only
  used in targeted UI validation at first?
- Should accidental `npm install` be hard-blocked, or is the current
  documentation plus `package-lock=false` guard sufficient?
- Should future plugin installation track publisher trust, enabled/disabled
  state, update state, recommendations, and per-workspace installation scope,
  or start with command/view/settings contributions only?
- Should installed plugin contributions be merged into one command registry, or
  scoped per surface such as Activity Bar, Explorer, Search, Editor, Settings,
  and Status Bar? (Partially implemented: single-registry + `surfaces` filtering.)
- Should the package add MSW, or keep mock runtime adapters in plain TypeScript
  until HTTP semantics are needed?

## 확인 필요사항

- Settings 커맨드의 surface 바인딩은 Activity Bar 전용으로 둘지, Settings 전용으로 둘지,
  아니면 `activityBar`와 `settings` 모두 허용할지 최종 확정이 필요합니다.
- `resolveCommandMenuItems(..., surface)`를 호출하지 않고 메뉴를 결합하는 통합 지점이
  향후 추가되지 않도록, 새 통합 지점에서 policy 준수 여부 점검이 필요합니다.
- 플러그인 기여가 기존 명령(`commandId`)과 충돌할 때 우선순위/오버레이 규칙(기본
  기여 우선, 설치 기여 우선, 또는 오류 강제 중단)을 명확히 해야 합니다.
- Storybook `play` 시나리오를 `pnpm validate`의 필수 게이트로 올릴지에 대한 최소
  기준(Explorer/Search/Editor/Chat 중 어떤 흐름이 mandatory인지)을 확정해야 합니다.
- `surface` 제약이 단일 surface(`'search'`)만 허용해야 하는지, 아니면 다중 surface
  설정이 필요한 케이스를 위해 배열/목록 확장 정책이 필요한지 정리해야 합니다.
- `pnpm test:storybook-play`는 현재 `@storybook/test-runner` 미설치로 스킵됩니다.  
  이 검증을 `pnpm validate:full`에서 필수로 돌릴지, 또는 별도 실행 의존성으로
  유지할지 결정이 필요합니다.

## Milestone Decisions Completed

- Drag payload metadata is implemented in `WorkspaceExplorer` via optional metadata
  payload support (`dragMetadataFactory`) while preserving path-list MIME as the base
  contract.
- Command preset label/icon/shortcut overrides are implemented in command preset
  constructors.
- Explorer root context menus in the integrated Workbench story now use
  `WORKBENCH_COMMAND_SURFACE_WORKSPACE` with workspace-only create menu entries,
  so mixed-menu surface behavior is explicitly constrained in Storybook.

## Recommended Decision Order

The following order keeps risk low while moving toward a public, reusable
workbench platform:

1. **Policy and guardrails**
   - Decide hard package-manager enforcement, then make it executable in tooling.
   - Decide Storybook interaction test inclusion in `pnpm validate`.
2. **Command and menu surface behavior**
   - Decide label/icon override and command grouping/ordering metadata.
   - Decide plugin command contribution merge strategy.
3. **Workspace API shape**
   - Decide which helpers are exported from `@newchobo-ui/workspace`.
   - Decide folder/file operations that stay as reducer actions versus host callbacks.
4. **Runtime and integration model**
   - Decide storage/persistence model and plugin installation scope.

## Proposed Answers (subject to approval)

- **pkg manager hard-block (`npm install`)**: enforce pnpm through a local guard
  script to avoid accidental lockfile drift.
- **storybook play in `pnpm validate`**: keep optional for now; make it mandatory
  after low-flake coverage stabilizes.
- **mixed-menu policy for `resolveCommandMenuItems`**: do not allow surface-less
  calls in integration code paths that intentionally compose multiple menu
  sources; if a menu is context-specific, pass a surface explicitly.
- **workspace helper exports**: export neutral domain helpers in
  `@newchobo-ui/workspace` (path/tree/search/selection/mutations); keep fixture
  builders and state adapters in Storybook/tests.
- **persistence**: provide optional storage adapter; no built-in persistence side effect.
- **drag payload metadata**: keep path-list MIME as the base contract, allow optional
  `metadata` extension fields.
- **label/icon override**: add lightweight override support in command preset
  constructors.
- **folder operation ownership**: reducer updates shared state and conflict checks;
  host callbacks handle confirmation, I/O side effects, and domain prompts.
- **StatusBar ordering/grouping**: keep section/item arrays, add optional ordering
  metadata for host merges and deterministic rendering.
- **plugin install lifecycle**: start with command/view/settings contributions first;
  extend trust / enable-disable / recommendations / updates after contribution APIs
  are stable.
- **plugin contribution merge**: use one registry with surface filters in the current
  architecture.
- **MSW vs TS mock**: keep plain TS mock runtime until HTTP transport is part of
  public surface.

## Clarification Checklist

- Which recommendation becomes the gate for the next milestone?
- What is the minimum acceptance criteria for plugin-contribution support?
- Which Storybook interaction flows must be mandatory for CI baseline confidence?

## Current Verification Baseline (2026-06-03)

- `pnpm validate` passes on clean working tree (typecheck/lint/test/format/storybook build).
- `pnpm test:storybook-play` currently exits `0` with explicit skip notice because
  `@storybook/test-runner` is not installed.
- `Workspace.stories.tsx` integration menu wiring now passes surface through:
  - workbench/activity menus: `WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR`
  - explorer root menu: `WORKBENCH_COMMAND_SURFACE_WORKSPACE`
  - workspace item menus: `WORKBENCH_COMMAND_SURFACE_WORKSPACE`
  - search panel menu: `WORKBENCH_COMMAND_SURFACE_SEARCH`
  - editor tab menus: `WORKBENCH_COMMAND_SURFACE_EDITOR`
- `migration-todo.md` now records that explorer root 메뉴 is constrained to
  workspace-only menu entries in Storybook integration.

## Next Clarification Questions (for next milestone)

- Which Storybook `play` flows are mandatory by default in CI?
  - Suggested minimum (for confidence with low flake risk): Explorer root/create+rename,
    multi-file delete, Search open/copy/delete one path, Editor close/save/discard,
    Chat send/cancel/first chunk.
- Should `play` execution remain optional while adding `@storybook/test-runner`
  later, or become part of `validate:full` immediately once flake profile is measured?
- For plugin command conflicts, which policy is chosen first: override-by-source,
  source-order overlay, or hard error on duplicate `commandId`?
- Should settings surface for `workspace.openSettings` remain dual surface or be narrowed?
