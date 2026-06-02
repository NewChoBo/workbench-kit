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
} from './selection';
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export {
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  initializeVirtualWorkspaceState,
  isWorkspaceEntryPathAvailable,
  virtualWorkspaceReducer,
  type CreateWorkspaceFileInput,
  type WorkspaceEntryNameSuggestionInput,
  type WorkspaceEntryPathAvailabilityInput,
  type VirtualWorkspaceAction,
  type VirtualWorkspaceInitialState,
  type VirtualWorkspaceState,
  type WorkspaceFileMove,
  type WorkspaceFileMovePlan,
  type WorkspaceFileMovePlanInput,
  type WriteWorkspaceFileInput,
} from './virtualWorkspace';
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
