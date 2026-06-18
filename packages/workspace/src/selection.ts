import { normalizeWorkspacePath, parentPathOf } from './path';

export type WorkspaceSelectionMode = 'range' | 'single' | 'toggle' | 'toggle-range';

export interface WorkspaceSelectionState {
  anchorPath?: string;
  /** Primary explorer focus for create/reveal actions. May be a file or folder path. */
  focusedPath?: string;
  paths: string[];
}

export function createEmptyWorkspaceSelection(): WorkspaceSelectionState {
  return { paths: [] };
}

export function resolveWorkspaceCreateParentPath(
  focusedPath: string | undefined,
  folderPaths: Iterable<string>,
): string {
  const normalizedFocusedPath = focusedPath ? normalizeWorkspacePath(focusedPath) : '';
  if (!normalizedFocusedPath) {
    return '';
  }

  const folderPathSet = new Set(normalizeWorkspaceSelectionPaths(folderPaths));
  if (folderPathSet.has(normalizedFocusedPath)) {
    return normalizedFocusedPath;
  }

  return parentPathOf(normalizedFocusedPath);
}

export interface UpdateWorkspaceSelectionInput {
  mode: WorkspaceSelectionMode;
  orderedPaths: Iterable<string>;
  selection: WorkspaceSelectionState;
  targetPath: string;
}

export interface WorkspaceSelectionActionPathsInput {
  selectedPaths: Iterable<string>;
  targetPath: string;
}

export function normalizeWorkspaceSelectionPaths(paths: Iterable<string>) {
  const selectedPaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const path of paths) {
    const normalizedPath = normalizeWorkspacePath(path);
    if (!normalizedPath || seenPaths.has(normalizedPath)) continue;

    selectedPaths.push(normalizedPath);
    seenPaths.add(normalizedPath);
  }

  return selectedPaths;
}

export function getWorkspaceSelectionActionPaths({
  selectedPaths,
  targetPath,
}: WorkspaceSelectionActionPathsInput) {
  const normalizedSelectedPaths = normalizeWorkspaceSelectionPaths(selectedPaths);
  const normalizedTargetPath = normalizeWorkspacePath(targetPath);
  if (!normalizedTargetPath) return normalizedSelectedPaths;

  return normalizedSelectedPaths.includes(normalizedTargetPath)
    ? normalizedSelectedPaths
    : [normalizedTargetPath];
}

export function pruneWorkspaceSelection(
  selection: WorkspaceSelectionState,
  availableFilePaths: Iterable<string>,
  availableFolderPaths: Iterable<string> = [],
): WorkspaceSelectionState {
  const availablePathSet = new Set([
    ...normalizeWorkspaceSelectionPaths(availableFilePaths),
    ...normalizeWorkspaceSelectionPaths(availableFolderPaths),
  ]);
  const paths = normalizeWorkspaceSelectionPaths(selection.paths).filter((path) =>
    availablePathSet.has(path),
  );
  const anchorPath = selection.anchorPath
    ? normalizeWorkspacePath(selection.anchorPath)
    : undefined;
  const focusedPath = selection.focusedPath
    ? normalizeWorkspacePath(selection.focusedPath)
    : undefined;

  return {
    anchorPath:
      anchorPath && availablePathSet.has(anchorPath) ? anchorPath : paths[paths.length - 1],
    focusedPath:
      focusedPath && availablePathSet.has(focusedPath)
        ? focusedPath
        : (paths[paths.length - 1] ?? undefined),
    paths,
  };
}

export function getWorkspaceSelectionRange({
  anchorPath,
  orderedPaths,
  targetPath,
}: {
  anchorPath?: string;
  orderedPaths: Iterable<string>;
  targetPath: string;
}) {
  const paths = normalizeWorkspaceSelectionPaths(orderedPaths);
  const target = normalizeWorkspacePath(targetPath);
  const targetIndex = paths.indexOf(target);
  if (targetIndex < 0) return [];

  const anchor = anchorPath ? normalizeWorkspacePath(anchorPath) : undefined;
  const anchorIndex = anchor ? paths.indexOf(anchor) : -1;
  if (anchorIndex < 0) return [target];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return paths.slice(start, end + 1);
}

export function updateWorkspaceSelection({
  mode,
  orderedPaths,
  selection,
  targetPath,
}: UpdateWorkspaceSelectionInput): WorkspaceSelectionState {
  const orderedSelectionPaths = normalizeWorkspaceSelectionPaths(orderedPaths);
  const target = normalizeWorkspacePath(targetPath);
  if (!target || !orderedSelectionPaths.includes(target)) {
    return pruneWorkspaceSelection(selection, orderedSelectionPaths);
  }

  const currentSelection = pruneWorkspaceSelection(selection, orderedSelectionPaths);

  if (mode === 'single') {
    return {
      anchorPath: target,
      focusedPath: target,
      paths: [target],
    };
  }

  if (mode === 'toggle') {
    const paths = currentSelection.paths.includes(target)
      ? currentSelection.paths.filter((path) => path !== target)
      : [...currentSelection.paths, target];

    return {
      anchorPath: paths.includes(target) ? target : paths[paths.length - 1],
      paths,
    };
  }

  const anchorPath =
    currentSelection.anchorPath && orderedSelectionPaths.includes(currentSelection.anchorPath)
      ? currentSelection.anchorPath
      : (currentSelection.paths[currentSelection.paths.length - 1] ?? target);
  const range = getWorkspaceSelectionRange({
    anchorPath,
    orderedPaths: orderedSelectionPaths,
    targetPath: target,
  });

  return {
    anchorPath,
    paths:
      mode === 'toggle-range'
        ? normalizeWorkspaceSelectionPaths([...currentSelection.paths, ...range])
        : range,
  };
}
