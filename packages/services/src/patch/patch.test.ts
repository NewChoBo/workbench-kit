import { describe, expect, it } from 'vitest';
import { WorkspacePatchService } from './patch';
import type { WorkspaceFile, WorkspaceFileRepository } from '@workbench-kit/contracts';

class InMemoryWorkspaceFileRepository implements WorkspaceFileRepository {
  private files = new Map<string, WorkspaceFile>();

  async deleteFile(path: string) {
    this.files.delete(path);
  }

  async getFile(path: string) {
    return this.files.get(path) ?? null;
  }

  async listFiles() {
    return [...this.files.values()];
  }

  async writeFile(input: {
    content: string;
    expectedUpdatedAt?: string;
    mimeType?: string;
    path: string;
    source?: WorkspaceFile['source'];
    updatedAt?: string;
  }) {
    const next: WorkspaceFile = {
      content: input.content,
      mimeType: input.mimeType,
      path: input.path,
      source: input.source,
      updatedAt: input.updatedAt,
    };
    this.files.set(input.path, next);
    return next;
  }
}

class FailingWriteWorkspaceFileRepository implements WorkspaceFileRepository {
  async deleteFile(_path: string): Promise<void> {
    return undefined;
  }

  async getFile(_path: string): Promise<WorkspaceFile | null> {
    return null;
  }

  async listFiles() {
    return [];
  }

  async writeFile(_input: {
    content: string;
    expectedUpdatedAt?: string;
    mimeType?: string;
    path: string;
    source?: WorkspaceFile['source'];
    updatedAt?: string;
  }): Promise<WorkspaceFile> {
    throw new Error('write failed');
  }
}

class FailingDeleteWorkspaceFileRepository extends InMemoryWorkspaceFileRepository {
  override async deleteFile() {
    throw new Error('delete failed');
  }

  override async getFile() {
    return {
      content: 'existing',
      mimeType: 'text/plain',
      path: 'fail-delete.md',
      updatedAt: '2026-06-03T00:00:00.000Z',
    };
  }
}

class FailingGetOnlyWorkspaceFileRepository extends InMemoryWorkspaceFileRepository {
  override async getFile(_path: string): Promise<WorkspaceFile | null> {
    throw new Error('getFile failed');
  }
}

describe('WorkspacePatchService', () => {
  it('creates or updates file for write-file patches', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({
      repository,
      now: () => '2026-06-03T00:00:00.000Z',
      requestId: () => 'patch-metadata-1',
    });

    const result = await service.applyPatch({
      content: 'patched',
      mimeType: 'text/markdown',
      path: 'docs/readme.md',
      type: 'write-file',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      type: 'patch:applied',
      patch: {
        path: 'docs/readme.md',
        type: 'write-file',
      },
      requestId: 'patch-metadata-1',
      requestedAt: '2026-06-03T00:00:00.000Z',
    });
    expect(await repository.getFile('docs/readme.md')).toMatchObject({
      content: 'patched',
      mimeType: 'text/markdown',
      path: 'docs/readme.md',
    });
  });

  it('normalizes path for write and delete patches', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });

    await service.applyPatch({
      content: 'windows path',
      path: 'docs\\\\notes\\\\runtime.md',
      type: 'write-file',
    });

    const writeBack = await service.applyPatch({
      path: ' /docs//notes/runtime.md ',
      type: 'delete-file',
    });

    expect(writeBack).toMatchObject({
      type: 'patch:applied',
      patch: { path: 'docs/notes/runtime.md', type: 'delete-file' },
    });
    expect(await repository.getFile('docs/notes/runtime.md')).toBeNull();
  });

  it('deletes existing file for delete-file patches', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });
    await repository.writeFile({
      content: 'old',
      path: 'docs/readme.md',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });

    const result = await service.applyPatch({ path: 'docs/readme.md', type: 'delete-file' });

    expect(result).toMatchObject({ type: 'patch:applied', patch: { type: 'delete-file' } });
    expect(await repository.getFile('docs/readme.md')).toBeNull();
  });

  it('returns failed for delete patches on missing files', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });

    const result = await service.applyPatch({ path: 'docs/missing.md', type: 'delete-file' });

    expect(result).toMatchObject({
      type: 'patch:failed',
      code: 'not-found',
      patch: { type: 'delete-file' },
    });
  });

  it('returns failed for blank patch paths', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({
      repository,
      now: () => '2026-06-03T00:00:00.000Z',
      requestId: () => 'patch-metadata-2',
    });

    const result = await service.applyPatch({ path: '   ', type: 'delete-file' });

    expect(result).toMatchObject({ type: 'patch:failed', code: 'invalid-path' });
    expect(result).toMatchObject({
      requestId: 'patch-metadata-2',
      requestedAt: '2026-06-03T00:00:00.000Z',
    });
  });

  it('returns failed for repository errors on write patches', async () => {
    const repository = new FailingWriteWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });

    const result = await service.applyPatch({
      content: 'patch content',
      path: 'fail-write.md',
      type: 'write-file',
    });

    expect(result).toMatchObject({
      type: 'patch:failed',
      code: 'unknown',
      message: 'write failed',
      patch: { path: 'fail-write.md', type: 'write-file' },
    });
  });

  it('returns failed for repository errors on delete patches', async () => {
    const repository = new FailingDeleteWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });

    const result = await service.applyPatch({ path: 'fail-delete.md', type: 'delete-file' });

    expect(result).toMatchObject({
      type: 'patch:failed',
      code: 'unknown',
      message: 'delete failed',
      patch: { path: 'fail-delete.md', type: 'delete-file' },
    });
  });

  it('returns failed for repository get failure before delete', async () => {
    const repository = new FailingGetOnlyWorkspaceFileRepository();
    const service = new WorkspacePatchService({ repository });

    const result = await service.applyPatch({ path: 'docs/readme.md', type: 'delete-file' });

    expect(result).toMatchObject({
      type: 'patch:failed',
      code: 'unknown',
      message: 'getFile failed',
      patch: { path: 'docs/readme.md', type: 'delete-file' },
    });
  });
});
