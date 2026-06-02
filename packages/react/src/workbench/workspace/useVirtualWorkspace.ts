import { useMemo, useReducer } from 'react';
import {
  buildWorkspaceTree,
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  initializeVirtualWorkspaceState,
  isWorkspaceEntryPathAvailable,
  searchWorkspaceFiles,
  virtualWorkspaceReducer,
  type CreateWorkspaceFileInput,
  type VirtualWorkspaceAction,
  type VirtualWorkspaceInitialState,
  type VirtualWorkspaceState,
  type WorkspaceEntryNameSuggestionInput,
  type WorkspaceEntryPathAvailabilityInput,
  type WorkspaceFileMove,
  type WorkspaceFileMovePlan,
  type WorkspaceFileMovePlanInput,
  type WorkspaceSearchResult,
  type WorkspaceTreeNode,
  type WriteWorkspaceFileInput,
} from '@newchobo-ui/workspace';

export interface VirtualWorkspaceApi extends VirtualWorkspaceState {
  closeAll: () => void;
  closeOthers: (path: string) => void;
  closePath: (path: string) => void;
  createFile: (file: CreateWorkspaceFileInput) => void;
  createFolder: (path: string) => void;
  deleteFile: (path: string) => void;
  deleteFolder: (path: string) => void;
  moveFile: (sourcePath: string, targetFolderPath: string) => void;
  openFile: (path: string) => void;
  renameFile: (path: string, name: string, mimeType?: string) => void;
  renameFolder: (path: string, name: string) => void;
  saveFile: (path: string, file: WriteWorkspaceFileInput) => void;
  searchResults: WorkspaceSearchResult[];
  setSearchQuery: (query: string) => void;
  toggleFolder: (path: string) => void;
  workspaceTree: WorkspaceTreeNode[];
}

export function useVirtualWorkspace(
  initialState: VirtualWorkspaceInitialState,
): VirtualWorkspaceApi {
  const [state, dispatch] = useReducer(
    virtualWorkspaceReducer,
    initialState,
    initializeVirtualWorkspaceState,
  );
  const workspaceTree = useMemo(
    () => buildWorkspaceTree(state.folders, state.files),
    [state.files, state.folders],
  );
  const searchResults = useMemo(
    () => searchWorkspaceFiles(state.files, state.searchQuery),
    [state.files, state.searchQuery],
  );

  return {
    ...state,
    closeAll: () => dispatch({ type: 'close-all' }),
    closeOthers: (path) => dispatch({ path, type: 'close-others' }),
    closePath: (path) => dispatch({ path, type: 'close-path' }),
    createFile: (file) => dispatch({ file, type: 'create-file' }),
    createFolder: (path) => dispatch({ path, type: 'create-folder' }),
    deleteFile: (path) => dispatch({ path, type: 'delete-file' }),
    deleteFolder: (path) => dispatch({ path, type: 'delete-folder' }),
    moveFile: (sourcePath, targetFolderPath) =>
      dispatch({ sourcePath, targetFolderPath, type: 'move-file' }),
    openFile: (path) => dispatch({ path, type: 'open-file' }),
    renameFile: (path, name, mimeType) => dispatch({ mimeType, name, path, type: 'rename-file' }),
    renameFolder: (path, name) => dispatch({ name, path, type: 'rename-folder' }),
    saveFile: (path, file) => dispatch({ file, path, type: 'save-file' }),
    searchResults,
    setSearchQuery: (query) => dispatch({ query, type: 'set-search-query' }),
    toggleFolder: (path) => dispatch({ path, type: 'toggle-folder' }),
    workspaceTree,
  };
}

export {
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  initializeVirtualWorkspaceState,
  isWorkspaceEntryPathAvailable,
  virtualWorkspaceReducer,
  type CreateWorkspaceFileInput,
  type VirtualWorkspaceAction,
  type VirtualWorkspaceInitialState,
  type VirtualWorkspaceState,
  type WorkspaceEntryNameSuggestionInput,
  type WorkspaceEntryPathAvailabilityInput,
  type WorkspaceFileMove,
  type WorkspaceFileMovePlan,
  type WorkspaceFileMovePlanInput,
  type WriteWorkspaceFileInput,
};
