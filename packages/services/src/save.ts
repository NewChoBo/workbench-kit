import {
  type SaveConflictCode,
  type SaveDraftInput,
  type SaveInput,
  type SaveResult,
  type WorkspaceFile,
  type WorkspaceFileRepository,
} from '@newchobo-ui/contracts';

export interface WorkspaceSaveServiceOptions {
  repository: WorkspaceFileRepository;
  now?: () => string;
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

  constructor({ now = () => new Date().toISOString(), repository }: WorkspaceSaveServiceOptions) {
    this.now = now;
    this.repository = repository;
  }

  async commit({ content, path, source, mimeType }: WorkspaceCommitInput): Promise<SaveResult> {
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
        code: 'invalid-path',
        kind: 'save:failure',
        message: 'Empty path is not supported.',
        path,
      };
    }

    return this.saveDraft({ content, path: sanitizedPath, source, mimeType });
  }

  async discard({ path }: { path: string }): Promise<SaveResult> {
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
        code: 'invalid-path',
        kind: 'save:failure',
        message: 'Empty path is not supported.',
        path,
      };
    }

    return this.get(sanitizedPath).then((file): SaveResult => {
      if (!file) {
        return {
          code: 'not-found',
          kind: 'save:failure',
          message: `No file exists at '${sanitizedPath}'.`,
          path: sanitizedPath,
        };
      }

      return {
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
    const sanitizedPath = this.sanitizePath(path);
    if (!sanitizedPath) {
      return {
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
        file: existing,
        kind: 'save:success',
        outcome: 'unchanged',
      };
    }

    if (existing && previousUpdatedAt !== undefined && existing.updatedAt !== previousUpdatedAt) {
      return this.failure('stale-update', sanitizedPath, 'Workspace file changed before save.');
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
        kind: 'save:success',
        outcome: existing ? 'updated' : 'created',
        file,
      };
    } catch (error) {
      return this.failure('unknown', sanitizedPath, this.normalizeError(error));
    }
  }

  private async get(path: string): Promise<WorkspaceFile | null> {
    return this.repository.getFile(path);
  }

  private failure(
    code: SaveConflictCode,
    path: string,
    message: string,
  ): { code: SaveConflictCode; kind: 'save:failure'; message: string; path: string } {
    return {
      code,
      kind: 'save:failure',
      message,
      path,
    };
  }

  private sanitizePath(path: string) {
    return path.trim().replace(/\\+/g, '/').replace(/\/+/g, '/');
  }

  private normalizeError(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown repository error';
  }
}
