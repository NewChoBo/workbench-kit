import { describe, expect, it } from 'vitest';

import {
  getNextQuickOpenItemIndex,
  isQuickOpenItemSelectable,
  type QuickOpenItem,
} from './quick-open-model';

const items: QuickOpenItem[] = [
  { id: 'a', label: 'A' },
  { disabled: true, id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
];

describe('quick-open-model', () => {
  it('skips disabled items while navigating', () => {
    expect(isQuickOpenItemSelectable(items[1]!)).toBe(false);
    expect(
      getNextQuickOpenItemIndex({
        currentIndex: 0,
        direction: 'next',
        items,
      }),
    ).toBe(2);
    expect(
      getNextQuickOpenItemIndex({
        currentIndex: 2,
        direction: 'previous',
        items,
      }),
    ).toBe(0);
  });
});
