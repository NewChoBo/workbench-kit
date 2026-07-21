import { describe, expect, it } from 'vitest';

import {
  filterWorkbenchPropertyFields,
  isWorkbenchPropertySearchActive,
  type WorkbenchPropertyFieldManifestEntry,
} from './propertyFieldFilter';

const SAMPLE_FIELDS: readonly WorkbenchPropertyFieldManifestEntry[] = [
  {
    id: 'id',
    label: 'ID',
    sectionId: 'details:common',
    keywords: ['Common', 'readonly'],
  },
  {
    id: 'label',
    label: 'Label',
    sectionId: 'details:common',
    keywords: ['Common'],
  },
  {
    id: 'opacity',
    label: 'Opacity',
    sectionId: 'details:layout',
    keywords: ['Layout', 'number'],
  },
  {
    id: 'layers',
    label: 'Layers',
    sectionId: 'details:appearance',
    keywords: ['Appearance'],
  },
];

describe('filterWorkbenchPropertyFields', () => {
  it('returns all fields when the query is empty', () => {
    const result = filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: '  ' });
    expect(result.fieldIds).toEqual(['id', 'label', 'opacity', 'layers']);
    expect(result.sectionIds).toEqual(['details:common', 'details:layout', 'details:appearance']);
  });

  it('matches declared labels and ids without scraping DOM', () => {
    expect(
      filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: 'opac' }).fieldIds,
    ).toEqual(['opacity']);
    expect(filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: 'id' }).fieldIds).toEqual([
      'id',
    ]);
  });

  it('matches keywords and requires every token', () => {
    expect(
      filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: 'common label' }).fieldIds,
    ).toEqual(['label']);
    expect(
      filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: 'layout missing' }).fieldIds,
    ).toEqual([]);
  });

  it('preserves section order from first matching field', () => {
    const result = filterWorkbenchPropertyFields({ fields: SAMPLE_FIELDS, query: 'a' });
    expect(result.sectionIds).toEqual(['details:common', 'details:layout', 'details:appearance']);
  });
});

describe('isWorkbenchPropertySearchActive', () => {
  it('treats whitespace-only queries as inactive', () => {
    expect(isWorkbenchPropertySearchActive(undefined)).toBe(false);
    expect(isWorkbenchPropertySearchActive('')).toBe(false);
    expect(isWorkbenchPropertySearchActive('   ')).toBe(false);
    expect(isWorkbenchPropertySearchActive('op')).toBe(true);
  });
});
