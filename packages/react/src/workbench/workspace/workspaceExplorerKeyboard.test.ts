import { describe, expect, it } from 'vitest';

import type { WorkspaceTreeNode } from './types.js';
import {
  resolveWorkspaceExplorerHorizontalNavigationAction,
  resolveWorkspaceExplorerNavigationPath,
} from './workspaceExplorerKeyboard.js';

const srcFolder: WorkspaceTreeNode = {
  name: 'src',
  path: 'src',
  type: 'folder',
  children: [],
};

const appFile: WorkspaceTreeNode = {
  children: [],
  name: 'App.tsx',
  path: 'src/App.tsx',
  type: 'file',
  file: { content: '', mimeType: 'text/typescript', path: 'src/App.tsx' },
};

const readmeFile: WorkspaceTreeNode = {
  children: [],
  name: 'README.md',
  path: 'README.md',
  type: 'file',
  file: { content: '', mimeType: 'text/markdown', path: 'README.md' },
};

const expandedRows = [
  { depth: 0, node: readmeFile },
  { depth: 0, node: srcFolder },
  { depth: 1, node: appFile },
];

const collapsedRows = [
  { depth: 0, node: readmeFile },
  { depth: 0, node: srcFolder },
];

describe('resolveWorkspaceExplorerNavigationPath', () => {
  it('moves among visible rows and skips collapsed descendants', () => {
    expect(resolveWorkspaceExplorerNavigationPath(collapsedRows, 'README.md', 'ArrowDown')).toBe(
      'src',
    );
    expect(resolveWorkspaceExplorerNavigationPath(collapsedRows, 'src', 'ArrowDown')).toBe('src');
    expect(resolveWorkspaceExplorerNavigationPath(expandedRows, 'src', 'ArrowDown')).toBe(
      'src/App.tsx',
    );
    expect(resolveWorkspaceExplorerNavigationPath(expandedRows, 'src/App.tsx', 'Home')).toBe(
      'README.md',
    );
    expect(resolveWorkspaceExplorerNavigationPath(expandedRows, 'README.md', 'End')).toBe(
      'src/App.tsx',
    );
  });
});

describe('resolveWorkspaceExplorerHorizontalNavigationAction', () => {
  it('expands collapsed folders and focuses first child when expanded', () => {
    expect(
      resolveWorkspaceExplorerHorizontalNavigationAction(
        collapsedRows,
        'src',
        new Set(),
        'ArrowRight',
      ),
    ).toEqual({ type: 'toggle', path: 'src' });

    expect(
      resolveWorkspaceExplorerHorizontalNavigationAction(
        expandedRows,
        'src',
        new Set(['src']),
        'ArrowRight',
      ),
    ).toEqual({ type: 'focus', path: 'src/App.tsx' });
  });

  it('collapses expanded folders and moves to parent otherwise', () => {
    expect(
      resolveWorkspaceExplorerHorizontalNavigationAction(
        expandedRows,
        'src',
        new Set(['src']),
        'ArrowLeft',
      ),
    ).toEqual({ type: 'toggle', path: 'src' });

    expect(
      resolveWorkspaceExplorerHorizontalNavigationAction(
        expandedRows,
        'src/App.tsx',
        new Set(['src']),
        'ArrowLeft',
      ),
    ).toEqual({ type: 'focus', path: 'src' });
  });
});
