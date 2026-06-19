export { mimeTypeForPath } from './mimeType';
export {
  WorkspaceEditor,
  MONACO_DARK_THEME_ID,
  MONACO_LIGHT_THEME_ID,
  defineMonacoWorkbenchTheme,
  languageForFile,
  monacoThemeForWorkspaceTheme,
} from './WorkspaceEditor';
export type { WorkspaceEditorProps, WorkspaceEditorTheme } from './WorkspaceEditor';
export { WorkspaceEditorPanel } from './WorkspaceEditorPanel';
export type {
  WorkspaceEditorPanelProps,
  WorkspaceEditorPanelRenderEditor,
  WorkspaceEditorPanelRenderEditorContext,
  WorkspaceEditorPanelRenderTabActions,
  WorkspaceEditorPanelRenderTabActionsContext,
} from './WorkspaceEditorPanel';
export {
  WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
  WORKSPACE_EXPLORER_DRAG_METADATA_DATA_TYPE,
  WorkspaceExplorer,
} from './WorkspaceExplorer';
export type {
  WorkspaceExplorerItemActionMeta,
  WorkspaceExplorerItemContextMenuMeta,
  WorkspaceExplorerItemKeyboardActionMeta,
  WorkspaceExplorerInlineEditCommitMeta,
  WorkspaceExplorerDragMetadataContext,
  WorkspaceExplorerDragMetadataFactory,
  WorkspaceExplorerInlineEditKind,
  WorkspaceExplorerInlineEditState,
  WorkspaceExplorerMoveRequestMeta,
  WorkspaceExplorerProps,
  WorkspaceExplorerSelectionChangeMeta,
  WorkspaceExplorerSelectionChangeReason,
} from './WorkspaceExplorer';
export { WorkspaceFileIcon } from './WorkspaceFileIcon';
export type { WorkspaceFileIconProps } from './WorkspaceFileIcon';
export { FILE_ICON_KINDS, codiconForFileKind, fileIconKindForPath } from '../../icons/file-icon';
export type { FileIconKind } from '../../icons/file-icon';
export { WorkspaceHighlightedText } from './WorkspaceHighlightedText';
export type { WorkspaceHighlightedTextProps } from './WorkspaceHighlightedText';
export { WorkspaceSearchPanel } from './WorkspaceSearchPanel';
export type { WorkspaceSearchPanelProps } from './WorkspaceSearchPanel';
export { WorkspaceExplorerPanel } from './WorkspaceExplorerPanel';
export type { WorkspaceExplorerPanelProps } from './WorkspaceExplorerPanel';
export { buildWorkspaceExplorerNodes, resolveWorkspaceExplorerSectionTitle } from './build-workspace-explorer-nodes.js';
export { WorkspaceSearchResults } from './WorkspaceSearchResults';
export type { WorkspaceSearchResultsProps } from './WorkspaceSearchResults';
export {
  WORKSPACE_PATH_DISPLAY_SEPARATOR,
  extensionOfPath,
  fileNameOfPath,
  formatWorkspacePathDisplay,
  isSimpleWorkspaceName,
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentPathOf,
  parentPathsOf,
  workspacePathSegments,
} from './path';
export {
  createWorkspaceFileDraft,
  discardWorkspaceFileDraft,
  isWorkspaceFileDraftDirty,
  resolveWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  type DiscardWorkspaceFileDraftInput,
  type ResolveWorkspaceFileDraftInput,
  type SaveWorkspaceFileDraftInput,
  type UpdateWorkspaceFileDraftInput,
  type WorkspaceFileDraft,
  type WorkspaceFileDraftMap,
} from '@workbench-kit/workspace';
export { compactText, createContentPreview, highlightText, searchWorkspaceFiles } from './search';
export {
  createEmptyWorkspaceSelection,
  getWorkspaceSelectionActionPaths,
  getWorkspaceSelectionRange,
  normalizeWorkspaceSelectionPaths,
  pruneWorkspaceSelection,
  resolveWorkspaceCreateParentPath,
  updateWorkspaceSelection,
  type UpdateWorkspaceSelectionInput,
  type WorkspaceSelectionActionPathsInput,
  type WorkspaceSelectionMode,
  type WorkspaceSelectionState,
} from '@workbench-kit/workspace';
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export {
  getAvailableWorkspaceEntryName,
  getWorkspaceEntryMovePlan,
  getWorkspaceFileMovePlan,
  initializeVirtualWorkspaceState,
  isWorkspaceEntryPathAvailable,
  useVirtualWorkspace,
  virtualWorkspaceReducer,
} from './useVirtualWorkspace';
export type {
  CreateWorkspaceFileInput,
  VirtualWorkspaceAction,
  VirtualWorkspaceApi,
  VirtualWorkspaceInitialState,
  VirtualWorkspaceState,
  WorkspaceEntryNameSuggestionInput,
  WorkspaceEntryMove,
  WorkspaceEntryMoveKind,
  WorkspaceEntryMovePlan,
  WorkspaceEntryMovePlanInput,
  WorkspaceEntryPathAvailabilityInput,
  WorkspaceFileMove,
  WorkspaceFileMovePlan,
  WorkspaceFileMovePlanInput,
  WriteWorkspaceFileInput,
} from './useVirtualWorkspace';
export type {
  VisibleWorkspaceNode,
  WorkspaceFile,
  WorkspaceFileSource,
  WorkspaceHighlightPart,
  WorkspaceNodeType,
  WorkspaceSearchMatchKind,
  WorkspaceSearchResult,
  WorkspaceTreeNode,
} from './types';
export {
  WorkspaceDraftsContext,
  WorkspaceDraftsProvider,
  useWorkspaceDrafts,
} from './WorkspaceDraftsContext';
export type {
  WorkspaceDraftsContextValue,
  WorkspaceDraftsProviderProps,
} from './WorkspaceDraftsContext';
export { createVirtualWorkspaceExplorerPort } from './createVirtualWorkspaceExplorerPort';
export { useWorkspaceExplorerController } from './useWorkspaceExplorerController';
export type {
  UseWorkspaceExplorerControllerOptions,
  WorkspaceExplorerController,
} from './useWorkspaceExplorerController';
export {
  applyWorkspaceExplorerMutationResult,
  createWorkspaceExplorerInlineEditDraft,
  createWorkspaceExplorerRenameDraft,
  workspaceExplorerParentPaths,
} from './workspaceExplorerController';
export type {
  WorkspaceExplorerControllerPort,
  WorkspaceExplorerMutationResult,
  WorkspaceExplorerWorkspaceSnapshot,
} from './workspaceExplorerController';
