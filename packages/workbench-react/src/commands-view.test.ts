import { describe, expect, it } from 'vitest';

import { isBuiltinCommandsViewRenderData } from './commands-view-data.js';

describe('commands-view', () => {
  it('recognizes builtin commands view render payloads', () => {
    expect(
      isBuiltinCommandsViewRenderData({
        kind: 'workbench-kit.builtin.commands.view',
      }),
    ).toBe(true);
    expect(isBuiltinCommandsViewRenderData({ kind: 'workbench-kit.builtin.search.view' })).toBe(
      false,
    );
  });
});
