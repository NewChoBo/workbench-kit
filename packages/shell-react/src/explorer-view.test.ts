import { describe, expect, it } from 'vitest';

import {
  isBuiltinExplorerViewRenderData,
  resolveExplorerRevealPath,
} from './explorer-view-data.js';

describe('explorer-view', () => {
  it('recognizes builtin explorer view render payloads', () => {
    expect(
      isBuiltinExplorerViewRenderData({
        kind: 'workbench-kit.builtin.explorer.view',
      }),
    ).toBe(true);
    expect(isBuiltinExplorerViewRenderData({ kind: 'workbench-kit.builtin.search.view' })).toBe(
      false,
    );
  });

  it('resolves reveal paths from command payloads', () => {
    expect(resolveExplorerRevealPath('notes.md', undefined)).toBe('notes.md');
    expect(resolveExplorerRevealPath({ path: 'src/App.tsx' }, undefined)).toBe('src/App.tsx');
  });
});
