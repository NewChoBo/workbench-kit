import {
  type SaveConflictCode,
  type SaveDraftInput,
  type SaveInput,
  type SaveResult,
  normalizeServiceFailureMessage,
  type WorkspaceFile,
  type WorkspaceFileRepository,
} from '@newchobo-ui/contracts';
import { normalizeServiceWorkspacePath } from './path';

let saveRequestCounter = 0;

export interface WorkspaceSaveServiceOptions {
  repository: WorkspaceFileRepository;
  now?: () => string;
  requestId?: () => string;
}

export interface WorkspaceCommitInput {
  content: string;
  path: string;
  source?: WorkspaceFile['source'];
  mimeType?: string;
}

export class WorkspaceSaveService {
  private readonly repository: WorkspaceFileRepository;
  private readonly now: () => string;
  private readonly requestId: () => string;

  constructor({
    now = () => new Date().toISOString(),
    requestId = defaultRequestId,
    repository,
  }: WorkspaceSaveServiceOptions) {
    this.now = now;
    this.requestId = requestId;
    this.repository = repository;
  }

  async commit({ content, path, source, mimeType }: WorkspaceCommitInput): Promise<SaveResult> {
    const requestMetadata = this.createRequestMetadata();
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
        ...requestMetadata,
        code: 'invalid-path',
        kind: 'save:failure',
        message: 'Empty path is not supported.',
        path,
      };
    }

    return this.saveDraftWithMetadata({ content, path: sanitizedPath, source, mimeType }, requestMetadata);
  }

  async discard({ path }: { path: string }): Promise<SaveResult> {
    const requestMetadata = this.createRequestMetadata();
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
        ...requestMetadata,
        code: 'invalid-path',
        kind: 'save:failure',
        message: 'Empty path is not supported.',
        path,
      };
    }

    return this.get(sanitizedPath).then((file): SaveResult => {
      if (!file) {
        return {
          ...requestMetadata,
          code: 'not-found',
          kind: 'save:failure',
          message: `No file exists at '${sanitizedPath}'.`,
          path: sanitizedPath,
        };
      }

      return {
        ...requestMetadata,
        file,
        kind: 'save:success',
        outcome: 'unchanged',
      };
    });
  }

  async saveDraft({
    content,
    mimeType,
    path,
    previousUpdatedAt,
    source,
  }: SaveDraftInput): Promise<SaveResult> {
    const requestMetadata = this.createRequestMetadata();
    return this.saveDraftWithMetadata(
      {
        content,
        mimeType,
        path,
        previousUpdatedAt,
        source,
      },
      requestMetadata,
    );
  }

  private async saveDraftWithMetadata(
    {
      content,
      mimeType,
      path,
      previousUpdatedAt,
      source,
    }: SaveDraftInput,
    requestMetadata: { requestId: string; requestedAt: string },
  ): Promise<SaveResult> {
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
        ...requestMetadata,
        code: 'invalid-path',
        kind: 'save:failure',
        message: 'Empty path is not supported.',
        path,
      };
    }

    const existing = await this.get(sanitizedPath);
    if (
      existing &&
      existing.content === content &&
      (previousUpdatedAt === undefined || existing.updatedAt === previousUpdatedAt)
    ) {
      return {
        ...requestMetadata,
        file: existing,
        kind: 'save:success',
        outcome: 'unchanged',
      };
    }

    if (existing && previousUpdatedAt !== undefined && existing.updatedAt !== previousUpdatedAt) {
      return this.failure(
        'stale-update',
        sanitizedPath,
        'Workspace file changed before save.',
        requestMetadata,
      );
    }

    const input: SaveInput = {
      content,
      mimeType,
      path: sanitizedPath,
      source,
      updatedAt: this.now(),
      expectedUpdatedAt: previousUpdatedAt,
    };

    try {
      const file = await this.repository.writeFile(input);
      return {
        ...requestMetadata,
        kind: 'save:success',
        outcome: existing ? 'updated' : 'created',
        file,
      };
    } catch (error) {
      return this.failure('unknown', sanitizedPath, normalizeServiceFailureMessage(error), requestMetadata);
    }
  }

  private async get(path: string): Promise<WorkspaceFile | null> {
    return this.repository.getFile(path);
  }

  private failure(
    code: SaveConflictCode,
    path: string,
    message: string,
    requestMetadata: { requestId: string; requestedAt: string },
  ): SaveResult {
    return {
      ...requestMetadata,
      code,
      kind: 'save:failure',
      message,
      path,
    };
  }

  private sanitizePath(path: string) {
    return normalizeServiceWorkspacePath(path);
  }

  private createRequestMetadata() {
    return {
      requestId: this.requestId(),
      requestedAt: this.now(),
    };
  }
}

function defaultRequestId() {
  saveRequestCounter += 1;
  return `save-${saveRequestCounter}`;
}
