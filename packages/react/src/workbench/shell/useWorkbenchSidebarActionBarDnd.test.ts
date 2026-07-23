import { describe, expect, it } from 'vitest';

import { useWorkbenchSidebarActionBarDnd } from './useWorkbenchSidebarActionBarDnd';

describe('useWorkbenchSidebarActionBarDnd', () => {
  it('exports a hook factory', () => {
    expect(typeof useWorkbenchSidebarActionBarDnd).toBe('function');
  });
});
