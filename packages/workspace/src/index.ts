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
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export {
  initializeVirtualWorkspaceState,
  virtualWorkspaceReducer,
  type CreateWorkspaceFileInput,
  type VirtualWorkspaceAction,
  type VirtualWorkspaceInitialState,
  type VirtualWorkspaceState,
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
