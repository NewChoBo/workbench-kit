import { describe, expect, it } from 'vitest';

import { filterBrowseEntries, filterInstalledEntries } from './extension-management-filters.js';
import type { ExtensionCatalogBrowseEntry, ExtensionManagementEntry } from './types.js';

function createInstalled(
  overrides: Partial<ExtensionManagementEntry> &
    Pick<ExtensionManagementEntry, 'id' | 'displayName'>,
): ExtensionManagementEntry {
  return {
    category: 'feature',
    enabled: true,
    source: 'installed',
    ...overrides,
  };
}

function createBrowse(
  overrides: Partial<ExtensionCatalogBrowseEntry> &
    Pick<ExtensionCatalogBrowseEntry, 'id' | 'displayName'>,
): ExtensionCatalogBrowseEntry {
  return {
    category: 'feature',
    description: '',
    installed: false,
    manifestUrl: 'https://example.test/manifest.json',
    ...overrides,
  };
}

describe('filterInstalledEntries', () => {
  const entries = [
    createInstalled({
      id: 'workbench.theme.dark',
      displayName: 'Dark Theme',
      category: 'theme',
      description: 'A dark color theme',
    }),
    createInstalled({
      id: 'workbench.editor.markdown',
      displayName: 'Markdown Editor',
      category: 'editor',
    }),
  ] as const;

  it('returns all entries for empty or whitespace queries', () => {
    expect(filterInstalledEntries(entries, '')).toEqual(entries);
    expect(filterInstalledEntries(entries, '   ')).toEqual(entries);
  });

  it('matches display name, id, category, and description', () => {
    expect(filterInstalledEntries(entries, 'dark')).toEqual([entries[0]]);
    expect(filterInstalledEntries(entries, 'markdown')).toEqual([entries[1]]);
    expect(filterInstalledEntries(entries, 'theme')).toEqual([entries[0]]);
    expect(filterInstalledEntries(entries, 'color')).toEqual([entries[0]]);
  });
});

describe('filterBrowseEntries', () => {
  const entries = [
    createBrowse({
      id: 'workbench.theme.light',
      displayName: 'Light Theme',
      category: 'theme',
      description: 'A light color theme',
    }),
    createBrowse({
      id: 'workbench.feature.catalog',
      displayName: 'Catalog Tools',
      category: 'feature',
      description: 'Browse helpers',
    }),
  ] as const;

  it('filters by category before applying the text query', () => {
    expect(filterBrowseEntries(entries, '', 'theme')).toEqual([entries[0]]);
    expect(filterBrowseEntries(entries, 'catalog', 'theme')).toEqual([]);
    expect(filterBrowseEntries(entries, 'catalog', 'feature')).toEqual([entries[1]]);
  });

  it('returns category matches when the query is empty', () => {
    expect(filterBrowseEntries(entries, '  ')).toEqual(entries);
  });

  it('matches display name, id, category, and description', () => {
    expect(filterBrowseEntries(entries, 'light')).toEqual([entries[0]]);
    expect(filterBrowseEntries(entries, 'workbench.feature')).toEqual([entries[1]]);
    expect(filterBrowseEntries(entries, 'helpers')).toEqual([entries[1]]);
  });
});
