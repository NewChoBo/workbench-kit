export { ActivityBar, ACTIVITY_BAR_DRAG_DATA_TYPE } from './ActivityBar';
export {
  hasWorkbenchSidebarViewPlacementDrag,
  readWorkbenchSidebarViewPlacementDrag,
  resetWorkbenchSidebarViewPlacementDragSession,
  subscribeWorkbenchSidebarViewPlacementDragSessionEnd,
  writeWorkbenchSidebarViewPlacementDrag,
  WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE,
} from './sidebarViewPlacementDnd';
export {
  mergeWorkbenchSidebarViewPlacementDropZoneProps,
  useWorkbenchSidebarViewPlacementDropZone,
} from './useWorkbenchSidebarViewPlacementDropZone';
export type {
  UseWorkbenchSidebarViewPlacementDropZoneOptions,
  WorkbenchSidebarViewPlacementDropZoneProps,
} from './useWorkbenchSidebarViewPlacementDropZone';
export { useWorkbenchSidebarActionBarDnd } from './useWorkbenchSidebarActionBarDnd';
export type {
  UseWorkbenchSidebarActionBarDndOptions,
  UseWorkbenchSidebarActionBarDndResult,
  WorkbenchSidebarActionBarDropTarget,
  WorkbenchSidebarActionBarItemDragHandlers,
} from './useWorkbenchSidebarActionBarDnd';
export type { ActivityBarItem, ActivityBarProps } from './ActivityBar';
export { WorkbenchArtifactModeControls, WorkbenchArtifactShell } from './ArtifactShell';
export type {
  WorkbenchArtifactDescriptor,
  WorkbenchArtifactMode,
  WorkbenchArtifactShellProps,
} from './ArtifactShell';
export { SplitView } from './SplitView';
export type { SplitViewLayoutMode, SplitViewProps } from './SplitView';
export { StatusBar, StatusBarItem, StatusBarSection } from './StatusBar';
export type {
  StatusBarItemModel,
  StatusBarItemProps,
  StatusBarProps,
  StatusBarSectionAlign,
  StatusBarSectionModel,
  StatusBarSectionProps,
} from './StatusBar';
export { WorkbenchShell } from './WorkbenchShell';
export type { WorkbenchShellProps } from './WorkbenchShell';
export {
  createWorkbenchEditorTabsFromViewModel,
  createWorkbenchShellActivityBarFromViewModel,
  createWorkbenchViewSidebarFromViewModel,
  createWorkbenchViewSidebarItemsFromViewModel,
} from './shellViewModel';
export type {
  CreateWorkbenchEditorTabsFromViewModelInput,
  CreateWorkbenchShellActivityBarFromViewModelInput,
  CreateWorkbenchViewSidebarFromViewModelInput,
  CreateWorkbenchViewSidebarItemsFromViewModelInput,
  WorkbenchShellActivityBarViewModelProps,
  WorkbenchViewSidebarViewModelProps,
} from './shellViewModel';
export { WorkbenchViewEditor } from './WorkbenchViewEditor';
export type {
  WorkbenchViewEditorDataAttributes,
  WorkbenchViewEditorEmptyState,
  WorkbenchViewEditorEmptyStateProps,
  WorkbenchViewEditorEmptyStateSurfaceProps,
  WorkbenchViewEditorProps,
} from './WorkbenchViewEditor';
export { WorkbenchEditorTabs } from './WorkbenchEditorTabs';
export type { WorkbenchEditorTabsProps } from './WorkbenchEditorTabs';
export {
  createWorkbenchStandaloneEditorTabCommandContext,
  createWorkbenchStandaloneEditorTabContextMenuItems,
  isWorkbenchEditorTabClosable,
} from './editorTabContextMenu';
export type {
  CreateWorkbenchStandaloneEditorTabCommandContextInput,
  WorkbenchStandaloneEditorTabLike,
} from './editorTabContextMenu';
export { useWorkbenchEditorTabContextMenu } from './useWorkbenchEditorTabContextMenu';
export type {
  UseWorkbenchEditorTabContextMenuOptions,
  UseWorkbenchEditorTabContextMenuResult,
} from './useWorkbenchEditorTabContextMenu';
export { WorkbenchViewSidebar } from './WorkbenchViewSidebar';
export type { WorkbenchViewSidebarItem, WorkbenchViewSidebarProps } from './WorkbenchViewSidebar';
export {
  WorkbenchDesktopTitleBar,
  WorkbenchDesktopWindowControls,
} from './WorkbenchDesktopTitleBar';
export type {
  WorkbenchDesktopTitleBarProps,
  WorkbenchDesktopWindowControlsProps,
} from './WorkbenchDesktopTitleBar';
export { WorkbenchPlatformProvider, useWorkbenchHostPlatform } from './WorkbenchPlatformContext';
export type { WorkbenchPlatformProviderProps } from './WorkbenchPlatformContext';
export {
  resolveWorkbenchHostPlatform,
  resolveWorkbenchWindowChromeDataAttributes,
} from './workbenchPlatformChrome';
export type { WorkbenchHostPlatform, WorkbenchWindowChromeMode } from './workbenchPlatformChrome';
export {
  WorkbenchWindowChromeControls,
  shouldUseDarwinPlatformChrome,
} from './WorkbenchWindowChromeControls';
export type { WorkbenchWindowChromeControlsProps } from './WorkbenchWindowChromeControls';
export { useWorkbenchModalViewState } from './workbenchModalViewState';
export type {
  UseWorkbenchModalViewStateOptions,
  WorkbenchModalViewState,
} from './workbenchModalViewState';
export {
  WorkbenchSidebarLayoutProvider,
  useWorkbenchSidebarLayout,
} from './useWorkbenchSidebarLayout';
export type { WorkbenchSidebarLayoutProviderProps } from './useWorkbenchSidebarLayout';
export type { WorkbenchSidebarLayoutContextValue } from './workbenchSidebarLayoutContext';
export {
  createWorkbenchStandaloneShellStateSnapshot,
  useWorkbenchStandaloneShellContext,
  type WorkbenchStandaloneShellStateChange,
  type WorkbenchStandaloneShellStateChangeKind,
  type WorkbenchStandaloneShellStateSnapshot,
} from './workbenchStandaloneShellReactContext';
export { useWorkbenchStandaloneShellStateSync } from './useWorkbenchStandaloneShellStateSync';
export { WorkbenchShellTitleBarLayoutControls } from './WorkbenchShellTitleBarLayoutControls';
export type { WorkbenchShellTitleBarLayoutControlsProps } from './WorkbenchShellTitleBarLayoutControls';
export { useWorkbenchViewRouteState } from './workbenchViewRouteState';
export type {
  UseWorkbenchViewRouteStateOptions,
  WorkbenchViewRouteBrowserWindow,
  WorkbenchViewRouteCommitMode,
  WorkbenchViewRouteState,
} from './workbenchViewRouteState';
export {
  initializeWorkbenchShellState,
  useWorkbenchShellState,
  workbenchShellStateReducer,
  DEFAULT_PRIMARY_SIDEBAR_SIZE_PX,
  MAX_PRIMARY_SIDEBAR_SIZE_PX,
  MIN_PRIMARY_SIDEBAR_SIZE_PX,
} from './shellState';
export type {
  UseWorkbenchShellStateResult,
  WorkbenchShellAction,
  WorkbenchShellInitialState,
  WorkbenchShellState,
} from './shellState';
