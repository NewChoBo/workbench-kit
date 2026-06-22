import { normalizeWorkspacePath } from './path';
import type { WorkspaceFile, WorkspaceFileSource } from './types';

/**
 * Consumer-side virtual file provenance on host virtual file records
 * (e.g. `origin: 'agent' | 'user'`). Maps to {@link WorkspaceFileSource} at the
 * kit boundary (`assistant` / `user`).
 */
export type VirtualFileOrigin = 'agent' | 'user';

/**
 * Minimal virtual-file shape for explorer adapters. Host apps may extend this
 * with app-specific fields; only the listed properties participate in mapping.
 */
export interface VirtualFileLike {
  content: string;
  mimeType?: string;
  origin?: VirtualFileOrigin;
  path: string;
  updatedAt?: string;
}

export interface MappedVirtualFile {
  content: string;
  mimeType: string;
  origin: VirtualFileOrigin;
  path: string;
  updatedAt: string;
}

export interface MapWorkspaceFileToVirtualFileOptions {
  defaultMimeType?: string;
  defaultUpdatedAt?: () => string;
}

export function mapVirtualFileOriginToSource(origin: VirtualFileOrigin): WorkspaceFileSource {
  return origin === 'agent' ? 'assistant' : 'user';
}

export function mapWorkspaceSourceToVirtualFileOrigin(
  source?: WorkspaceFileSource,
): VirtualFileOrigin {
  return source === 'assistant' ? 'agent' : 'user';
}

export function mapVirtualFileLikeToWorkspaceFile(file: VirtualFileLike): WorkspaceFile {
  return {
    content: file.content,
    mimeType: file.mimeType,
    path: normalizeWorkspacePath(file.path),
    source: file.origin ? mapVirtualFileOriginToSource(file.origin) : undefined,
    updatedAt: file.updatedAt,
  };
}

export function mapWorkspaceFileToVirtualFile(
  file: WorkspaceFile,
  options: MapWorkspaceFileToVirtualFileOptions = {},
): MappedVirtualFile {
  const defaultUpdatedAt = options.defaultUpdatedAt ?? (() => new Date().toISOString());

  return {
    content: file.content,
    mimeType: file.mimeType ?? options.defaultMimeType ?? 'text/plain',
    origin: mapWorkspaceSourceToVirtualFileOrigin(file.source),
    path: normalizeWorkspacePath(file.path),
    updatedAt: file.updatedAt ?? defaultUpdatedAt(),
  };
}

export function mapVirtualFileLikeListToWorkspaceFiles(
  files: readonly VirtualFileLike[],
): WorkspaceFile[] {
  return files.map(mapVirtualFileLikeToWorkspaceFile);
}

export function mapVirtualFileLikeRecordToWorkspaceFiles(
  files: Readonly<Record<string, VirtualFileLike>>,
): WorkspaceFile[] {
  return mapVirtualFileLikeListToWorkspaceFiles(Object.values(files));
}
