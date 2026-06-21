import { normalizeWorkspacePath, parentPathOf, parentPathsOf } from './path';
import type { WorkspaceFile } from './types';

export function normalizeFiles(files: WorkspaceFile[]) {
  const filesByPath = new Map<string, WorkspaceFile>();

  files.forEach((file) => {
    const path = normalizeWorkspacePath(file.path);
    if (!path) return;
    filesByPath.set(path, { ...file, path });
  });

  return [...filesByPath.values()];
}

export function normalizeFolders(folders: string[]) {
  return [...new Set(folders.map(normalizeWorkspacePath).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function materializeFolders(files: WorkspaceFile[], folders: string[]) {
  const folderPaths = folders.flatMap((folder) => [
    ...parentPathsOf(folder),
    normalizeWorkspacePath(folder),
  ]);
  const fileParentPaths = files.flatMap((file) => parentPathsOf(file.path));
  return normalizeFolders([...folderPaths, ...fileParentPaths]);
}

export function preserveParentFolder(folders: string[], path: string) {
  const parentPath = parentPathOf(path);
  return parentPath ? materializeFolders([], [...folders, parentPath]) : folders;
}

export function fileMap(files: WorkspaceFile[]) {
  return new Map(files.map((file) => [file.path, file]));
}

export function folderPathSet(files: WorkspaceFile[], folders: string[]) {
  const paths = new Set<string>();

  folders.forEach((folder) => {
    const path = normalizeWorkspacePath(folder);
    if (!path) return;
    parentPathsOf(path).forEach((parentPath) => paths.add(parentPath));
    paths.add(path);
  });

  files.forEach((file) => {
    parentPathsOf(file.path).forEach((parentPath) => paths.add(parentPath));
  });

  return paths;
}

export function isUnderPath(path: string, parentPath: string) {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

export function hasFileParent(files: WorkspaceFile[], path: string) {
  const filesByPath = fileMap(files);
  return parentPathsOf(path).some((parentPath) => filesByPath.has(parentPath));
}

export function hasPathConflict(files: WorkspaceFile[], folders: string[], path: string) {
  return (
    fileMap(files).has(path) ||
    folderPathSet(files, folders).has(path) ||
    hasFileParent(files, path)
  );
}

export function pruneOpenPaths(openPaths: string[], files: WorkspaceFile[]) {
  const filesByPath = fileMap(files);
  return openPaths.map(normalizeWorkspacePath).filter((path) => filesByPath.has(path));
}

export function openPath(openPaths: string[], path: string) {
  return openPaths.includes(path) ? openPaths : [...openPaths, path];
}

export function selectedAfterRemoving({
  deletedPaths,
  files,
  openPaths,
  previousOpenPaths,
  selectedPath,
}: {
  deletedPaths: Set<string>;
  files: WorkspaceFile[];
  openPaths: string[];
  previousOpenPaths: string[];
  selectedPath?: string;
}) {
  const filesByPath = fileMap(files);
  if (selectedPath && !deletedPaths.has(selectedPath) && filesByPath.has(selectedPath)) {
    return selectedPath;
  }

  const deletedSelectedIndex = selectedPath ? previousOpenPaths.indexOf(selectedPath) : -1;
  if (deletedSelectedIndex < 0) return openPaths[0];

  return openPaths[Math.min(deletedSelectedIndex, openPaths.length - 1)];
}

export function expandParents(expandedPaths: Set<string>, path: string) {
  const next = new Set(expandedPaths);
  parentPathsOf(path).forEach((parentPath) => next.add(parentPath));
  return next;
}

export function pruneExpandedPaths(
  expandedPaths: Set<string>,
  files: WorkspaceFile[],
  folders: string[],
) {
  const foldersByPath = folderPathSet(files, folders);
  return new Set([...expandedPaths].filter((path) => foldersByPath.has(path)));
}
