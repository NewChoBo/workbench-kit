import { describe, expect, it } from 'vitest';

import { isBuiltinSearchViewRenderData } from './search-view-data.js';

describe('search-view', () => {
  it('recognizes builtin search view render payloads', () => {
    expect(
      isBuiltinSearchViewRenderData({
        kind: 'workbench-kit.builtin.search.view',
      }),
    ).toBe(true);
    expect(isBuiltinSearchViewRenderData({ kind: 'workbench-kit.builtin.explorer.view' })).toBe(
      false,
    );
  });
});
