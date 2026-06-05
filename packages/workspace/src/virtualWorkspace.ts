import {
  fileNameOfPath,
  isSimpleWorkspaceName,
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentPathOf,
  parentPathsOf,
} from './path';
import type { WorkspaceFile, WorkspaceFileSource } from './types';

export interface CreateWorkspaceFileInput {
  content?: string;
  mimeType?: string;
  path: string;
  source?: WorkspaceFileSource;
  updatedAt?: string;
}

export interface WriteWorkspaceFileInput {
  content: string;
  source?: WorkspaceFileSource;
  updatedAt?: string;
}

export interface WorkspaceFileMove {
  destinationPath: string;
  sourcePath: string;
}

export interface WorkspaceFileMovePlan {
  blockedPaths: string[];
  moves: WorkspaceFileMove[];
  targetFolderPath: string;
}

export interface WorkspaceFileMovePlanInput {
  files: WorkspaceFile[];
  folders?: string[];
  sourcePaths: Iterable<string>;
  targetFolderPath?: string;
}

export interface WorkspaceEntryPathAvailabilityInput {
  excludedPaths?: Iterable<string>;
  files: WorkspaceFile[];
  folders?: string[];
  path: string;
}

export interface WorkspaceEntryNameSuggestionInput {
  files: WorkspaceFile[];
  folders?: string[];
  parentPath?: string;
  preferredName: string;
}

export interface VirtualWorkspaceInitialState {
  expandedPaths?: Iterable<string>;
  files?: WorkspaceFile[];
  folders?: string[];
  openPaths?: string[];
  searchQuery?: string;
  selectedPath?: string;
}

export interface VirtualWorkspaceState {
  expandedPaths: Set<string>;
  files: WorkspaceFile[];
  folders: string[];
  openPaths: string[];
  searchQuery: string;
  selectedPath?: string;
}

export type VirtualWorkspaceAction =
  | { type: 'close-all' }
  | { path: string; type: 'close-others' }
  | { path: string; type: 'close-path' }
  | { file: CreateWorkspaceFileInput; type: 'create-file' }
  | { path: string; type: 'create-folder' }
  | { path: string; type: 'delete-file' }
  | { path: string; type: 'delete-folder' }
  | { sourcePath: string; targetFolderPath: string; type: 'move-file' }
  | { path: string; type: 'open-file' }
  | { mimeType?: string; name: string; path: string; type: 'rename-file' }
  | { name: string; path: string; type: 'rename-folder' }
  | { file: WriteWorkspaceFileInput; path: string; type: 'save-file' }
  | { query: string; type: 'set-search-query' }
  | { path: string; type: 'toggle-folder' };

function nowIso() {
  return new Date().toISOString();
}

function normalizeFiles(files: WorkspaceFile[]) {
  const filesByPath = new Map<string, WorkspaceFile>();

  files.forEach((file) => {
    const path = normalizeWorkspacePath(file.path);
    if (!path) return;
    filesByPath.set(path, { ...file, path });
  });

  return [...filesByPath.values()];
}

function normalizeFolders(folders: string[]) {
  return [...new Set(folders.map(normalizeWorkspacePath).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function materializeFolders(files: WorkspaceFile[], folders: string[]) {
  const folderPaths = folders.flatMap((folder) => [
    ...parentPathsOf(folder),
    normalizeWorkspacePath(folder),
  ]);
  const fileParentPaths = files.flatMap((file) => parentPathsOf(file.path));
  return normalizeFolders([...folderPaths, ...fileParentPaths]);
}

function preserveParentFolder(folders: string[], path: string) {
  const parentPath = parentPathOf(path);
  return parentPath ? materializeFolders([], [...folders, parentPath]) : folders;
}

function fileMap(files: WorkspaceFile[]) {
  return new Map(files.map((file) => [file.path, file]));
}

function folderPathSet(files: WorkspaceFile[], folders: string[]) {
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

function isUnderPath(path: string, parentPath: string) {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function hasFileParent(files: WorkspaceFile[], path: string) {
  const filesByPath = fileMap(files);
  return parentPathsOf(path).some((parentPath) => filesByPath.has(parentPath));
}

function hasPathConflict(files: WorkspaceFile[], folders: string[], path: string) {
  return (
    fileMap(files).has(path) ||
    folderPathSet(files, folders).has(path) ||
    hasFileParent(files, path)
  );
}

function pruneOpenPaths(openPaths: string[], files: WorkspaceFile[]) {
  const filesByPath = fileMap(files);
  return openPaths.map(normalizeWorkspacePath).filter((path) => filesByPath.has(path));
}

function openPath(openPaths: string[], path: string) {
  return openPaths.includes(path) ? openPaths : [...openPaths, path];
}

function selectedAfterRemoving({
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

function expandParents(expandedPaths: Set<string>, path: string) {
  const next = new Set(expandedPaths);
  parentPathsOf(path).forEach((parentPath) => next.add(parentPath));
  return next;
}

function pruneExpandedPaths(expandedPaths: Set<string>, files: WorkspaceFile[], folders: string[]) {
  const foldersByPath = folderPathSet(files, folders);
  return new Set([...expandedPaths].filter((path) => foldersByPath.has(path)));
}

export function isWorkspaceEntryPathAvailable({
  excludedPaths = [],
  files,
  folders = [],
  path,
}: WorkspaceEntryPathAvailabilityInput) {
  const normalizedPath = normalizeWorkspacePath(path);
  if (!normalizedPath) return false;

  const ignoredPaths = [...excludedPaths].map(normalizeWorkspacePath).filter(Boolean);
  const isIgnoredPath = (currentPath: string) =>
    ignoredPaths.some((ignoredPath) => isUnderPath(currentPath, ignoredPath));

  return !hasPathConflict(
    normalizeFiles(files).filter((file) => !isIgnoredPath(file.path)),
    normalizeFolders(folders).filter((folder) => !isIgnoredPath(folder)),
    normalizedPath,
  );
}

export function getAvailableWorkspaceEntryName({
  files,
  folders = [],
  parentPath = '',
  preferredName,
}: WorkspaceEntryNameSuggestionInput) {
  const normalizedParentPath = normalizeWorkspacePath(parentPath);
  const trimmedName = preferredName.trim();
  if (!isSimpleWorkspaceName(trimmedName)) return trimmedName;

  const extensionIndex = trimmedName.lastIndexOf('.');
  const hasExtension = extensionIndex > 0;
  const baseName = hasExtension ? trimmedName.slice(0, extensionIndex) : trimmedName;
  const extension = hasExtension ? trimmedName.slice(extensionIndex) : '';
  let candidateName = trimmedName;
  let suffix = 2;

  while (
    !isWorkspaceEntryPathAvailable({
      files,
      folders,
      path: joinWorkspacePath(normalizedParentPath, candidateName),
    })
  ) {
    candidateName = `${baseName}-${suffix}${extension}`;
    suffix += 1;
  }

  return candidateName;
}

export function getWorkspaceFileMovePlan({
  files,
  folders = [],
  sourcePaths,
  targetFolderPath = '',
}: WorkspaceFileMovePlanInput): WorkspaceFileMovePlan {
  const normalizedFiles = normalizeFiles(files);
  const normalizedFolders = normalizeFolders(folders);
  const targetPath = normalizeWorkspacePath(targetFolderPath);
  const sourcePathSet = new Set([...sourcePaths].map(normalizeWorkspacePath).filter(Boolean));
  const blockedPaths = new Set<string>();
  const moves: WorkspaceFileMove[] = [];
  const filesByPath = fileMap(normalizedFiles);
  const foldersByPath = folderPathSet(normalizedFiles, normalizedFolders);
  const destinationPathSet = new Set<string>();

  if (targetPath && !foldersByPath.has(targetPath)) {
    return {
      blockedPaths: [...sourcePathSet],
      moves,
      targetFolderPath: targetPath,
    };
  }

  const filesOutsideSources = normalizedFiles.filter((file) => !sourcePathSet.has(file.path));

  sourcePathSet.forEach((sourcePath) => {
    if (!filesByPath.has(sourcePath) || parentPathOf(sourcePath) === targetPath) {
      blockedPaths.add(sourcePath);
      return;
    }

    const destinationPath = joinWorkspacePath(targetPath, fileNameOfPath(sourcePath));
    if (
      !destinationPath ||
      destinationPathSet.has(destinationPath) ||
      hasPathConflict(filesOutsideSources, normalizedFolders, destinationPath)
    ) {
      blockedPaths.add(sourcePath);
      return;
    }

    destinationPathSet.add(destinationPath);
    moves.push({ destinationPath, sourcePath });
  });

  return {
    blockedPaths: [...blockedPaths],
    moves,
    targetFolderPath: targetPath,
  };
}

export function initializeVirtualWorkspaceState({
  expandedPaths = [],
  files = [],
  folders = [],
  openPaths = [],
  searchQuery = '',
  selectedPath,
}: VirtualWorkspaceInitialState): VirtualWorkspaceState {
  const normalizedFiles = normalizeFiles(files);
  const normalizedFolders = materializeFolders(normalizedFiles, folders);
  const filesByPath = fileMap(normalizedFiles);
  const normalizedOpenPaths = pruneOpenPaths(openPaths, normalizedFiles);
  const normalizedSelectedPath = selectedPath ? normalizeWorkspacePath(selectedPath) : undefined;
  const resolvedSelectedPath =
    normalizedSelectedPath && filesByPath.has(normalizedSelectedPath)
      ? normalizedSelectedPath
      : normalizedOpenPaths[0];
  const resolvedOpenPaths = resolvedSelectedPath
    ? openPath(normalizedOpenPaths, resolvedSelectedPath)
    : normalizedOpenPaths;

  return {
    expandedPaths: pruneExpandedPaths(
      new Set([...expandedPaths].map(normalizeWorkspacePath).filter(Boolean)),
      normalizedFiles,
      normalizedFolders,
    ),
    files: normalizedFiles,
    folders: normalizedFolders,
    openPaths: resolvedOpenPaths,
    searchQuery,
    selectedPath: resolvedSelectedPath,
  };
}

export function virtualWorkspaceReducer(
  state: VirtualWorkspaceState,
  action: VirtualWorkspaceAction,
): VirtualWorkspaceState {
  if (action.type === 'set-search-query') {
    return { ...state, searchQuery: action.query };
  }

  if (action.type === 'toggle-folder') {
    const path = normalizeWorkspacePath(action.path);
    if (!path) return state;

    const expandedPaths = new Set(state.expandedPaths);
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }

    return { ...state, expandedPaths };
  }

  if (action.type === 'open-file') {
    const path = normalizeWorkspacePath(action.path);
    if (!fileMap(state.files).has(path)) return state;

    return {
      ...state,
      expandedPaths: expandParents(state.expandedPaths, path),
      openPaths: openPath(state.openPaths, path),
      selectedPath: path,
    };
  }

  if (action.type === 'close-path') {
    const path = normalizeWorkspacePath(action.path);
    const openPaths = state.openPaths.filter((openFilePath) => openFilePath !== path);
    const deletedPaths = new Set([path]);

    return {
      ...state,
      openPaths,
      selectedPath: selectedAfterRemoving({
        deletedPaths,
        files: state.files,
        openPaths,
        previousOpenPaths: state.openPaths,
        selectedPath: state.selectedPath,
      }),
    };
  }

  if (action.type === 'close-others') {
    const path = normalizeWorkspacePath(action.path);
    if (!fileMap(state.files).has(path)) return state;

    return {
      ...state,
      openPaths: [path],
      selectedPath: path,
    };
  }

  if (action.type === 'close-all') {
    return {
      ...state,
      openPaths: [],
      selectedPath: undefined,
    };
  }

  if (action.type === 'save-file') {
    const path = normalizeWorkspacePath(action.path);
    const files = state.files.map((file) =>
      file.path === path
        ? {
            ...file,
            content: action.file.content,
            source: action.file.source ?? 'user',
            updatedAt: action.file.updatedAt ?? nowIso(),
          }
        : file,
    );

    return { ...state, files };
  }

  if (action.type === 'create-file') {
    const path = normalizeWorkspacePath(action.file.path);
    if (!path || hasPathConflict(state.files, state.folders, path)) return state;

    const files = [
      ...state.files,
      {
        content: action.file.content ?? '',
        mimeType: action.file.mimeType,
        path,
        source: action.file.source ?? 'user',
        updatedAt: action.file.updatedAt ?? nowIso(),
      },
    ];
    const folders = materializeFolders(files, state.folders);

    return {
      ...state,
      expandedPaths: expandParents(state.expandedPaths, path),
      files,
      folders,
      openPaths: openPath(state.openPaths, path),
      selectedPath: path,
    };
  }

  if (action.type === 'create-folder') {
    const path = normalizeWorkspacePath(action.path);
    if (!path || hasPathConflict(state.files, state.folders, path)) return state;

    const folders = materializeFolders(state.files, [...state.folders, path]);
    const expandedPaths = expandParents(state.expandedPaths, path);
    expandedPaths.add(path);

    return {
      ...state,
      expandedPaths,
      folders,
    };
  }

  if (action.type === 'delete-file') {
    const path = normalizeWorkspacePath(action.path);
    if (!fileMap(state.files).has(path)) return state;

    const files = state.files.filter((file) => file.path !== path);
    const folders = preserveParentFolder(state.folders, path);
    const openPaths = state.openPaths.filter((openFilePath) => openFilePath !== path);
    const deletedPaths = new Set([path]);

    return {
      ...state,
      expandedPaths: pruneExpandedPaths(state.expandedPaths, files, folders),
      files,
      folders,
      openPaths,
      selectedPath: selectedAfterRemoving({
        deletedPaths,
        files,
        openPaths,
        previousOpenPaths: state.openPaths,
        selectedPath: state.selectedPath,
      }),
    };
  }

  if (action.type === 'delete-folder') {
    const path = normalizeWorkspacePath(action.path);
    if (!path || !folderPathSet(state.files, state.folders).has(path)) return state;

    const deletedPaths = new Set(
      state.files.filter((file) => isUnderPath(file.path, path)).map((file) => file.path),
    );
    const files = state.files.filter((file) => !deletedPaths.has(file.path));
    const folders = state.folders.filter((folder) => !isUnderPath(folder, path));
    const openPaths = state.openPaths.filter((openFilePath) => !deletedPaths.has(openFilePath));

    return {
      ...state,
      expandedPaths: pruneExpandedPaths(
        new Set(
          [...state.expandedPaths].filter((expandedPath) => !isUnderPath(expandedPath, path)),
        ),
        files,
        folders,
      ),
      files,
      folders,
      openPaths,
      selectedPath: selectedAfterRemoving({
        deletedPaths,
        files,
        openPaths,
        previousOpenPaths: state.openPaths,
        selectedPath: state.selectedPath,
      }),
    };
  }

  if (action.type === 'rename-file') {
    const path = normalizeWorkspacePath(action.path);
    const name = action.name.trim();
    if (!isSimpleWorkspaceName(name)) return state;

    const sourceFile = fileMap(state.files).get(path);
    if (!sourceFile) return state;

    const destinationPath = joinWorkspacePath(parentPathOf(path), name);
    if (!destinationPath || destinationPath === path) return state;

    const filesWithoutSource = state.files.filter((file) => file.path !== path);
    if (hasPathConflict(filesWithoutSource, state.folders, destinationPath)) return state;

    const files = [
      ...filesWithoutSource,
      {
        ...sourceFile,
        mimeType: action.mimeType ?? sourceFile.mimeType,
        path: destinationPath,
        updatedAt: nowIso(),
      },
    ];
    const openPaths = state.openPaths.map((openFilePath) =>
      openFilePath === path ? destinationPath : openFilePath,
    );

    return {
      ...state,
      expandedPaths: expandParents(state.expandedPaths, destinationPath),
      files,
      openPaths,
      selectedPath: state.selectedPath === path ? destinationPath : state.selectedPath,
    };
  }

  if (action.type === 'rename-folder') {
    const path = normalizeWorkspacePath(action.path);
    const name = action.name.trim();
    if (
      !path ||
      !isSimpleWorkspaceName(name) ||
      !folderPathSet(state.files, state.folders).has(path)
    ) {
      return state;
    }

    const destinationPath = joinWorkspacePath(parentPathOf(path), name);
    if (!destinationPath || destinationPath === path) return state;

    const filesOutsideSource = state.files.filter((file) => !isUnderPath(file.path, path));
    const foldersOutsideSource = state.folders.filter((folder) => !isUnderPath(folder, path));
    if (hasPathConflict(filesOutsideSource, foldersOutsideSource, destinationPath)) return state;

    const renamePath = (currentPath: string) =>
      currentPath === path
        ? destinationPath
        : `${destinationPath}/${currentPath.slice(path.length + 1)}`;
    const files = state.files.map((file) =>
      isUnderPath(file.path, path)
        ? {
            ...file,
            path: renamePath(file.path),
            updatedAt: nowIso(),
          }
        : file,
    );
    const folders = materializeFolders(files, [
      ...foldersOutsideSource,
      ...state.folders.filter((folder) => isUnderPath(folder, path)).map(renamePath),
      destinationPath,
    ]);
    const openPaths = state.openPaths.map((openFilePath) =>
      isUnderPath(openFilePath, path) ? renamePath(openFilePath) : openFilePath,
    );
    const selectedPath =
      state.selectedPath && isUnderPath(state.selectedPath, path)
        ? renamePath(state.selectedPath)
        : state.selectedPath;
    const expandedPaths = new Set(
      [...state.expandedPaths]
        .map((expandedPath) =>
          isUnderPath(expandedPath, path) ? renamePath(expandedPath) : expandedPath,
        )
        .concat(parentPathsOf(destinationPath), destinationPath),
    );

    return {
      ...state,
      expandedPaths: pruneExpandedPaths(expandedPaths, files, folders),
      files,
      folders,
      openPaths,
      selectedPath,
    };
  }

  if (action.type === 'move-file') {
    const sourcePath = normalizeWorkspacePath(action.sourcePath);
    const targetFolderPath = normalizeWorkspacePath(action.targetFolderPath);
    const sourceFile = fileMap(state.files).get(sourcePath);
    if (!sourceFile) return state;
    if (targetFolderPath && !folderPathSet(state.files, state.folders).has(targetFolderPath)) {
      return state;
    }
    if (parentPathOf(sourcePath) === targetFolderPath) return state;

    const destinationPath = joinWorkspacePath(targetFolderPath, fileNameOfPath(sourcePath));
    const filesWithoutSource = state.files.filter((file) => file.path !== sourcePath);
    if (!destinationPath || hasPathConflict(filesWithoutSource, state.folders, destinationPath)) {
      return state;
    }

    const files = [
      ...filesWithoutSource,
      {
        ...sourceFile,
        path: destinationPath,
        updatedAt: nowIso(),
      },
    ];
    const folders = preserveParentFolder(state.folders, sourcePath);
    const openPaths = state.openPaths.map((openFilePath) =>
      openFilePath === sourcePath ? destinationPath : openFilePath,
    );

    return {
      ...state,
      expandedPaths: expandParents(state.expandedPaths, destinationPath),
      files,
      folders,
      openPaths,
      selectedPath: state.selectedPath === sourcePath ? destinationPath : state.selectedPath,
    };
  }

  return state;
}
