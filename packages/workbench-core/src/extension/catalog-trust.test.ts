import { describe, expect, it } from 'vitest';

import {
  ExtensionCatalogUrlNotAllowedError,
  assertExtensionCatalogUrlAllowed,
} from './catalog-trust.js';

describe('assertExtensionCatalogUrlAllowed', () => {
  it('allows relative and path-only URLs by default', () => {
    expect(() => assertExtensionCatalogUrlAllowed('/extension-catalog.json')).not.toThrow();
    expect(() => assertExtensionCatalogUrlAllowed('./catalog.json')).not.toThrow();
    expect(() => assertExtensionCatalogUrlAllowed('catalogs/local.json')).not.toThrow();
  });

  it('denies absolute remote origins by default', () => {
    expect(() => assertExtensionCatalogUrlAllowed('https://cdn.example.com/catalog.json')).toThrow(
      ExtensionCatalogUrlNotAllowedError,
    );
  });

  it('allows absolute origins listed in the policy', () => {
    expect(() =>
      assertExtensionCatalogUrlAllowed('https://cdn.example.com/catalog.json', {
        allowedOrigins: ['https://cdn.example.com'],
      }),
    ).not.toThrow();
  });

  it('denies scheme-relative URLs unless the resolved origin is allowlisted', () => {
    expect(() => assertExtensionCatalogUrlAllowed('//cdn.example.com/catalog.json')).toThrow(
      ExtensionCatalogUrlNotAllowedError,
    );
    expect(() =>
      assertExtensionCatalogUrlAllowed('//cdn.example.com/catalog.json', {
        allowedOrigins: ['https://cdn.example.com'],
      }),
    ).not.toThrow();
  });

  it('supports explicit * escape hatch for absolute origins', () => {
    expect(() =>
      assertExtensionCatalogUrlAllowed('https://anywhere.example/catalog.json', {
        allowedOrigins: ['*'],
      }),
    ).not.toThrow();
  });

  it('can disable relative URLs', () => {
    expect(() =>
      assertExtensionCatalogUrlAllowed('/extension-catalog.json', {
        allowRelativeUrls: false,
        allowedOrigins: [],
      }),
    ).toThrow(ExtensionCatalogUrlNotAllowedError);
  });
});
