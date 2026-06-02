export { WorkspaceEditor, languageForFile, monacoThemeForWorkspaceTheme } from './WorkspaceEditor';
export type { WorkspaceEditorProps, WorkspaceEditorTheme } from './WorkspaceEditor';
export { WorkspaceEditorPanel } from './WorkspaceEditorPanel';
export type { WorkspaceEditorPanelProps } from './WorkspaceEditorPanel';
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
} from './WorkspaceExplorer';
export { WorkspaceFileIcon, codiconForFileKind, fileIconKindForPath } from './WorkspaceFileIcon';
export type { WorkspaceFileIconKind, WorkspaceFileIconProps } from './WorkspaceFileIcon';
export { WorkspaceHighlightedText } from './WorkspaceHighlightedText';
export type { WorkspaceHighlightedTextProps } from './WorkspaceHighlightedText';
export { WorkspaceSearchPanel } from './WorkspaceSearchPanel';
export type { WorkspaceSearchPanelProps } from './WorkspaceSearchPanel';
export { WorkspaceSearchResults } from './WorkspaceSearchResults';
export type { WorkspaceSearchResultsProps } from './WorkspaceSearchResults';
export {
  extensionOfPath,
  fileNameOfPath,
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
} from '@newchobo-ui/workspace';
export { compactText, createContentPreview, highlightText, searchWorkspaceFiles } from './search';
export {
  getWorkspaceSelectionActionPaths,
  getWorkspaceSelectionRange,
  normalizeWorkspaceSelectionPaths,
  pruneWorkspaceSelection,
  updateWorkspaceSelection,
  type UpdateWorkspaceSelectionInput,
  type WorkspaceSelectionActionPathsInput,
  type WorkspaceSelectionMode,
  type WorkspaceSelectionState,
} from '@newchobo-ui/workspace';
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export {
  getAvailableWorkspaceEntryName,
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
