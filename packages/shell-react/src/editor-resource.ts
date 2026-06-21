const WORKSPACE_FILE_RESOURCE_PREFIX = 'workspace://file/';

export function pathForResource(resourceUri: string): string {
  return resourceUri.startsWith(WORKSPACE_FILE_RESOURCE_PREFIX)
    ? resourceUri.slice(WORKSPACE_FILE_RESOURCE_PREFIX.length)
    : resourceUri;
}

export function copyResourcePath(resourceUri: string): void {
  const path = pathForResource(resourceUri);
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) return;

  void clipboard.writeText(path).catch(() => undefined);
}
