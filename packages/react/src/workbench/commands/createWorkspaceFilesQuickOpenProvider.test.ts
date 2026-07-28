import { describe, expect, it } from 'vitest';
import type { WorkspaceFile } from '@workbench-kit/workspace';

import {
  createWorkspaceFilesQuickOpenProvider,
  resolveQuickOpenItemPath,
  WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID,
} from './createWorkspaceFilesQuickOpenProvider';

const files: WorkspaceFile[] = [
  { content: 'readme body', path: 'docs/README.md' },
  { content: 'export const Button = () => null;', path: 'src/Button.tsx' },
  { content: 'app shell', path: 'src/App.tsx' },
];

describe('createWorkspaceFilesQuickOpenProvider', () => {
  it('uses workspace search and prefers path matches', async () => {
    const provider = createWorkspaceFilesQuickOpenProvider({ files });

    expect(provider.id).toBe(WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID);

    const results = await provider.search('Button');
    expect(results.map((item) => item.id)).toEqual(['src/Button.tsx']);
    expect(resolveQuickOpenItemPath(results[0]!)).toBe('src/Button.tsx');
    expect(results[0]?.label).toBe('Button.tsx');
  });

  it('returns all files for an empty query and elevates recent paths', async () => {
    const provider = createWorkspaceFilesQuickOpenProvider({
      files: () => files,
      recentPaths: ['src/App.tsx', 'missing.md'],
    });

    const results = await provider.search('');
    expect(results.map((item) => item.id)).toEqual([
      'src/App.tsx',
      'docs/README.md',
      'src/Button.tsx',
    ]);
    expect(results[0]?.detail).toBe('Recent');
  });
});
