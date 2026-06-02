import { describe, expect, it } from 'vitest';
import {
  createWorkspaceFileDraft,
  discardWorkspaceFileDraft,
  isWorkspaceFileDraftDirty,
  resolveWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  type WorkspaceFileDraftMap,
} from './draft';
import type { WorkspaceFile } from './types';

const file: WorkspaceFile = {
  content: 'saved',
  path: 'src/App.tsx',
};

describe('workspace file draft helpers', () => {
  it('resolves a missing draft from the current file content', () => {
    expect(resolveWorkspaceFileDraft({ file })).toEqual({
      content: 'saved',
      savedContent: 'saved',
    });
  });

  it('rehydrates a clean draft when the file changes externally', () => {
    const draft = createWorkspaceFileDraft('previous');

    expect(
      resolveWorkspaceFileDraft({
        draft,
        file: { ...file, content: 'external update' },
      }),
    ).toEqual({
      content: 'external update',
      savedContent: 'external update',
    });
  });

  it('preserves a dirty draft when the file changes externally', () => {
    const draft = {
      content: 'local edit',
      savedContent: 'previous',
    };

    expect(
      resolveWorkspaceFileDraft({
        draft,
        file: { ...file, content: 'external update' },
      }),
    ).toBe(draft);
  });

  it('updates draft content from the file content baseline', () => {
    const drafts = updateWorkspaceFileDraft({
      content: 'local edit',
      drafts: {},
      fileContent: 'saved',
      path: '/src//App.tsx',
    });

    expect(drafts).toEqual({
      'src/App.tsx': {
        content: 'local edit',
        savedContent: 'saved',
      },
    });
    expect(isWorkspaceFileDraftDirty(file, drafts['src/App.tsx'])).toBe(true);
  });

  it('saves and discards draft content by path', () => {
    const dirtyDrafts: WorkspaceFileDraftMap = {
      'src/App.tsx': {
        content: 'local edit',
        savedContent: 'saved',
      },
    };

    expect(
      saveWorkspaceFileDraft({
        content: 'local edit',
        drafts: dirtyDrafts,
        path: 'src/App.tsx',
      }),
    ).toEqual({
      'src/App.tsx': {
        content: 'local edit',
        savedContent: 'local edit',
      },
    });

    expect(
      discardWorkspaceFileDraft({
        drafts: dirtyDrafts,
        file,
      }),
    ).toEqual({
      'src/App.tsx': {
        content: 'saved',
        savedContent: 'saved',
      },
    });
  });
});
