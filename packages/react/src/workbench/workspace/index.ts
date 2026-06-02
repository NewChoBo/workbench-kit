export { WorkspaceEditor, languageForFile, monacoThemeForWorkspaceTheme } from './WorkspaceEditor';
export type { WorkspaceEditorProps, WorkspaceEditorTheme } from './WorkspaceEditor';
export { WorkspaceEditorPanel } from './WorkspaceEditorPanel';
export type { WorkspaceEditorPanelProps } from './WorkspaceEditorPanel';
export { WorkspaceExplorer } from './WorkspaceExplorer';
export type { WorkspaceExplorerProps } from './WorkspaceExplorer';
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
export { compactText, createContentPreview, highlightText, searchWorkspaceFiles } from './search';
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export { useVirtualWorkspace } from './useVirtualWorkspace';
export type {
  CreateWorkspaceFileInput,
  VirtualWorkspaceApi,
  VirtualWorkspaceInitialState,
  VirtualWorkspaceState,
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
