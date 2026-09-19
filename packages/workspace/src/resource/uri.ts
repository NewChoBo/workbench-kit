import { normalizeWorkspacePath } from '../path/path.js';
import type { WorkspaceFile } from '../data/types.js';

export const WORKSPACE_RESOURCE_SCHEME = 'workspace' as const;

export type WorkspaceResourceKind = 'file' | 'folder';

export interface WorkspaceResourceUri {
  readonly scheme: typeof WORKSPACE_RESOURCE_SCHEME;
  readonly path: string;
  readonly kind: WorkspaceResourceKind;
}

export function formatWorkspaceResourceUri(input: {
  path: string;
  kind: WorkspaceResourceKind;
}): string {
  const path = normalizeWorkspacePath(input.path);
  return `workspace://${input.kind}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function parseWorkspaceResourceUri(uri: string): WorkspaceResourceUri | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== `${WORKSPACE_RESOURCE_SCHEME}:`) {
      return null;
    }

    const kind = url.hostname;
    if (kind !== 'file' && kind !== 'folder') {
      return null;
    }

    // Decode once without allowing escaped filename data to become a separator.
    if (/%2f|%5c/i.test(url.pathname)) {
      return null;
    }
    const path = normalizeWorkspacePath(decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (kind === 'file' && !path) {
      return null;
    }

    return {
      scheme: WORKSPACE_RESOURCE_SCHEME,
      path,
      kind,
    };
  } catch {
    return null;
  }
}

export function workspaceResourceUriForFile(file: WorkspaceFile): string {
  return formatWorkspaceResourceUri({ path: file.path, kind: 'file' });
}

export function workspaceResourceUriForFolder(path: string): string {
  return formatWorkspaceResourceUri({ path, kind: 'folder' });
}

export function workspacePathFromResourceUri(uri: string): string | undefined {
  return parseWorkspaceResourceUri(uri)?.path;
}
