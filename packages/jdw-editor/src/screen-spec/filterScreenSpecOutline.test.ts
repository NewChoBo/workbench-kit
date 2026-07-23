import { describe, expect, it } from 'vitest';
import { screenColumn, screenText, type ScreenSpecOutlineEntry } from '@workbench-kit/jdw';

import { filterScreenSpecOutline } from './filterScreenSpecOutline.js';

const OUTLINE: readonly ScreenSpecOutlineEntry[] = [
  {
    depth: 0,
    label: 'column (2 children)',
    node: screenColumn([screenText('Hello'), screenText('World')]),
    path: [],
    parentKind: undefined,
  },
  {
    depth: 1,
    label: 'text: Hello',
    node: screenText('Hello'),
    path: [0],
    parentKind: 'column',
  },
  {
    depth: 1,
    label: 'text: World',
    node: screenText('World'),
    path: [1],
    parentKind: 'column',
  },
];

describe('filterScreenSpecOutline', () => {
  it('returns all entries for empty query', () => {
    expect(filterScreenSpecOutline(OUTLINE, '  ')).toEqual(OUTLINE);
  });

  it('keeps matching leaves and their ancestors', () => {
    const filtered = filterScreenSpecOutline(OUTLINE, 'world');
    expect(filtered.map((entry) => entry.label)).toEqual(['column (2 children)', 'text: World']);
  });

  it('requires every token (AND)', () => {
    expect(filterScreenSpecOutline(OUTLINE, 'text missing').map((entry) => entry.label)).toEqual(
      [],
    );
    expect(filterScreenSpecOutline(OUTLINE, 'text hello').map((entry) => entry.label)).toEqual([
      'column (2 children)',
      'text: Hello',
    ]);
  });
});
