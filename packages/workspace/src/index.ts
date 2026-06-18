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
  discardWorkspaceDraft,
  discardWorkspaceFileDraft,
  isWorkspaceFileDraftDirty,
  resolveWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  type DiscardWorkspaceDraftInput,
  type DiscardWorkspaceFileDraftInput,
  type ResolveWorkspaceFileDraftInput,
  type SaveWorkspaceFileDraftInput,
  type UpdateWorkspaceFileDraftInput,
  type WorkspaceFileDraft,
  type WorkspaceFileDraftMap,
} from './draft';
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
} from './selection';
export {
  virtualWorkspaceActionToResourceMutation,
  workspaceResourceMutationToAction,
  type WorkspaceResourceMutation,
} from './resource-mutation';
export {
  createWorkspaceResourceSnapshot,
  snapshotMatchesWorkspaceState,
  type WorkspaceResourceSnapshot,
} from './resource-snapshot';
export {
  applyWorkspaceResourceMutation,
  applyWorkspaceResourceTransaction,
  createWorkspaceResourceTransaction,
  type WorkspaceResourceTransaction,
} from './resource-transaction';
export {
  WORKSPACE_RESOURCE_SCHEME,
  formatWorkspaceResourceUri,
  parseWorkspaceResourceUri,
  workspacePathFromResourceUri,
  workspaceResourceUriForFile,
  workspaceResourceUriForFolder,
  type WorkspaceResourceKind,
  type WorkspaceResourceUri,
} from './resource-uri';
export { buildWorkspaceTree, flattenWorkspaceTree } from './tree';
export {
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  getWorkspaceEntryMovePlan,
  initializeVirtualWorkspaceState,
  isWorkspaceEntryPathAvailable,
  virtualWorkspaceReducer,
  type CreateWorkspaceFileInput,
  type WorkspaceEntryNameSuggestionInput,
  type WorkspaceEntryMove,
  type WorkspaceEntryMoveKind,
  type WorkspaceEntryMovePlan,
  type WorkspaceEntryMovePlanInput,
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
export {
  asWorkbenchStructuredDataRecord,
  cloneWorkbenchStructuredDataContainer,
  createWorkbenchStructuredDataContainer,
  getWorkbenchStructuredDataArrayIndex,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataPathValue,
  setWorkbenchStructuredDataValue,
  type WorkbenchStructuredDataPath,
  type WorkbenchStructuredDataRecord,
} from './structuredPath';
export {
  WORKBENCH_WORKSPACE_CAPABILITY_ID,
  WorkspaceResourceService,
  buildEditorSaveMutation,
  createEditorSaveTransaction,
  createWorkbenchWorkspaceHostPort,
  type WorkbenchEditorSavePort,
  type WorkbenchWorkspaceHostPort,
  type WorkspaceChangeEvent,
  type WorkspaceResourceServiceOptions,
} from './workbench-workspace-host';
