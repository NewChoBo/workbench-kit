export class WorkspacePathError extends Error {
  readonly code = 'WORKSPACE_PATH_INVALID' as const;

  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = 'WorkspacePathError';
  }
}

/**
 * Normalize a workspace-relative virtual path.
 * Rejects traversal (`..` / `.`), Windows drive letters, and UNC forms.
 * Leading `/` or `\` is stripped (virtual paths stay relative). Hosts that map
 * virtual paths to disk must still confine filesystem roots.
 */
export function normalizeWorkspacePath(path: string): string {
  if (!path) {
    return '';
  }

  const slashNormalized = path.replace(/\\/g, '/');

  if (slashNormalized.startsWith('//')) {
    throw new WorkspacePathError(
      'Workspace path must be relative (UNC paths are not allowed).',
      path,
    );
  }

  if (/^[A-Za-z]:/.test(slashNormalized)) {
    throw new WorkspacePathError(
      'Workspace path must be relative (drive-letter paths are not allowed).',
      path,
    );
  }

  const collapsed = slashNormalized.replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
  if (!collapsed) {
    return '';
  }

  const segments = collapsed.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') {
      throw new WorkspacePathError(
        'Workspace path must not contain empty, ".", or ".." segments.',
        path,
      );
    }
  }

  return collapsed;
}

/** Normalize when valid; return undefined for traversal/drive/UNC/invalid forms. */
export function tryNormalizeWorkspacePath(path: string): string | undefined {
  try {
    return normalizeWorkspacePath(path);
  } catch (error) {
    if (error instanceof WorkspacePathError) {
      return undefined;
    }
    throw error;
  }
}

export const WORKSPACE_PATH_DISPLAY_SEPARATOR = ' > ';

export function workspacePathSegments(path: string) {
  return normalizeWorkspacePath(path).split('/').filter(Boolean);
}

export function formatWorkspacePathDisplay(path: string) {
  return workspacePathSegments(path).join(WORKSPACE_PATH_DISPLAY_SEPARATOR);
}

export function joinWorkspacePath(parentPath: string, name: string) {
  return normalizeWorkspacePath([parentPath, name].filter(Boolean).join('/'));
}

export function fileNameOfPath(path: string) {
  const segments = workspacePathSegments(path);
  return segments[segments.length - 1] ?? path;
}

export function parentPathOf(path: string) {
  const segments = workspacePathSegments(path);
  return segments.slice(0, -1).join('/');
}

export function parentPathsOf(path: string) {
  const segments = workspacePathSegments(path);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

export function isSimpleWorkspaceName(name: string) {
  const trimmedName = name.trim();
  return (
    Boolean(trimmedName) &&
    trimmedName !== '.' &&
    trimmedName !== '..' &&
    !/[\\/]/.test(trimmedName)
  );
}

export function extensionOfPath(path: string) {
  const fileName = fileNameOfPath(path).toLowerCase();
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index + 1) : '';
}
