import { describe, expect, it } from 'vitest';

import {
  applyWorkspaceExplorerMutationResult,
  createWorkspaceExplorerInlineEditDraft,
  createWorkspaceExplorerRenameDraft,
  isWorkspaceExplorerCreatePathAvailable,
  validateWorkspaceExplorerInlineEditName,
  workspaceExplorerParentPaths,
} from './workspaceExplorerController';

describe('workspaceExplorerController', () => {
  const snapshot = {
    files: [{ content: '', path: 'src/App.tsx' }],
    folders: ['src'],
  };

  it('builds parent paths for nested files', () => {
    expect(workspaceExplorerParentPaths('src/components/Button.tsx')).toEqual([
      'src',
      'src/components',
    ]);
  });

  it('validates inline edit names', () => {
    expect(validateWorkspaceExplorerInlineEditName('Button.tsx')).toBeUndefined();
    expect(validateWorkspaceExplorerInlineEditName('bad/name')).toBe(
      'Use a simple file or folder name.',
    );
  });

  it('creates inline edit drafts', () => {
    expect(createWorkspaceExplorerInlineEditDraft(snapshot, 'create-file', 'src')).toMatchObject({
      kind: 'create-file',
      parentPath: 'src',
      value: 'untitled.md',
    });
    expect(createWorkspaceExplorerRenameDraft({ path: 'src/App.tsx', type: 'file' })).toMatchObject({
      kind: 'rename-file',
      path: 'src/App.tsx',
      value: 'App.tsx',
    });
  });

  it('checks create path availability', () => {
    expect(isWorkspaceExplorerCreatePathAvailable(snapshot, 'src', 'App.tsx')).toBe(false);
    expect(isWorkspaceExplorerCreatePathAvailable(snapshot, 'src', 'Button.tsx')).toBe(true);
  });

  it('applies mutation results to selection', () => {
    let selection = { paths: [] as string[] };
    applyWorkspaceExplorerMutationResult({ paths: ['src/App.tsx', 'src/Button.tsx'] }, (next) => {
      selection = next;
    });

    expect(selection).toEqual({
      anchorPath: 'src/Button.tsx',
      focusedPath: 'src/Button.tsx',
      paths: ['src/App.tsx', 'src/Button.tsx'],
    });
  });
});
