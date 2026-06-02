export function normalizeWorkspacePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

export function workspacePathSegments(path: string) {
  return normalizeWorkspacePath(path).split('/').filter(Boolean);
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
