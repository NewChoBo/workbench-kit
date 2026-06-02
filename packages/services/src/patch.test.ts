import { describe, expect, it } from 'vitest';
import { WorkspacePatchService } from './patch';
import type { WorkspaceFile, WorkspaceFileRepository } from '@newchobo-ui/contracts';

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

describe('WorkspacePatchService', () => {
  it('creates or updates file for write-file patches', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspacePatchService({
      repository,
      now: () => '2026-06-03T00:00:00.000Z',
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
    });
    expect(await repository.getFile('docs/readme.md')).toMatchObject({
      content: 'patched',
      mimeType: 'text/markdown',
      path: 'docs/readme.md',
    });
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
    const service = new WorkspacePatchService({ repository });

    const result = await service.applyPatch({ path: '   ', type: 'delete-file' });

    expect(result).toMatchObject({ type: 'patch:failed', code: 'invalid-path' });
  });
});
