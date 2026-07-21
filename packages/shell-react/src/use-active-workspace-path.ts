import { useMemo } from 'react';
import { parseWorkspaceResourceUri } from '@workbench-kit/workspace';

export function resolveActiveWorkspacePath(resourceUri: string | undefined): string | undefined {
  if (!resourceUri) {
    return undefined;
  }

  const resource = parseWorkspaceResourceUri(resourceUri);
  return resource?.kind === 'file' ? resource.path : undefined;
}

export function useActiveWorkspacePath(resourceUri: string | undefined): string | undefined {
  return useMemo(() => resolveActiveWorkspacePath(resourceUri), [resourceUri]);
}
