import { describe, expect, it } from 'vitest';

import {
  moveWorkbenchSidebarSlotViewOrder,
  normalizeWorkbenchSidebarSlotViewOrder,
  sortWorkbenchSidebarSlotViewIds,
} from './workbench-sidebar-slot-view-order.js';

type SampleViewId = 'library' | 'launchpad' | 'social';

describe('workbench-sidebar-slot-view-order', () => {
  it('sorts slot views using persisted order', () => {
    expect(
      sortWorkbenchSidebarSlotViewIds<SampleViewId>(
        ['library', 'launchpad', 'social'],
        ['social', 'library', 'launchpad'],
      ),
    ).toEqual(['social', 'library', 'launchpad']);
  });

  it('normalizes order to available slot views only', () => {
    expect(
      normalizeWorkbenchSidebarSlotViewOrder<SampleViewId>(
        ['launchpad', 'missing', 'library'],
        ['library', 'launchpad'],
      ),
    ).toEqual(['launchpad', 'library']);
  });

  it('moves view order between slots when placement changes', () => {
    expect(
      moveWorkbenchSidebarSlotViewOrder<SampleViewId>(
        {
          primary: ['library', 'launchpad'],
          secondary: ['social'],
        },
        {
          sourceSlot: 'primary',
          sourceViewIds: ['library', 'launchpad'],
          targetSlot: 'secondary',
          targetViewIds: ['social', 'launchpad'],
          viewId: 'launchpad',
        },
      ),
    ).toEqual({
      primary: ['library'],
      secondary: ['social', 'launchpad'],
    });
  });
});
