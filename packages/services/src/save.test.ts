import { describe, expect, it } from 'vitest';
import { WorkspaceSaveService } from './save';
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
    const previous = this.files.get(input.path);
    if (previous && input.expectedUpdatedAt && previous.updatedAt !== input.expectedUpdatedAt) {
      throw new Error('stale');
    }

    const next: WorkspaceFile = {
      content: input.content,
      mimeType: input.mimeType,
      path: input.path,
      source: input.source ?? previous?.source,
      updatedAt: input.updatedAt,
    };
    this.files.set(input.path, next);
    return next;
  }
}

class FailingSaveWorkspaceFileRepository implements WorkspaceFileRepository {
  async deleteFile(_path: string) {
    return undefined;
  }

  async getFile(_path: string) {
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
    throw new Error('save failed');
  }
}

describe('WorkspaceSaveService', () => {
  it('creates a file when saveDraft is called first time', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({ repository });

    const result = await service.saveDraft({
      content: 'first content',
      path: 'src/index.ts',
    });

    expect(result).toMatchObject({
      kind: 'save:success',
      outcome: 'created',
      file: {
        content: 'first content',
        path: 'src/index.ts',
      },
    });
  });

  it('normalizes path before save', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({ repository });

    const result = await service.saveDraft({
      content: 'hello',
      path: '  /src//components//new-file.ts ',
    });

    expect(result).toMatchObject({
      kind: 'save:success',
      outcome: 'created',
      file: {
        content: 'hello',
        path: 'src/components/new-file.ts',
      },
    });
    expect(await repository.getFile('src/components/new-file.ts')).toMatchObject({
      path: 'src/components/new-file.ts',
      content: 'hello',
    });
  });

  it('updates saved content when unchanged baseline is still valid', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({ repository, now: () => '2026-06-03T00:00:00.000Z' });
    await repository.writeFile({
      content: 'old',
      path: 'src/index.ts',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });

    const result = await service.saveDraft({
      content: 'next',
      path: 'src/index.ts',
      previousUpdatedAt: '2026-06-03T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      kind: 'save:success',
      outcome: 'updated',
      file: {
        content: 'next',
        path: 'src/index.ts',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
    });
  });

  it('returns unchanged for same content and matching baseline', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({
      repository,
      now: () => '2026-06-03T00:00:00.001Z',
      requestId: () => 'save-metadata-1',
    });
    const existing = await repository.writeFile({
      content: 'same',
      path: 'src/index.ts',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });

    const result = await service.saveDraft({
      content: 'same',
      path: 'src/index.ts',
      previousUpdatedAt: existing.updatedAt,
    });

    expect(result).toMatchObject({
      kind: 'save:success',
      outcome: 'unchanged',
      file: { content: 'same', path: 'src/index.ts' },
      requestId: 'save-metadata-1',
      requestedAt: '2026-06-03T00:00:00.001Z',
    });
  });

  it('returns stale-update when baseline timestamp has changed', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({ repository });
    await repository.writeFile({
      content: 'old',
      path: 'src/index.ts',
      updatedAt: '2026-06-02T00:00:00.000Z',
    });

    const result = await service.saveDraft({
      content: 'next',
      path: 'src/index.ts',
      previousUpdatedAt: '2026-06-01T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      kind: 'save:failure',
      code: 'stale-update',
      path: 'src/index.ts',
    });
  });

  it('returns invalid-path for blank path', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    const service = new WorkspaceSaveService({
      repository,
      now: () => '2026-06-03T00:00:00.000Z',
      requestId: () => 'save-metadata-blank',
    });

    const result = await service.saveDraft({ content: 'x', path: '   ' });

    expect(result).toMatchObject({
      kind: 'save:failure',
      code: 'invalid-path',
      path: '   ',
      requestId: 'save-metadata-blank',
      requestedAt: '2026-06-03T00:00:00.000Z',
    });
  });

  it('returns unknown failure when repository write fails', async () => {
    const repository = new FailingSaveWorkspaceFileRepository();
    const service = new WorkspaceSaveService({ repository });

    const result = await service.saveDraft({
      content: 'x',
      path: 'src/index.ts',
    });

    expect(result).toMatchObject({
      kind: 'save:failure',
      code: 'unknown',
      message: 'save failed',
      path: 'src/index.ts',
    });
  });

  it('commit delegates through saveDraft and returns failure for repository errors', async () => {
    const repository = new FailingSaveWorkspaceFileRepository();
    let requestCounter = 0;
    const service = new WorkspaceSaveService({
      repository,
      requestId: () => `save-commit-failed-${++requestCounter}`,
      now: () => '2026-06-03T00:00:00.000Z',
    });

    const result = await service.commit({
      content: 'x',
      path: 'src/index.ts',
    });

    expect(result).toMatchObject({
      kind: 'save:failure',
      code: 'unknown',
      message: 'save failed',
      path: 'src/index.ts',
      requestId: 'save-commit-failed-1',
      requestedAt: '2026-06-03T00:00:00.000Z',
    });
    expect(requestCounter).toBe(1);
  });

  it('commit keeps request metadata from outer entrypoint and does not regenerate it internally', async () => {
    const repository = new InMemoryWorkspaceFileRepository();
    let requestCounter = 0;
    const service = new WorkspaceSaveService({
      repository,
      requestId: () => `save-commit-${++requestCounter}`,
      now: () => '2026-06-03T00:00:00.001Z',
    });

    const result = await service.commit({
      content: 'committed',
      path: 'src/index.ts',
    });

    expect(result).toMatchObject({
      kind: 'save:success',
      outcome: 'created',
      file: {
        content: 'committed',
        path: 'src/index.ts',
      },
      requestId: 'save-commit-1',
      requestedAt: '2026-06-03T00:00:00.001Z',
    });
    expect(requestCounter).toBe(1);
  });
});
