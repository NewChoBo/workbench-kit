import { describe, expect, it } from 'vitest';

import { isBuiltinExplorerViewRenderData } from './explorer-view-data.js';

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
});
