# WorkbenchStandaloneShell — Public Host Contract

`WorkbenchStandaloneShell` is the primary React entry for composing a VS Code–style
workbench without product-specific runtime wiring. Host apps (Storybook demos,
integrating host apps) supply bootstrap data and render callbacks; the shell owns
chrome layout, activity routing, settings modal visibility, and theme state.

## Responsibilities

| Layer                      | Owns                                                                                                                                      | Does not own                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `WorkbenchStandaloneShell` | Activity bar, primary sidebar slot, secondary editor area, status bar, settings modal open/close, theme and sidebar visibility/size state | Workspace file I/O, chat transport, patch/save services, confirm dialogs |
| Host render callbacks      | Primary sidebar content (explorer/search/chat), editor panel, overlays (context menus, delete confirms)                                   | Shell chrome resize rails beyond provided min/max props                  |
| `bootstrap` contract       | Activity descriptors, command registry reference, optional initial status sections                                                        | Command execution side-effects                                           |

## Bootstrap shape

```ts
interface WorkbenchStandaloneBootstrap<TActivityId> {
  contract: {
    activities: WorkbenchActivityDescriptor<TActivityId>[];
    commandRegistry: CommandRegistry<WorkbenchShellCommandContext<TActivityId>>;
    initialTheme?: WorkbenchTheme;
    statusSections?: StatusBarSectionModel[];
  };
  initialState?: WorkbenchStandaloneEntryState<TActivityId>;
  initialFiles?: WorkspaceFile[];
  workspace?: WorkbenchWorkspaceController;
  chat?: WorkbenchChatController;
  patch?: WorkbenchPatchController;
  save?: WorkbenchSaveController;
  status?: WorkbenchStatusController;
}
```

Fixture defaults for the integrated Storybook host live in
`@workbench-kit/adapters/workbench-demo` and `workbench-demo-config`.

## Context passed to render callbacks

`WorkbenchStandaloneShellContext` is the stable public surface for host wiring:

- **Activity**: `activityId`, `showActivity`, `activateActivity`
- **Chrome**: `isPrimarySidebarVisible`, `togglePrimarySidebar`, `primarySidebarSizePx`, `setPrimarySidebarSizePx`
- **Theme**: `theme`, `setTheme`
- **Settings**: `isSettingsOpen`, `openSettings`, `closeSettings`, `setSettingsCategoryId`, `setSettingsScopeId`, `setSettingsSearchValue`. Host-owned settings overlays may pass `commitMode="immediate"` on `WorkbenchSettingsModal` for VS Code–style apply-on-change (no Apply/Cancel footer; edits via `onPreferenceChange` / `useWorkbenchSettingsCommit`). Default remains `explicit`.
- **Commands**: `commandContext` (`WorkbenchShellCommandContext`) for shell-level menu entries

Hosts must not mutate shell state outside these methods.

## React context for render slots

`WorkbenchStandaloneShell` wraps the chrome tree in a React context provider so
sidebar, editor, overlay, and title-bar slots share one `context` instance without
each host mounting its own provider.

```ts
import { useWorkbenchStandaloneShellContext } from '@workbench-kit/react/workbench';

function SettingsOverlay() {
  const shell = useWorkbenchStandaloneShellContext<MyActivityId, MyTheme>();
  return shell.isSettingsOpen ? <MySettingsModal onClose={shell.closeSettings} /> : null;
}
```

Prefer this hook over threading `context` through props when a slot subtree needs
shell commands from a deep child.

## Shell state sync

Use `onShellStateChange` for persistence, analytics, or logging instead of
duplicating `useEffect` blocks in `renderPrimarySidebar` and `renderOverlays`:

```ts
<WorkbenchStandaloneShell
  onShellStateChange={(change) => {
    if (change.primarySidebarVisibilityChanged) {
      persistSidebarVisibility(change.next.isPrimarySidebarVisible);
    }
  }}
/>
```

`change.kind` is one of `initial`, `activity`, `sidebar-visibility`, `sidebar-size`,
`settings`, or `theme`. `change.previous` is `null` only for the initial callback.

Optional `renderShellHost={(context, shell) => <HostInstrumentation>{shell}</HostInstrumentation>}`
wraps the default shell element once so hosts can add domain providers without
splitting instrumentation across render slots.

## Required render props

| Prop                   | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `renderPrimarySidebar` | Left activity view (explorer, search, chat, etc.)                      |
| `renderSecondaryArea`  | Main editor or artifact surface                                        |
| `renderOverlays`       | Optional modals, context menus, confirm dialogs                        |
| `getStatusSections`    | Optional dynamic status model; falls back to `contract.statusSections` |

## Event hooks

- `onActivityActivate` — fired after activity change; use for status messages or analytics
- `onActivityBarContextMenu` / `onActivityBarItemActivate` — activity bar interactions
- `onStatusItemActivate` — status bar item clicks (theme toggle, sidebar toggle)
- `onEvent` — low-level bootstrap events (`activity-change`, `status-message`)

## Primary sidebar visibility

Hide/show the primary sidebar by toggling visibility state (`isPrimarySidebarVisible`
/ `togglePrimarySidebar`, or `layoutService.setSideBarVisible` in `shell-react`).
Keep the shell `SplitView` mounted — do not conditionally unmount the primary
sidebar node. `WorkbenchShell` adds `ui-workbench-split-view--primary-collapsed`
when `primarySidebar.isVisible` is false so the secondary/editor column expands
via CSS grid instead of disappearing.

Storybook play tests in `WorkbenchShell.stories.tsx` and
`examples/workbench-sample/src/WorkbenchSample.stories.tsx` (`Sidebar toggle`)
assert this layout through shared helpers in
`packages/react/src/workbench/story/shellStory.ts`.

## Command and context-key wiring

Menu projection should use `resolveWorkbenchCommandMenuItems` from
`@workbench-kit/react/workbench/commands` (or `resolveCommandMenuItems` from core)
with an optional `contextKeys` snapshot when commands define `when` clauses.

Integrated shell demo builds context keys via `createIntegratedShellContextKeys` in
`packages/react/src/workbench/demo/integratedShellContextKeys.ts`.

## Reference implementations

- **Storybook**: `IntegratedShellDemo` → `Workbench UI/Shell` → `Integrated Shell`
  (baseline play; pixel sidebar width via Workbench settings)
- **Icon inspector tabs**: `SideBarViewTabStrip` story `Inspector icon tabs` for secondary
  sidebar panes that switch by icon rather than text `TabbedPanels`
- **Orchestration boundary**: demo module owns workspace/runtime wiring; adapters own fixtures

## Editor tab close menu

`WorkbenchStandaloneShell` does not own editor tabs. For secondary-area tab strips, prefer
`WorkbenchEditorTabs` (or `useWorkbenchEditorTabContextMenu` with `EditorTabs`) from
`@workbench-kit/react/editor-tabs` / `@workbench-kit/react/workbench/shell`.

That surface wires Close / Close others / Close all through the shared editor command presets
and respects `closable: false` (Close disabled; skipped by Close others / Close all). Hosts only
supply `tabs`, `onSelect`, and `onClose`.

## Non-goals (host responsibility)

- Dirty-state confirm routing on tab close / delete
- Persistence and storage keys
- Plugin lifecycle transport
- i18n string resolution (deferred — see [future-capabilities.md](./future-capabilities.md))
- JSON widget editor chrome (deferred — port-then-replace; see
  [future-capabilities.md § JSON Widget](./future-capabilities.md#json-widget-port-then-replace-strategy))
