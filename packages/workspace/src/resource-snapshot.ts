import type { WorkspaceFile } from './types.js';
import type { VirtualWorkspaceState } from './virtualWorkspace.js';

export interface WorkspaceResourceSnapshot {
  readonly files: readonly WorkspaceFile[];
  readonly folders: readonly string[];
  readonly version: number;
}

export function createWorkspaceResourceSnapshot(
  state: Pick<VirtualWorkspaceState, 'files' | 'folders'>,
  version = 1,
): WorkspaceResourceSnapshot {
  return {
    files: state.files.map((file) => ({ ...file })),
    folders: [...state.folders],
    version,
  };
}

export function snapshotMatchesWorkspaceState(
  snapshot: WorkspaceResourceSnapshot,
  state: Pick<VirtualWorkspaceState, 'files' | 'folders'>,
): boolean {
  if (snapshot.folders.length !== state.folders.length) {
    return false;
  }

  if (!snapshot.folders.every((folder, index) => folder === state.folders[index])) {
    return false;
  }

  if (snapshot.files.length !== state.files.length) {
    return false;
  }

  const filesByPath = new Map(state.files.map((file) => [file.path, file]));
  return snapshot.files.every((file) => {
    const current = filesByPath.get(file.path);
    return (
      current !== undefined &&
      current.content === file.content &&
      current.mimeType === file.mimeType &&
      current.source === file.source
    );
  });
}
