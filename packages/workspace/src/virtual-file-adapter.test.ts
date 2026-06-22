import { describe, expect, it } from 'vitest';
import {
  mapVirtualFileLikeRecordToWorkspaceFiles,
  mapVirtualFileLikeToWorkspaceFile,
  mapVirtualFileOriginToSource,
  mapWorkspaceFileToVirtualFile,
  mapWorkspaceSourceToVirtualFileOrigin,
} from './virtual-file-adapter';

describe('virtual file adapter', () => {
  it('maps virtual file origin to workspace source', () => {
    expect(mapVirtualFileOriginToSource('agent')).toBe('assistant');
    expect(mapVirtualFileOriginToSource('user')).toBe('user');
    expect(mapWorkspaceSourceToVirtualFileOrigin('assistant')).toBe('agent');
    expect(mapWorkspaceSourceToVirtualFileOrigin('user')).toBe('user');
    expect(mapWorkspaceSourceToVirtualFileOrigin(undefined)).toBe('user');
  });

  it('maps virtual file fields to workspace file', () => {
    expect(
      mapVirtualFileLikeToWorkspaceFile({
        content: 'hello',
        mimeType: 'text/markdown',
        origin: 'agent',
        path: '\\src\\notes.md',
        updatedAt: '2026-06-22T00:00:00.000Z',
      }),
    ).toEqual({
      content: 'hello',
      mimeType: 'text/markdown',
      path: 'src/notes.md',
      source: 'assistant',
      updatedAt: '2026-06-22T00:00:00.000Z',
    });
  });

  it('maps workspace file back to virtual file with defaults', () => {
    expect(
      mapWorkspaceFileToVirtualFile(
        {
          content: 'draft',
          path: 'src/draft.txt',
          source: 'user',
        },
        {
          defaultMimeType: 'text/plain',
          defaultUpdatedAt: () => '2026-06-22T12:00:00.000Z',
        },
      ),
    ).toEqual({
      content: 'draft',
      mimeType: 'text/plain',
      origin: 'user',
      path: 'src/draft.txt',
      updatedAt: '2026-06-22T12:00:00.000Z',
    });
  });

  it('maps virtual file records to workspace file lists', () => {
    expect(
      mapVirtualFileLikeRecordToWorkspaceFiles({
        'src/a.ts': {
          content: 'a',
          mimeType: 'text/typescript',
          origin: 'user',
          path: 'src/a.ts',
          updatedAt: '2026-06-22T00:00:00.000Z',
        },
      }),
    ).toEqual([
      {
        content: 'a',
        mimeType: 'text/typescript',
        path: 'src/a.ts',
        source: 'user',
        updatedAt: '2026-06-22T00:00:00.000Z',
      },
    ]);
  });
});
