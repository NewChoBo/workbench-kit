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
- **Chrome**: `isPrimarySidebarVisible`, `togglePrimarySidebar`, `primarySidebarSizePercent`, `setPrimarySidebarSizePercent`
- **Theme**: `theme`, `setTheme`
- **Settings**: `isSettingsOpen`, `openSettings`, `closeSettings`, `setSettingsCategoryId`, `setSettingsScopeId`, `setSettingsSearchValue`
- **Commands**: `commandContext` (`WorkbenchShellCommandContext`) for shell-level menu entries

Hosts must not mutate shell state outside these methods.

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

## Command and context-key wiring

Menu projection should use `resolveWorkbenchCommandMenuItems` from
`@workbench-kit/react/workbench/commands` (or `resolveCommandMenuItems` from core)
with an optional `contextKeys` snapshot when commands define `when` clauses.

Integrated shell demo builds context keys via `createIntegratedShellContextKeys` in
`packages/react/src/workbench/demo/integratedShellContextKeys.ts`.

## Reference implementations

- **Storybook**: `IntegratedShellDemo` → `React/Workbench/Shell → Integrated Shell`
- **Orchestration boundary**: demo module owns workspace/runtime wiring; adapters own fixtures

## Non-goals (host responsibility)

- Dirty-state confirm routing on tab close / delete
- Persistence and storage keys
- Plugin lifecycle transport
- i18n string resolution (deferred — see [future-capabilities.md](./future-capabilities.md))
- JSON widget editor chrome (deferred — port-then-replace; see
  [future-capabilities.md § JSON Widget](./future-capabilities.md#json-widget-port-then-replace-strategy))
