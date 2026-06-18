import { describe, expect, it } from 'vitest';

import {
  getActivityBarDropPosition,
  reorderActivityBarItems,
  sortActivityBarItems,
} from './activityBarOrder';

describe('reorderActivityBarItems', () => {
  const itemIds = ['explorer', 'search', 'chatting', 'aiChat'];

  it('inserts before the target item', () => {
    expect(reorderActivityBarItems(itemIds, 'aiChat', 'search', 'before')).toEqual([
      'explorer',
      'aiChat',
      'search',
      'chatting',
    ]);
  });

  it('inserts after the target item', () => {
    expect(reorderActivityBarItems(itemIds, 'explorer', 'search', 'after')).toEqual([
      'search',
      'explorer',
      'chatting',
      'aiChat',
    ]);
  });

  it('returns undefined when the drop would not change order', () => {
    expect(reorderActivityBarItems(itemIds, 'search', 'explorer', 'after')).toBeUndefined();
  });
});

describe('getActivityBarDropPosition', () => {
  it('chooses before when the pointer is in the top half', () => {
    const target = {
      getBoundingClientRect: () => ({
        bottom: 96,
        height: 48,
        left: 0,
        right: 48,
        top: 48,
        width: 48,
        x: 0,
        y: 48,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    expect(getActivityBarDropPosition(target, 60)).toBe('before');
    expect(getActivityBarDropPosition(target, 84)).toBe('after');
  });
});

describe('sortActivityBarItems', () => {
  it('sorts items using the configured activity bar order', () => {
    const items = [
      { id: 'aiChat', label: 'AI Chat' },
      { id: 'search', label: 'Search' },
      { id: 'explorer', label: 'Explorer' },
      { id: 'chatting', label: 'Chat' },
    ];

    expect(sortActivityBarItems(items).map((item) => item.id)).toEqual([
      'explorer',
      'search',
      'chatting',
      'aiChat',
    ]);
  });

  it('appends unknown items after known order entries', () => {
    const items = [
      { id: 'extensions', label: 'Extensions' },
      { id: 'explorer', label: 'Explorer' },
      { id: 'search', label: 'Search' },
    ];

    expect(sortActivityBarItems(items).map((item) => item.id)).toEqual([
      'explorer',
      'search',
      'extensions',
    ]);
  });
});
