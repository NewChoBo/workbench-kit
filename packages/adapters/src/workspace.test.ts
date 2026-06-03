import { describe, expect, it } from 'vitest';
import type { CreateWorkspaceFileInput } from '@newchobo-ui/workspace';
import { InMemoryWorkspaceFileRepository, createWorkspaceFileRepository } from './workspace';

describe('InMemoryWorkspaceFileRepository', () => {
  it('normalizes seed files and returns cloned snapshots', async () => {
    const repository = new InMemoryWorkspaceFileRepository([
      {
        content: 'export const app = "value";',
        path: 'src//App.tsx',
        source: 'assistant',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
    ]);

    const filesBefore = await repository.listFiles();
    expect(filesBefore).toHaveLength(1);
    expect(filesBefore[0]).toMatchObject({ path: 'src/App.tsx' });

    filesBefore[0].content = 'mutated';
    const filesAfter = await repository.listFiles();
    expect(filesAfter[0].content).toBe('export const app = "value";');
  });

  it('creates, updates, and deletes files with adapter callbacks', async () => {
    const created: CreateWorkspaceFileInput[] = [];
    const deleted: string[] = [];
    const saved: Array<{ path: string; content: string }> = [];
    const repository = createWorkspaceFileRepository({
      createFile: (file) => created.push(file),
      deleteFile: (path) => deleted.push(path),
      files: [],
      saveFile: (path, file) => saved.push({ path, content: file.content }),
    });

    const createdFile = await repository.writeFile({
      content: 'first',
      mimeType: 'text/plain',
      path: ' /docs//note.md',
      source: 'user',
    });
    expect(createdFile).toMatchObject({
      content: 'first',
      mimeType: 'text/plain',
      path: 'docs/note.md',
      source: 'user',
    });

    expect(created).toEqual([
      {
        content: 'first',
        mimeType: 'text/plain',
        path: 'docs/note.md',
        source: 'user',
      },
    ]);

    const updatedFile = await repository.writeFile({
      content: 'updated',
      path: 'docs/note.md',
      source: 'assistant',
      expectedUpdatedAt: createdFile.updatedAt,
    });
    expect(updatedFile).toMatchObject({
      content: 'updated',
      path: 'docs/note.md',
      source: 'assistant',
    });
    expect(saved).toEqual([{ path: 'docs/note.md', content: 'updated' }]);

    expect(await repository.getFile('docs/note.md')).toMatchObject({ content: 'updated' });

    await repository.deleteFile('docs/note.md');
    expect(deleted).toEqual(['docs/note.md']);

    const removed = await repository.getFile('docs/note.md');
    expect(removed).toBeNull();
  });

  it('throws on stale writes when expectedUpdatedAt does not match', async () => {
    const repository = new InMemoryWorkspaceFileRepository([
      {
        content: 'value',
        path: 'config.json',
        updatedAt: '2026-06-03T00:00:00.001Z',
      },
    ]);

    await expect(
      repository.writeFile({
        content: 'new-value',
        path: 'config.json',
        expectedUpdatedAt: '2026-06-03T00:00:00.000Z',
      }),
    ).rejects.toThrow('Stale file version.');
  });
});
