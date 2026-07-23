import { describe, expect, it } from 'vitest';

import {
  applyWorkbenchActivityBarPlacementHints,
  filterWorkbenchActivityBarItemsByPrimarySlot,
  resolveWorkbenchActivityBarItemTitle,
} from './workbench-activity-bar-placement.js';

describe('workbench-activity-bar-placement', () => {
  it('formats activity bar item titles with slot labels', () => {
    expect(
      resolveWorkbenchActivityBarItemTitle({
        baseTitle: 'Library',
        placementLabels: {
          primary: 'Primary Side Bar',
          secondary: 'Secondary Side Bar',
        },
        slot: 'secondary',
      }),
    ).toBe('Library (Secondary Side Bar)');
  });

  it('adds placement hints to dockable activity bar items', () => {
    const items = applyWorkbenchActivityBarPlacementHints<{
      id: string;
      label: string;
      title?: string | undefined;
    }>(
      [
        { id: 'library', label: 'Library' },
        { id: 'settings', label: 'Settings' },
      ],
      { library: 'secondary' },
      {
        primary: 'Primary Side Bar',
        secondary: 'Secondary Side Bar',
      },
      (viewId) => viewId === 'library',
    );

    expect(items[0]?.title).toBe('Library (Secondary Side Bar)');
    expect(items[1]?.title).toBeUndefined();
  });

  it('filters dockable items to the primary slot only', () => {
    const items = filterWorkbenchActivityBarItemsByPrimarySlot<{
      id: string;
      label: string;
      title?: string | undefined;
    }>(
      [
        { id: 'library', label: 'Library' },
        { id: 'social', label: 'Social' },
        { id: 'settings', label: 'Settings' },
      ],
      { library: 'primary', social: 'secondary' },
      (viewId) => viewId === 'library' || viewId === 'social',
    );

    expect(items.map((item) => item.id)).toEqual(['library', 'settings']);
  });
});
