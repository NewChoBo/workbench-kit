export function normalizeWorkspacePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

export function workspacePathSegments(path: string) {
  return normalizeWorkspacePath(path).split('/').filter(Boolean);
}

export function fileNameOfPath(path: string) {
  const segments = workspacePathSegments(path);
  return segments[segments.length - 1] ?? path;
}

export function extensionOfPath(path: string) {
  const fileName = fileNameOfPath(path).toLowerCase();
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index + 1) : '';
}
