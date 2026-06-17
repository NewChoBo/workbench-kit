import type {
  CreateWorkspaceFileInput,
  VirtualWorkspaceAction,
  VirtualWorkspaceInitialState,
  WriteWorkspaceFileInput,
} from './virtualWorkspace.js';

export type WorkspaceResourceMutation =
  | { type: 'initialize-workspace'; state: VirtualWorkspaceInitialState }
  | { type: 'create-file'; path: string; file: CreateWorkspaceFileInput }
  | { type: 'save-file'; path: string; file: WriteWorkspaceFileInput }
  | { type: 'delete-file'; path: string }
  | { type: 'rename-file'; path: string; name: string; mimeType?: string | undefined }
  | { type: 'move-file'; sourcePath: string; targetFolderPath: string }
  | { type: 'move-folder'; sourcePath: string; targetFolderPath: string }
  | { type: 'create-folder'; path: string }
  | { type: 'delete-folder'; path: string }
  | { type: 'rename-folder'; path: string; name: string };

export function workspaceResourceMutationToAction(
  mutation: WorkspaceResourceMutation,
): VirtualWorkspaceAction {
  switch (mutation.type) {
    case 'initialize-workspace':
      return { type: 'initialize-workspace', state: mutation.state };
    case 'create-file':
      return { type: 'create-file', file: mutation.file };
    case 'save-file':
      return { type: 'save-file', path: mutation.path, file: mutation.file };
    case 'delete-file':
      return { type: 'delete-file', path: mutation.path };
    case 'rename-file':
      return {
        type: 'rename-file',
        path: mutation.path,
        name: mutation.name,
        mimeType: mutation.mimeType,
      };
    case 'move-file':
      return {
        type: 'move-file',
        sourcePath: mutation.sourcePath,
        targetFolderPath: mutation.targetFolderPath,
      };
    case 'move-folder':
      return {
        type: 'move-folder',
        sourcePath: mutation.sourcePath,
        targetFolderPath: mutation.targetFolderPath,
      };
    case 'create-folder':
      return { type: 'create-folder', path: mutation.path };
    case 'delete-folder':
      return { type: 'delete-folder', path: mutation.path };
    case 'rename-folder':
      return { type: 'rename-folder', path: mutation.path, name: mutation.name };
  }
}

export function virtualWorkspaceActionToResourceMutation(
  action: VirtualWorkspaceAction,
): WorkspaceResourceMutation | null {
  switch (action.type) {
    case 'initialize-workspace':
      return { type: 'initialize-workspace', state: action.state };
    case 'create-file':
      return { type: 'create-file', path: action.file.path, file: action.file };
    case 'save-file':
      return { type: 'save-file', path: action.path, file: action.file };
    case 'delete-file':
      return { type: 'delete-file', path: action.path };
    case 'rename-file':
      return {
        type: 'rename-file',
        path: action.path,
        name: action.name,
        mimeType: action.mimeType,
      };
    case 'move-file':
      return {
        type: 'move-file',
        sourcePath: action.sourcePath,
        targetFolderPath: action.targetFolderPath,
      };
    case 'move-folder':
      return {
        type: 'move-folder',
        sourcePath: action.sourcePath,
        targetFolderPath: action.targetFolderPath,
      };
    case 'create-folder':
      return { type: 'create-folder', path: action.path };
    case 'delete-folder':
      return { type: 'delete-folder', path: action.path };
    case 'rename-folder':
      return { type: 'rename-folder', path: action.path, name: action.name };
    default:
      return null;
  }
}
