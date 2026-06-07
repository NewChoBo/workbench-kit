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

## Current Cycle Priorities (Standalone First)

- 목표: `@workbench-kit/react` + `@workbench-kit/services` + `@workbench-kit/vscode-host`를 사용한 standalone 런치 안정성 고정.
- 핵심 결론: 현재 UI 동작은 story 조립(`IntegratedWorkbenchShell`)로 구현되어 있으며,
  shell 레이아웃 진입점(`WorkbenchShell`)은 이미 추출되어 있다.
- 이번 사이클 운영 규칙(Cycle Guardrail):
  - `@workbench-kit/vscode-extension`는 대규모 재작업 대신 `commandContribution` 충돌 정책 자동 결정 경로처럼 `standalone` 경로에 영향이 적은 영역만 제한적으로 반영한다.
  - Standalone 런치 정합성이 확보될 때까지 extension 래퍼는 `Track C`로 이월한다.
- 이번 사이클 액션:
  1.  쉘 어셈블리(`WorkbenchShell`)는 추출 완료 상태이므로, 앱 진입점 계약(상태/서비스/커맨드 바인딩)을 정렬한다.
  2.  host runtime/브릿지 에러 격리와 구독 정리 동작을 스토리/통합 시나리오로 회귀 검증.
  3.  `pnpm test:storybook-play:required` + `vscode-host`/`services`/`react` typecheck 통합 게이트 고정.

4. `vscode-extension` bootstrap은 별도 마일스톤(`Track A`)으로 분리하고 문서와 브랜치 플래닝 반영.
5. `vscode-extension` 패키지는 대규모 변경은 이월하고, 이 브랜치에서는 `commandConflictPolicy` 자동 판별/노출 경로만 제한 적용한다.

### Current Cycle Deep-Dive Conclusion

- `@workbench-kit/react` 쪽에서 이미 UI 표면(Explorer/Search/Editor/Chat/Settings/Status)은
  Storybook 통합으로 구현되어 있고, playflow도 확인됨.
- 공백은 기능 부재가 아니라 **조립 계약(export boundary)**이다:
  - `@workbench-kit/react`에서 story형 shell은 가능하나, 앱 진입점으로 쓰기 위해서는 저장/삭제/커맨드 컨텍스트/서비스 주입 계약이 별도 정리되어야 한다.
  - 현재 통합 로직은 `Workbench.stories.tsx`의 `IntegratedWorkbenchShell`에 집중되어 있다.
- 따라서 이번 우선순위는 다음으로 고정:
  1. Track A shell entrypoint 추출 + 인터페이스 계약 고정
  2. Track B host/runtime의 에러 격리/구독 정리/중복 dispose 검증
  3. Track C는 `standalone` 스테이블 이후로 이월

## Target Package Map

The package should evolve beyond a single React package.

| Package                           | Role                                                                                 | Initial source of truth                                    |
| --------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `@workbench-kit/tokens`           | CSS variables, base theme, visual tokens                                             | Existing tokens package                                    |
| `@workbench-kit/core`             | Framework-neutral command registry, context keys, event/disposable helpers           | Architecture reference patterns and VS Code conventions    |
| `@workbench-kit/contracts`        | Cross-package contracts and result/error models for save/chat/patch/domain services  | Contracts package ownership                                |
| `@workbench-kit/workspace`        | Framework-neutral workspace paths, tree, search, selection, mutations, draft helpers | Existing React workspace helpers plus functional behaviors |
| `@workbench-kit/runtime`          | Framework-neutral chat/runtime events, mock runtime, workspace patch adapters        | Product-neutral runtime event shape                        |
| `@workbench-kit/react`            | React primitives and workbench components bound to the neutral packages              | Existing React package and VS Code interaction conventions |
| `@workbench-kit/services`         | Save/chat/patch orchestration services                                               | Existing service implementations and tests                 |
| `@workbench-kit/adapters`         | Story/test adapters for repository and runtime transport                             | Storybook integration needs and adapter tests              |
| `@workbench-kit/vscode-host`      | Host bridge/runtime binding and plugin service adapters                              | vscode-host source and runtime tests                       |
| `@workbench-kit/vscode-extension` | Extension bootstrap wrapper for host package consumers                               | Existing extension bootstrap source                        |
| Story/test fixture modules        | Public mock files, mock messages, scenario adapters                                  | Storybook only unless consumers need them                  |

## Package Skeleton Goals (v0.1, To-Do)

| Package                           | Skeleton Goal (요약)                                                                 | To-Do (핵심만)                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@workbench-kit/tokens`           | 최소한의 디자인 토큰 인터페이스를 export해 테마/모양 일관성을 보장                   | - 라이트/다크 토큰 기본셋 정합성 점검<br>- 토큰 export와 네임스페이스 문서화<br>- 필요 시 컴포넌트 바인딩 가이드 추가                                                                                              |
| `@workbench-kit/core`             | 커맨드 등록/실행/메뉴 투영을 프레임워크 독립적으로 제공                              | - command 충돌/우선순위 정책 문서화<br>- menu `surfaces` 메타 확장 정책 결정<br>- 메뉴/명령 노출 정렬 규칙 테스트 추가                                                                                             |
| `@workbench-kit/contracts`        | 저장/채팅/패치/플러그인 관련 공용 타입을 도메인에 독립된 결과 모델로 표준화          | - 요청 메타(`requestId`/타임스탬프) 기본 계약 고정<br>- plugin lifecycle 계약 최소 필드 확정<br>- 공통 실패 모델(`SaveError` 계열) 사용처 정합성 점검                                                              |
| `@workbench-kit/workspace`        | 경로/트리/검색/선택/드래프트 유틸을 UI에서 독립적으로 재사용 가능한 API로 제공       | - public export 범위 축소(도메인 vs fixture 분리)<br>- path 정규화/이동 계획(move-plan) 테스트 보강<br>- save/draft 경계에서 부수효과 최소화 규칙 정리                                                             |
| `@workbench-kit/runtime`          | 채팅/상태/패치 이벤트의 중립형 런타임 contract와 mock runtime 제공                   | - 이벤트 타입 스키마 문서화<br>- mock runtime 시나리오별 예측 가능한 순서 보장 테스트<br>- 런타임 이벤트 메타 전파 규칙 정리                                                                                       |
| `@workbench-kit/react`            | Storybook 기준 UI 컴포넌트/훅/워크벤치 조립 블록을 앱 조립 가능한 API로 제공         | - Workbench shell 진입점 타입 계약 고정<br>- Integrated story를 fixture 역할로 축소<br>- baseline 9개 시나리오 회귀 토글 자동 유지                                                                                 |
| `@workbench-kit/services`         | 저장/채팅/패치 흐름을 contracts 기반으로 오케스트레이션하고 실패 경계를 명확화       | - callback 실패 격리/리스너 격리 경로 하드닝<br>- metadata 보존 및 상태 전이 테스트 확대<br>- save/patch 동시 처리 경합 케이스 문서화                                                                              |
| `@workbench-kit/adapters`         | story/runtime 계층에 종속적인 adapter를 통해 도메인 계약과 실제 구현을 분리          | - 계약 위임 경계 문서 정리<br>- `create*` factory 실패 케이스 테스트 추가(원격 manifest fetch 실패/reader 누락 포함)<br>- 패키지 export surface 최소화 및 안정화                                                   |
| `@workbench-kit/vscode-host`      | host/runtime bridge와 plugin service adapter의 초기 bootstrap 경로를 안정적으로 제공 | - 구독/해제/재구독 idempotent 처리 점검<br>- 브리지 에러/교착 상태 회복 경로 테스트 보강<br>- plugin 기여 포인트를 wrapper 단계로 분리                                                                             |
| `@workbench-kit/vscode-extension` | standalone 경로 고정 이후 extension wrapper 진입점으로 사용될 기본 조립 API를 준비   | - `createWorkbenchExtensionRuntimeFromContributions`의 `commandConflictPolicy` 유도 경로 보강 및 노출 정리<br>- 충돌 없는 기여군에서 `hard-fail` 전환 정책 반영<br>- 기존 runtime/service 계약과의 1:1 대응표 작성 |
| Story/test fixture modules        | 샘플/검증 시나리오에 필요한 최소 fixture만 유지                                      | - public export에서 제외 대상 정리<br>- story 전용 목 데이터와 어댑터 분리 규칙 강화                                                                                                                               |

## Current Implementation Progress

- `@workbench-kit/core` owns framework-neutral command registry, execution,
  separator, visibility/enabled-state, and menu projection helpers.
- `@workbench-kit/workspace` owns framework-neutral path, tree, search, selection,
  type, editor draft, and virtual workspace model helpers.
- `@workbench-kit/runtime` owns framework-neutral runtime chat message,
  status, workspace patch event types, and a public mock runtime helper for
  send/cancel/stream fixtures.
- `@workbench-kit/react` consumes `@workbench-kit/workspace` and keeps existing
  workspace exports available through the React binding package.
- `@workbench-kit/react` consumes `@workbench-kit/core` through a small adapter that
  converts resolved command menu items into `ContextMenuItem` values.
- `@workbench-kit/react` command descriptors include generic keyword metadata
  and an `agent` execution kind for delegated command surfaces; command
  filtering uses keywords without owning command execution.
- `@workbench-kit/react` exposes `WorkbenchNavigationPanel` for fixed-nav plus
  independently scrolling content layouts, and `WorkbenchSectionedPanel` builds
  on it for settings-like section navigation with active-section tracking.
- `@workbench-kit/react` exposes shell command presets for activity switching,
  primary sidebar toggling, and settings opening.
- `@workbench-kit/react` exposes editor command presets for save, discard, copy
  path, close, close others, close all, and delete.
- `@workbench-kit/react` exposes workspace command presets for new file, new
  folder, open/reveal, copy path, rename, and delete menus.
- `@workbench-kit/react` exposes search result command presets for open, copy
  path, and delete menus.
- `@workbench-kit/react` exposes a reusable `useWorkbenchShellState` hook and
  reducer for active activity, primary sidebar visibility and size, theme, and
  settings modal state.
- `@workbench-kit/react` exposes a reusable StatusBar section/item model while
  keeping children-based custom status bar content supported.
- `WorkspaceExplorer` accepts controlled file selection props and emits
  selection changes for single, toggle, range, and toggle-range interactions.
- Explorer context menus receive selection-aware action paths, and the
  integrated story uses them for multi-file open, copy, and delete confirmation.
- Explorer rows emit selection-aware `F2` rename and `Delete` delete requests so
  host applications can keep confirmation and inline edit state controlled.
- Explorer rows support configurable drag payloads and emit move requests for
  folder and workspace-root drops; `@workbench-kit/workspace` exposes a move-plan
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
  `@workbench-kit/workspace` for dirty-state, save, and discard behavior.
- The integrated Workbench story now initializes command contribution conflict handling
  via `preflightCommandContributionConflict` and drives runtime services through
  `createWorkbenchExtensionRuntimeFromContributions(...)` with conflict policy derived
  from `preflightCommandContributionConflict(...)`.
- The ChatPanel story now builds runtime via `createWorkbenchExtensionRuntimeFromContributions(...)`
  with an in-story repository bridge, so both ChatPanel and IntegratedWorkbenchShell
  use the same command/chat/patch/save service composition surface.
- The integrated Workbench story wires `@workbench-kit/runtime` to Chat,
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
- `@workbench-kit/core` exposes reusable command menu entry and command
  contribution helpers so built-in presets and future plugin adapters can share
  one command/menu extension shape.
- `@workbench-kit/react` command presets consume the shared menu entry helpers
  instead of repeating raw command-entry object literals.
- `@workbench-kit/core` command menu entries support optional `surfaces` metadata so
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

- `@workbench-kit/runtime` provides streaming message fixture support.
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
  - `@workbench-kit/core` now owns the command registry, separator helper, menu
    projection, and command executor.
  - `@workbench-kit/core` now owns command menu entry and command contribution
    helpers for built-in and future installed-plugin command sources.
  - `@workbench-kit/react` now owns shell command presets for activity switching,
    primary sidebar toggling, and settings opening.
  - `@workbench-kit/react` now owns editor command presets for save, discard,
    copy path, close, close others, close all, and delete.
  - `@workbench-kit/react` now owns workspace and search result command presets
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
  - `@workbench-kit/runtime` now owns message send, cancel, streaming response
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
   - Done in `@workbench-kit/runtime`.
2. Expose generic methods such as `sendMessage`, `cancel`, `subscribe`, and
   `emitWorkspacePatch`.
   - Done in `@workbench-kit/runtime`.
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
| `@workbench-kit/core/commands`             | Framework-neutral command registry, execution, and menu projection  | Unit tests and integrated command menu wiring         |
| `workbench/commands`                       | React adapter plus shell, editor, workspace, and search presets     | Command menu story and preset tests                   |
| `chat/ChatPanel`                           | Message list and composer                                           | Empty, streaming, running, disabled, cancel           |
| `@workbench-kit/runtime/mockRuntime`       | Public mock send/cancel/stream events and workspace patches         | Chat integration story                                |
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
  `@workbench-kit/workspace` versus kept as React story-local examples?
- Should persistence be excluded, optional, or provided through a storage
  adapter?
- Which folder operations should stay as controlled UI callbacks, and which
  should be demonstrated through the `@workbench-kit/workspace` reducer?
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

## Open Ambiguity Register (Actionable)

| 항목                               | 현재 근거                                                                                              | 미확정 포인트                                                       | 다음 확인/결정 액션                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openSettings` surface 정책        | `WORKBENCH_OPEN_SETTINGS_COMMAND_ID`가 현재 `activityBar` surface에만 등록됨                           | 추가 surface 확장 여부                                              | Settings surface 확장 필요 시 별도 milestone 결정안으로 이동                                                                                                                    |
| 통합 지점의 surface 누락 방지      | 핵심 호출부는 surface 지정됨(활성 파일/컴포넌트 목록 참조)                                             | 신규 통합 코드의 누락 가능성                                        | `docs/conventions/storybook.md`의 Command Menu Surface Review로 스토리북 리뷰 포인트 문서화 완료                                                                                |
| dirty-state 라우팅 정책            | `WorkspaceEditorPanel`은 상태 변경 이벤트만 emit하고 host callback으로 side-effect를 전달하고 있음     | 저장/버림/삭제 confirm UX는 host가 결정                             | host 통합 지점에서 `isDirty`와 파일 경로 기반 confirm 라우팅 가드를 구현해 `WorkbenchEditorPanel`을 순수 컴포넌트로 유지                                                        |
| plugin lifecycle state 전이 테스트 | `@workbench-kit/vscode-host` `InMemoryPluginLifecycleService` 단위 테스트 추가 완료                    | transport/권한 통합 정책은 별도 마일스톤                            | `workbench` 편입 시 runtime 바인딩/권한 정책을 별도 단계로 정리                                                                                                                 |
| plugin `commandId` 충돌 처리       | `createCommandRegistry`는 Map 기반이라 마지막 등록값 우선(`packages/core/src/commands.test.ts`로 고정) | 소스-확장 충돌 정책의 공개화 부재                                   | `createCommandRegistryFromContributions(..., { conflictPolicy })`를 통해 hard-fail 전환 경로를 노출; 하드오버레이 허용은 `findCommandDefinitionConflicts`가 빈 배열일 때만 허용 |
| Storybook Play 필수 범위           | 필수/선별 2단계 게이트로 정비됨                                                                        | `storybook-play-required`(9개) + `storybook-play-baseline`(총 18개) | `pnpm test:storybook-play:required`는 required 9개만 강제 실행, baseline 태그는 추가 후보 커버리지로 유지                                                                       |
| surface 메타 구조                  | 현재 `surfaces?: string[]` 사용 중                                                                     | 우선순위/그룹 메타가 필요한지 미정                                  | 다중 surface는 현재 구조로 충족되며, StatusBar는 `order` 메타로 순서 정렬 보조를 확정함                                                                                         |
| plugin 설치 범위(기본/확장)        | 시작 단계 제안: command/view/settings 기반                                                             | trust/enable/recommend/update 확장 여부 미정                        | 단계별 출시 플랜(기본→확장) 작성 및 acceptance criteria 분리                                                                                                                    |
| Storybook 테스트 미들웨어 의존성   | `@storybook/test-runner` 미설치 시 스킵                                                                | CI 강제화 시점과 실행 신뢰도 미정                                   | `validate:full` 내 위치 여부와 flake 측정 기준을 먼저 정의                                                                                                                      |
| package-manager 보호 정책          | `preinstall` 가드 존재                                                                                 | 정책 문서/실행 절차 정합성 반영                                     | `docs/conventions/package-manager.md`에 강제 조건과 예외 처리 범위를 정리                                                                                                       |
| workspace API 범위                 | `@workbench-kit/workspace` export 목록과 public API governance 문서 존재                               | story-only fixture/state 어댑터는 public API에서 제외               | `docs/conventions/public-api-governance.md`와 `subpackage-architecture.md`에 export 경계 원칙 반영 완료                                                                         |
| 폴더 작업 소유권                   | reducer와 호스트 콜백 분리 설계가 문서화됨                                                             | host별 권한/알림 UX는 adapter 책임                                  | `workbench-entrypoint-strategy.md`, `standalone-extension-boundary.md`, `host-adapter-samples.md`에 host-callback 규칙 반영 완료                                                |
| StatusBar 정렬/그룹 메타           | `order` 메타가 추가되어 섹션/항목 렌더 순서가 결정됨                                                   | host 병합에서의 deterministic ordering 완성                         | order 오름차순 정렬 + 동순위 삽입 순으로 `StatusBar` 컴포넌트에서 고정 렌더링되며 테스트로 회귀 보장함                                                                          |

## 다음 액션 우선순위

- 완료: workspace API boundary에서 fixture/state adapter 분리 기준 문서화
- 완료(정책 확정): dirty-state 라우팅은 host/adapter 경계로 분리.
  - `@workbench-kit/react`는 dirty state의 보존/검증만 담당하고,
    저장/버림/삭제의 UX 분기(확인 모달, 재저장 유도, 알림)는 상위 호스트/어댑터가 담당.
  - `WorkbenchEditorPanel` 삭제/닫기/저장 트리거는 단순 callback 전달만 수행하며,
    `host`는 `isDirty` 상태를 이용해 필요 시 confirm 라우팅을 주입해야 함.

## Plugin Lifecycle Baseline Acceptance Criteria

| Scope               | Baseline Acceptance                                                                                                                                                     | Status |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Contract state      | `PluginLifecycleState`, `PluginTrustState`, and `PluginEnablementState` are explicit public contract unions.                                                            | done   |
| Host service        | `PluginLifecycleService` exposes install, uninstall, enable, and update without storage or transport ownership.                                                         | done   |
| Duplicate install   | Duplicate `pluginId` install returns `invalid-state` unless `force: true`; force replacement remains host-controlled.                                                   | done   |
| Default install     | Successful install resolves to `state: 'installed'`, `enabled: 'enabled'`, and `trust: 'unknown'` unless preserved.                                                     | done   |
| Failed enable       | Failed plugins cannot be re-enabled through `enable(pluginId, true)` without a separate recovery/update step.                                                           | done   |
| Command conflict    | Duplicate command IDs follow the current command registry policy: source-order overlay / last-write-wins by default.                                                    | done   |
| Contribution scope  | Initial plugin contributions are limited to command, menu, view, and settings metadata; runtime mutation stays outside.                                                 | done   |
| Future hard failure | Hard-error overlay for command conflicts becomes enabled only when startup preflight verifies `findCommandDefinitionConflicts` is empty and fails on any duplicate IDs. | done   |

## Ambiguity Review (2026-06-03)

- Settings command surface policy는 현재 `WORKBENCH_OPEN_SETTINGS_COMMAND_ID`를
  `activityBar` surface에만 등록하여 동작 범위를 결정했습니다. 추후 `settings`
  surface 전용 메뉴 체인이 필요해지면 milestone에서 해당 surface로의 확장 여부를
  별도 결정합니다.
- `resolveCommandMenuItems(..., surface)` surface 전달 규칙은 핵심 통합 포인트에서
  이미 적용되어 있습니다(`packages/react/src/workbench/Workbench.stories.tsx`,
  `WorkspaceEditorPanel.tsx`, `WorkspaceSearchPanel.stories.tsx`). 새 통합 지점 추가 시의
  누락 방지 체크리스트는 `docs/conventions/storybook.md`의 Command Menu Surface Review로
  문서화했습니다.
- 플러그인 기여와 기존 command registry 충돌 정책은 기본값은 정해졌습니다. 현재 구현은
  `createCommandRegistry`의 Map 동작으로 `commandId` 충돌 시 "마지막 등록값 우선"입니다.
  hard-error overlay는 다음 단계로 이월하고, 전환 조건은 `findCommandDefinitionConflicts`가 빈
  배열을 반환하는 경우로 고정합니다. 충돌 발견 시 하드 실패 모드에서는 충돌 기여를 로드하지 않고
  시작 절차를 중단해야 합니다.
- `storybook-play`는 baseline 후보 흐름 18개를 `storybook-play-baseline`로 태깅했고,
  그중 CI 필수 9개는 별도 `storybook-play-required` 태그로 표시했습니다.
  `validate:full`에서 `test:storybook-play:required`는 `storybook-play-required` 9개만 강제 실행합니다.
  대상 플로우: `WorkspaceExplorer/CreateAndRenameFlow`, `WorkspaceSearchPanel/ResultMenuFlow`,
  `WorkspaceSearchPanel/EmptySearchStateFlow`,
  `WorkspaceExplorer/FolderDeleteFlow`,
  `WorkspaceEditorPanel/OpenTabCoordinationFlow`, `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`,
  `ChatPanel/CancelRuntimeFlow`, `ChatPanel/ErrorTransportFlow`, `WorkspaceSearchPanel/KeyboardFlow`.
- 다중 surface 제약은 현재 `surfaces` 배열 기반으로 지원되므로 기능적으로는 준비되어
  있습니다. 배열에 우선순위/그룹 메타가 필요한지 여부는 향후 plugin 병합 정책과 함께
  결정해야 합니다.
- 플러그인 기여 범위는 command/view/settings 레벨부터 시작하는 방향이 실무적으로
  합리적이지만, publisher trust / enable-disable / update lifecycle까지 확장할지 여부는
  별도 단계에서 결정해야 합니다.

## 확인 필요사항

| 항목                        | 상태       | 모호 포인트                                     | 다음 확인/결정 액션                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storybook play 필수 게이트  | 반영됨     | 실행 채널 확정 (`storybook-play-required` 전용) | `test:storybook-play:required`가 `validate:full`에서 실행되도록 전환됨                                                                                                                                                                                                                                                                                                  |
| Play 플로우 최소 기준       | 반영됨     | 필수 baseline 9개 흐름 확정                     | `WorkspaceExplorer/CreateAndRenameFlow`, `WorkspaceSearchPanel/ResultMenuFlow`, `WorkspaceSearchPanel/EmptySearchStateFlow`, `WorkspaceExplorer/FolderDeleteFlow`, `WorkspaceEditorPanel/OpenTabCoordinationFlow`, `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`, `ChatPanel/CancelRuntimeFlow`, `ChatPanel/ErrorTransportFlow`, `WorkspaceSearchPanel/KeyboardFlow` |
| `openSettings` surface 정책 | 반영됨     | settings surface 확장 타이밍 미확정             | settings 전용 surface는 전용 메뉴 체인 필요 시 별도 milestone에서 도입                                                                                                                                                                                                                                                                                                  |
| plugin command 충돌 정책    | 반영됨     | 하드오버레이 전환 조건 확정                     | 기본은 `last-write-wins`; hard-error overlay는 `findCommandDefinitionConflicts` 빈 결과 시에만 단계적 적용                                                                                                                                                                                                                                                              |
| surface 메타 구조           | 반영됨     | 정렬/그룹 메타 보완 완료                        | `string[] surfaces`로 `command/menu` 동작은 충족되며, StatusBar는 `order` 메타로 deterministic 렌더 순서를 보완함                                                                                                                                                                                                                                                       |
| plugin 기여 범위(기본/확장) | 1차 반영됨 | trust/recommend/update 확장 범위 미정           | 1차 기여는 `command/view/settings`로 고정, 2차 확장은 리스크/스토리/변경 범위 기준으로 별도 정량문턱치 설정                                                                                                                                                                                                                                                             |
| package-manager 운영 정책   | 반영됨     | 예외 시나리오 문서화 완료                       | `docs/conventions/package-manager.md`가 pnpm 설치/스크립트/예외 처리 정책과 `preinstall` 가드 근거를 문서화                                                                                                                                                                                                                                                             |
| workspace API boundary      | 반영됨     | fixture/state adapter는 public API 제외         | `@workbench-kit/workspace`는 경로/트리/검색/선택/드래프트/가상 workspace helper를 export하고, story-only fixture는 테스트/스토리 전용으로 분리                                                                                                                                                                                                                          |
| folder 작업 소유권          | 반영됨     | host별 권한/알림 UX는 adapter 책임              | reducer는 상태변경·검증, host callback/adapter는 I/O/확인/알림/권한 분기 담당                                                                                                                                                                                                                                                                                           |
| StatusBar merge 정렬        | 반영됨     | deterministic ordering 메타 미정                | `StatusBarSectionModel`/`StatusBarItemModel` `order` 메타로 오름차순 우선 정렬, 동순위는 삽입 순 고정을 적용하여 회귀 테스트로 검증됨                                                                                                                                                                                                                                   |

## Milestone Decisions Completed

- Drag payload metadata is implemented in `WorkspaceExplorer` via optional metadata
  payload support (`dragMetadataFactory`) while preserving path-list MIME as the base
  contract.
- Command preset label/icon/shortcut overrides are implemented in command preset
  constructors.
- Explorer root context menus in the integrated Workbench story now use
  `WORKBENCH_COMMAND_SURFACE_WORKSPACE` with workspace-only create menu entries,
  so mixed-menu surface behavior is explicitly constrained in Storybook.
- Storybook command-backed menu reviews now require explicit surface scoping for
  host-like integration paths via `docs/conventions/storybook.md`.
- Package-manager policy is documented in `docs/conventions/package-manager.md`
  and aligned with the existing `preinstall` guard and `.npmrc` note.
- Workspace API boundary is documented through
  `docs/conventions/public-api-governance.md` and the package role map in
  `docs/workbench/subpackage-architecture.md`; `@workbench-kit/workspace` exports
  neutral path/tree/search/selection/draft/virtual workspace helpers while
  story-only fixture wiring stays outside public entrypoints.
- Folder operation ownership follows the same host-callback boundary: workspace
  reducers and helpers own path/state validation, while hosts or adapters own
  confirmation, storage I/O, permission checks, notifications, and telemetry.

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
   - Keep neutral helpers exported from `@workbench-kit/workspace`.
   - Keep folder/file side effects behind host callbacks or adapters; add
     adapter-specific tests when a new side-effect path is introduced.
4. **Runtime and integration model**
   - Decide storage/persistence model and plugin installation scope.

## Proposed Answers (subject to approval)

- **pkg manager hard-block (`npm install`)**: reflected in
  `docs/conventions/package-manager.md`; pnpm is enforced through the local
  `preinstall` guard to avoid accidental lockfile drift.
- **storybook play in `pnpm validate`**: run baseline-tagged interaction tests in
  `validate:full` using `test:storybook-play:required`; extend scope after flake
  profile review.
- **mixed-menu policy for `resolveCommandMenuItems`**: do not allow surface-less
  calls in integration code paths that intentionally compose multiple menu
  sources; if a menu is context-specific, pass a surface explicitly.
- **openSettings surface policy**: expose `workbench.openSettings` on
  `activityBar` surface only for the initial package baseline; add
  `settings`-surface contributions only when a dedicated settings command
  surface is introduced.
- **workspace helper exports**: reflected by `@workbench-kit/workspace` exports
  and public API governance; neutral path/tree/search/selection/draft/virtual
  workspace helpers are public, while fixture builders and story-only state
  adapters remain in Storybook/tests.
- **persistence**: provide optional storage adapter; no built-in persistence side effect.
- **drag payload metadata**: keep path-list MIME as the base contract, allow optional
  `metadata` extension fields.
- **label/icon override**: add lightweight override support in command preset
  constructors.
- **folder operation ownership**: reflected by the standalone entrypoint and host
  adapter docs; reducer updates shared state and conflict checks, while host
  callbacks handle confirmation, I/O side effects, permissions, and domain
  prompts.
- **StatusBar ordering/grouping**: keep section/item arrays, add optional ordering
  metadata for host merges and deterministic rendering.
- **plugin install lifecycle**: start with command/view/settings contributions first;
  extend trust / enable-disable / recommendations / updates after contribution APIs
  are stable.
- **plugin contribution merge**: use one registry with surface filters in the current
  architecture.
- **plugin hard-fail migration**: keep `last-write-wins` as default and enable hard-fail mode only when merged command
  contribution sets pass `createCommandRegistryFromContributions(..., { conflictPolicy: 'hard-fail' })`
  (or equivalent `assertNoCommandDefinitionConflicts(...)` / `findCommandDefinitionConflicts(...).length === 0`),
  with failures surfaced from collected `commandId` and source index metadata (`duplicate indices`).
- **MSW vs TS mock**: keep plain TS mock runtime until HTTP transport is part of
  public surface.

## Clarification Checklist

- Which recommendation becomes the gate for the next milestone?
- What is the minimum acceptance criteria for plugin-contribution support?
- Which Storybook interaction flows must be mandatory for CI baseline confidence?

## Decision Checklist with Acceptance Criteria

| 결정 항목                                      | 상태              | 우선순위 | 승인 기준(문서화된 증빙)                                                                                                                              |
| ---------------------------------------------- | ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings surface 바인딩 정책 (`openSettings`)  | 반영됨            | P1       | `workbench.openSettings`는 현재 `activityBar` surface에만 노출되며, `packages/react/src/workbench/commands.test.ts`의 신규 테스트로 고정              |
| 통합 지점에서 Surface 누락 허용 여부           | 반영됨(코드 레벨) | P1       | `resolveCommandMenuItems` 호출부에 surface 전달 규칙 문서 + 통합 컴포넌트에서 surface 미지정 호출 부재 확인                                           |
| 플러그인 명령 충돌 정책                        | 기본정책 확정     | P1       | 동일 `commandId` 충돌 시 동작은 `last-write-wins`. 근거: `packages/core/src/commands.test.ts`의 충돌 동작/감지 테스트                                 |
| dirty-state 라우팅 (`save`/`discard`/`delete`) | 반영됨            | P2       | `WorkspaceEditorPanel`은 dirty 상태를 계산해 UI 상태를 노출하고 호스트가 `onSaveFile`, `onDeletePath` 등 confirm callback으로 삭제/저장 라우팅을 소유 |
| 플러그인 명령 충돌 hard-fail 전환 조건         | 완료              | P1       | 충돌 없는 기여군(`findCommandDefinitionConflicts` 결과 빈 배열)만 hard-fail으로 이동할 수 있으며, 충돌 발견 시 시작/CI 실패를 강제                    |
| `storybook-play` CI 필수화 범위                | 반영됨            | P1       | `storybook-play-required` 9개 플로우만 `validate:full`에서 강제 실행하고, `storybook-play-baseline`는 선택 후보 레이어로 보관                         |
| 다중 surface 메타 확장 필요성                  | 반영됨            | P2       | 현재 `surfaces?: string[]`로 요구사항 충족. 추가 group/우선순위 확장은 별도 P3 백로그로 분리해 필요 시 계약/테스트 동반 도입                          |
| 플러그인 기여 범위(기본/확장)                  | 1차 반영됨        | P3       | command/view/settings는 baseline으로 고정; publisher trust/추천/업데이트 확장은 별도 단계에서 정의                                                    |

## Current Verification Baseline (2026-06-03)

- `pnpm validate` passes on clean working tree (typecheck/lint/test/format/storybook build).
- `pnpm test:storybook-play` now runs baseline-tagged storybook interaction tests (default),
  auto-starting Storybook on `http://127.0.0.1:6010` if needed.
- Baseline 태그는 현재 9개 시나리오를 요구합니다:  
  `WorkspaceExplorer/CreateAndRenameFlow`, `WorkspaceSearchPanel/ResultMenuFlow`,
  `WorkspaceSearchPanel/EmptySearchStateFlow`, `WorkspaceExplorer/FolderDeleteFlow`,
  `WorkspaceEditorPanel/OpenTabCoordinationFlow`, `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`,
  `ChatPanel/CancelRuntimeFlow`, `ChatPanel/ErrorTransportFlow`, `WorkspaceSearchPanel/KeyboardFlow`.
- `test:storybook-play:required` is used by `validate:full` and fails fast when dependencies
  or command prerequisites are missing.
  - workbench/activity menus: `WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR`
  - explorer root menu: `WORKBENCH_COMMAND_SURFACE_WORKSPACE`
  - workspace item menus: `WORKBENCH_COMMAND_SURFACE_WORKSPACE`
  - search panel menu: `WORKBENCH_COMMAND_SURFACE_SEARCH`
  - editor tab menus: `WORKBENCH_COMMAND_SURFACE_EDITOR`
  - chat transport failure path: `ChatPanel/ErrorTransportFlow`
- `packages/react/src/workbench/commands.test.ts` now verifies `workbench.openSettings` is
  exposed only on `WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR` and not on `settings` surface.
- `migration-todo.md` now records that explorer root 메뉴 is constrained to
  workspace-only menu entries in Storybook integration.
- `packages/core/src/commands.test.ts` now verifies 충돌시 마지막 `commandId` 등록값이 실제 실행 커맨드를 결정함을 확인합니다.

## Downstream Migration Bridge (Done)

- [x] **custom_launcher Bridge Execution**
  - Replace launch target parsing/normalization with `@workbench-kit/contracts` mapping helpers.
  - Update payload shape for execution requests (`launchType`, `target`, `workingDirectory`, `arguments`).
  - Add one parity test per launch type (`app`, `file`, `folder`, `url`) and blank-target case.
- [x] **tile_paper Bridge Execution**
  - [x] Route provider-library action derivation to `provider-library-mapping` helpers.
  - [x] Align JSON widget event types to `WidgetRendererEventKind` (`press`, `change`) and shape.
  - [x] Add parity tests for action payload and renderer event mapping.

- [x] `library-launch-migration-runbook.md` execution checklist is adopted by each downstream repo (`custom_launcher`, `tile_paper`) PR.
- [x] `custom_launcher` launch paths call `@workbench-kit/contracts` launchpad rules directly
  - execution path now routes through `resolveLaunchpadLibraryItemMapping` for live bindings and
    `normalizeLaunchTarget` for pre-bound snapshot targets, so `target` normalization remains centralized.
    (`launchType`, `workingDirectory`, target trim).
- [x] `tile_paper` provider-library action derivation and JSON widget event types align with
      `WidgetRenderer*` contracts.
- [x] Both apps pass regression gates with per-sample equivalence checks for
      `launchType`/`file`/`folder`/`url`, `arguments`, `subtitle`, and `canLaunch`.
  - Verified in `custom_launcher` and `tile_paper` regression test runs against equivalent execution payload expectations.

Last verified: 2026-06-07.

- `pnpm test:storybook-play:required` (`storybook-play-required` 9개) run: 2026-06-07 기준 5회 연속 실행 모두 통과 (1회도 실패 없음).
- `pnpm -C newchobo-ui-package exec node scripts/check-launch-boundary.mjs`: `Launch boundary check passed.`

Next gate:

- [x] `@workbench-kit/contracts` is the single launch/event authority in both
      downstream runtimes; remaining legacy references are compatibility shim usages only.
  - Legacy implementation notes were removed from runtime call paths in `custom_launcher`
    and `tile_paper`.
- [x] Runtime boundary gate is enforced: only `shared/launch-target` shim/test paths
      are allowed to reference old helpers; all runtime paths in `custom_launcher`/`tile_paper`
      must use `@workbench-kit/contracts` policy exports.
  - Enforced via `pnpm check:launch-boundary` (`scripts/check-launch-boundary.mjs`).
- [x] Run [library-launch-boundary-gate.md](./library-launch-boundary-gate.md) before Phase 2 close.
  - PR 리뷰 체크리스트는 [library-launch-boundary-review-checklist.md](./library-launch-boundary-review-checklist.md) 사용.

## Next Clarification Questions (for next milestone)

- Next mandatory baseline expansion candidates:
  - 현재 baseline 9개(Explorer create+rename, Search result menu, Search empty state,
    Folder delete, Editor tab coordination/recovery, Chat cancel, Chat transport error,
    Workspace keyboard interaction)는 완료되었으며, `validate:full` 필수 목록에 반영했습니다.
  - 다음 후보는 회귀 가치가 높은 interaction/에러 경로 중에서 다음 단계에서 선별합니다.
  - 현재 `storybook-play-required`(9개):  
    `WorkspaceExplorer/CreateAndRenameFlow`, `WorkspaceSearchPanel/ResultMenuFlow`,
    `WorkspaceSearchPanel/EmptySearchStateFlow`, `WorkspaceExplorer/FolderDeleteFlow`,
    `WorkspaceEditorPanel/OpenTabCoordinationFlow`, `WorkspaceEditorPanel/DeleteOpenTabRecoveryFlow`,
    `ChatPanel/CancelRuntimeFlow`, `ChatPanel/ErrorTransportFlow`, `WorkspaceSearchPanel/KeyboardFlow`.
  - 현재 `storybook-play-baseline` 후보층(9개, 비필수):  
    `ArtifactShell/SplitMode`, `ConfirmationFlow/FlowStates`, `StatusModel/SharedStatusSurfaces`,
    `StructuredArtifactEditor/Interaction`, `Timeline/OrderedOperationTimeline`,
    `Workbench/IntegratedShell`, `SchemaForm/EditableSettings`,
    `StructuredDataForm/SectionedData`, `MultiProviderExplorer/MultipleProviders`.
- `storybook-play-baseline` 범위 확장은 다음 조건에서 진행합니다.
  - 해당 플로우가 회귀 케이스를 1개 이상 증가시키고, flake율이 `5회 연속 실행`에서
    `≤1회` 실패인지 점검된 경우.
  - 실행 채널은 기존 `validate:full` 체계(`test:storybook-play:required`)를 유지하고,
    신규 플로우는 `storybook-play-baseline` 태그만 추가해 선별 등록합니다.
- For plugin command conflicts, 기본값은 source-order overlay(`last-write-wins`)이며,
  hard-error는 `findCommandDefinitionConflicts` 결과가 빈 배열일 때 다음 마일스톤에서 순차적으로 적용합니다.
