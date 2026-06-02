export { ActivityBar } from './ActivityBar';
export type { ActivityBarItem, ActivityBarProps } from './ActivityBar';
export {
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  commandMenuItemsToContextMenuItems,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  getWorkbenchShowActivityCommandId,
} from './commands';
export type {
  WorkbenchShellCommandActivity,
  WorkbenchShellCommandContext,
  WorkbenchShellCommandPresetOptions,
} from './commands';
export {
  initializeWorkbenchShellState,
  useWorkbenchShellState,
  workbenchShellStateReducer,
} from './shellState';
export type {
  UseWorkbenchShellStateResult,
  WorkbenchShellAction,
  WorkbenchShellInitialState,
  WorkbenchShellState,
} from './shellState';
export { SplitView } from './SplitView';
export type { SplitViewProps } from './SplitView';
export { StatusBar, StatusBarItem, StatusBarSection } from './StatusBar';
export type {
  StatusBarItemModel,
  StatusBarItemProps,
  StatusBarProps,
  StatusBarSectionAlign,
  StatusBarSectionModel,
  StatusBarSectionProps,
} from './StatusBar';
export { WorkbenchSettingsModal } from './settings';
export type {
  WorkbenchSettingsCategory,
  WorkbenchSettingsModalProps,
  WorkbenchSettingsScope,
} from './settings';
