import type { ServiceFailure, ServiceFailureCode } from './result';

export type WorkspaceFileSource = 'assistant' | 'user';

export interface WorkspaceFile {
  content: string;
  mimeType?: string;
  path: string;
  source?: WorkspaceFileSource;
  updatedAt?: string;
}

export interface SaveInput {
  content: string;
  path: string;
  source?: WorkspaceFileSource;
  mimeType?: string;
  updatedAt?: string;
  expectedUpdatedAt?: string;
}

export interface WorkspaceFileListOptions {
  paths?: Iterable<string>;
}

export interface WorkspaceFileRepository {
  deleteFile(path: string): Promise<void>;
  getFile(path: string): Promise<WorkspaceFile | null>;
  listFiles(): Promise<readonly WorkspaceFile[]>;
  writeFile(input: SaveInput): Promise<WorkspaceFile>;
}

export type SaveConflictCode = ServiceFailureCode;

export interface SaveSuccess {
  file: WorkspaceFile;
  kind: 'save:success';
  outcome: 'created' | 'updated' | 'unchanged';
}

export interface SaveFailure extends ServiceFailure {
  code: SaveConflictCode;
  kind: 'save:failure';
  path?: string;
}

export type SaveResult = SaveSuccess | SaveFailure;

export interface SaveDraftInput {
  content: string;
  path: string;
  previousUpdatedAt?: string;
  source?: WorkspaceFileSource;
  mimeType?: string;
}

export interface SaveServiceResult {
  file?: WorkspaceFile;
  kind: 'saved' | 'unchanged' | 'skipped' | 'failed';
  reason?: string;
}

export abstract class AbstractWorkspaceFileRepository implements WorkspaceFileRepository {
  public abstract deleteFile(path: string): Promise<void>;
  public abstract getFile(path: string): Promise<WorkspaceFile | null>;
  public abstract listFiles(): Promise<readonly WorkspaceFile[]>;
  public abstract writeFile(input: SaveInput): Promise<WorkspaceFile>;
}

export function isSaveFailure(result: SaveResult): result is SaveFailure {
  return result.kind === 'save:failure';
}

export function isSaveSuccess(result: SaveResult): result is SaveSuccess {
  return result.kind === 'save:success';
}
