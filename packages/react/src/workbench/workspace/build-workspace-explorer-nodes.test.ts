import { describe, expect, it } from 'vitest';

import {
  buildWorkspaceExplorerNodes,
  resolveWorkspaceExplorerSectionTitle,
} from './build-workspace-explorer-nodes.js';

describe('buildWorkspaceExplorerNodes', () => {
  it('builds a single workspace tree for repository paths', () => {
    const nodes = buildWorkspaceExplorerNodes({
      files: [
        { content: 'app', path: 'src/App.tsx' },
        { content: 'schema', path: 'schemas/widget.json' },
        { content: 'ext', path: '.workbench/extensions.json' },
      ],
      folders: ['src', 'schemas', '.workbench'],
    });

    expect(nodes.some((node) => node.path === 'src')).toBe(true);
    expect(nodes.some((node) => node.path === 'schemas')).toBe(true);
    expect(nodes.some((node) => node.path === '.workbench')).toBe(true);
  });

  it('returns an empty tree when the workspace is empty', () => {
    expect(buildWorkspaceExplorerNodes({ files: [], folders: [] })).toEqual([]);
  });
});

describe('resolveWorkspaceExplorerSectionTitle', () => {
  it('prefers the first configured workspace folder name', () => {
    expect(
      resolveWorkspaceExplorerSectionTitle([
        {
          content: JSON.stringify({
            folders: [{ name: 'Repository Root', path: '.' }],
            name: 'Workbench Kit',
          }),
          path: '.workbench/workspace.json',
        },
      ]),
    ).toBe('Repository Root');
  });

  it('falls back to the default label when workspace metadata is missing', () => {
    expect(resolveWorkspaceExplorerSectionTitle([])).toBe('Workspace');
  });
});
