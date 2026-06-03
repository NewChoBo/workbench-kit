import type { ChatMessageSource } from './chat';
import type { WorkspaceFile } from './save';
import type { ServiceFailure, ServiceFailureCode } from './result';

export type WorkspacePatchSource = ChatMessageSource;

export interface WorkspacePatchWriteFile {
  content: string;
  mimeType?: string;
  path: string;
  source?: WorkspacePatchSource;
  type: 'write-file';
  updatedAt?: string;
}

export interface WorkspacePatchDeleteFile {
  path: string;
  type: 'delete-file';
}

export type WorkspacePatchEvent = WorkspacePatchWriteFile | WorkspacePatchDeleteFile;

export type WorkspacePatchConflictCode = Exclude<ServiceFailureCode, 'stale-update'>;

export interface WorkspacePatchApplySuccess {
  patch: WorkspacePatchEvent;
  type: 'patch:applied';
}

export interface WorkspacePatchApplyFailure extends ServiceFailure {
  code: WorkspacePatchConflictCode;
  patch: WorkspacePatchEvent;
  type: 'patch:failed';
}

export type WorkspacePatchApplyStatus = WorkspacePatchApplySuccess | WorkspacePatchApplyFailure;

export type WorkspacePatchApplyResult = WorkspacePatchApplyStatus;

export interface WorkspacePatchApplier {
  applyPatch(
    patch: WorkspacePatchEvent,
    fileSnapshot?: WorkspaceFile,
  ): Promise<WorkspacePatchApplyStatus>;
}

export interface WorkspacePatchContext {
  pathPrefix?: string;
  workspaceFiles?: readonly WorkspaceFile[];
}

export abstract class AbstractPatchApplier implements WorkspacePatchApplier {
  public abstract applyPatch(
    patch: WorkspacePatchEvent,
    fileSnapshot?: WorkspaceFile,
  ): Promise<WorkspacePatchApplyStatus>;
}

export function isWorkspacePatchDeleteFile(
  patch: WorkspacePatchEvent,
): patch is WorkspacePatchDeleteFile {
  return patch.type === 'delete-file';
}

export function isWorkspacePatchWriteFile(
  patch: WorkspacePatchEvent,
): patch is WorkspacePatchWriteFile {
  return patch.type === 'write-file';
}

export function isPatchSuccess(
  result: WorkspacePatchApplyStatus,
): result is WorkspacePatchApplySuccess {
  return result.type === 'patch:applied';
}
