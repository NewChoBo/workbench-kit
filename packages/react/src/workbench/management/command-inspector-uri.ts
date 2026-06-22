const COMMAND_INSPECTOR_URI_PREFIX = 'workbench://command/inspect/' as const;

export function buildCommandInspectorUri(commandId: string): string {
  return `${COMMAND_INSPECTOR_URI_PREFIX}${encodeURIComponent(commandId)}`;
}

export function parseCommandInspectorUri(resourceUri: string): string | undefined {
  if (!resourceUri.startsWith(COMMAND_INSPECTOR_URI_PREFIX)) {
    return undefined;
  }

  const encodedId = resourceUri.slice(COMMAND_INSPECTOR_URI_PREFIX.length);
  if (!encodedId) {
    return undefined;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return undefined;
  }
}

export function isCommandInspectorUri(resourceUri: string): boolean {
  return parseCommandInspectorUri(resourceUri) !== undefined;
}
