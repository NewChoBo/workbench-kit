import { parseWorkspaceResourceUri } from '@workbench-kit/workspace';

export function isWorkspaceFileResourceUri(resourceUri: string): boolean {
  return parseWorkspaceResourceUri(resourceUri)?.kind === 'file';
}

export function pathForWorkspaceFileResource(resourceUri: string): string | undefined {
  const parsed = parseWorkspaceResourceUri(resourceUri);
  return parsed?.kind === 'file' ? parsed.path : undefined;
}

export function labelForWorkspaceFileResource(resourceUri: string): string {
  const path = pathForWorkspaceFileResource(resourceUri) ?? resourceUri;
  const segments = path.split('/');
  return segments[segments.length - 1] || path;
}
