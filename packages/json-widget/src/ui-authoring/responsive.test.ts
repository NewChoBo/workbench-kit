import { describe, expect, it } from 'vitest';

import {
  canonicalizeUiResponsiveVariantCatalog,
  resolveActiveUiResponsiveVariant,
  validateUiResponsiveVariantCatalog,
} from './responsive.js';

describe('responsive variant catalogs', () => {
  it('canonicalizes by normalized range and resolves inclusive/exclusive boundaries', () => {
    const canonical = canonicalizeUiResponsiveVariantCatalog([
      { id: 'wide', hostWidth: { minInclusive: 900 } },
      { id: 'compact', hostWidth: { minInclusive: 0, maxExclusive: 600 } },
      { id: 'medium', hostWidth: { minInclusive: 600, maxExclusive: 900 } },
    ]);

    expect(canonical).toEqual([
      { id: 'compact', hostWidth: { maxExclusive: 600 } },
      { id: 'medium', hostWidth: { minInclusive: 600, maxExclusive: 900 } },
      { id: 'wide', hostWidth: { minInclusive: 900 } },
    ]);
    expect(resolveActiveUiResponsiveVariant(canonical, 599)?.id).toBe('compact');
    expect(resolveActiveUiResponsiveVariant(canonical, 600)?.id).toBe('medium');
    expect(resolveActiveUiResponsiveVariant(canonical, 900)?.id).toBe('wide');
  });

  it('rejects duplicate ids, overlap, empty ranges, and non-finite widths', () => {
    expect(
      validateUiResponsiveVariantCatalog([
        { id: 'same', hostWidth: { maxExclusive: 800 } },
        { id: 'same', hostWidth: { minInclusive: 700 } },
      ]).map((issue) => issue.code),
    ).toEqual(
      expect.arrayContaining(['duplicate-responsive-variant-id', 'overlapping-responsive-range']),
    );
    expect(
      validateUiResponsiveVariantCatalog([
        { id: 'empty', hostWidth: { minInclusive: 10, maxExclusive: 10 } },
        { id: 'infinite-min', hostWidth: { minInclusive: Number.POSITIVE_INFINITY } },
        {
          id: 'explicit-infinite-max',
          hostWidth: { minInclusive: 20, maxExclusive: Number.POSITIVE_INFINITY },
        },
      ]).map((issue) => issue.code),
    ).toEqual(['invalid-responsive-range', 'invalid-responsive-range', 'invalid-responsive-range']);
    expect(
      validateUiResponsiveVariantCatalog([
        { id: 'extra', hostWidth: { maxExclusive: 400 }, label: 'not-frozen-api' },
      ]).map((issue) => issue.code),
    ).toEqual(['invalid-responsive-variant-catalog']);
  });
});
