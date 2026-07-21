import { describe, expect, it } from 'vitest';

import { filterCatalogBrowseItems, matchCatalogBrowseItem } from './filterCatalogBrowseItems';

const items = [
  { id: '1', label: 'Desk Clock', meta: 'Clock · 1 window' },
  { id: '2', label: 'Seoul Weather', meta: 'Weather · 0 windows', description: 'Outdoor' },
  { id: '3', label: 'UTC Clock', meta: 'Clock · 2 windows' },
];

describe('filterCatalogBrowseItems', () => {
  it('returns all items for an empty query', () => {
    expect(filterCatalogBrowseItems(items, '   ')).toEqual(items);
  });

  it('matches label text', () => {
    expect(filterCatalogBrowseItems(items, 'seoul').map((item) => item.id)).toEqual(['2']);
  });

  it('matches meta text', () => {
    expect(filterCatalogBrowseItems(items, 'weather').map((item) => item.id)).toEqual(['2']);
  });

  it('matches description text', () => {
    expect(matchCatalogBrowseItem(items[1]!, 'outdoor')).toBe(true);
  });
});
