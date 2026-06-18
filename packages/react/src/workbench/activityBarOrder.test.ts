import { describe, expect, it } from 'vitest';

import { sortActivityBarItems } from './activityBarOrder';

describe('sortActivityBarItems', () => {
  it('sorts items using the configured activity bar order', () => {
    const items = [
      { id: 'aiChat', label: 'AI Chat' },
      { id: 'search', label: 'Search' },
      { id: 'explorer', label: 'Explorer' },
      { id: 'chatting', label: 'Chatting' },
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
