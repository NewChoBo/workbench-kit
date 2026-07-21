import { describe, expect, it } from 'vitest';
import { DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY } from '@workbench-kit/workbench-core';

import { createSampleInstalledExtensionsStorageKey } from './sample-installed-extension-storage.js';

describe('sample-installed-extension-storage', () => {
  it('scopes installed extension state to the sample host and account', () => {
    expect(createSampleInstalledExtensionsStorageKey('tester')).toBe(
      `${DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY}/workbench-sample/tester`,
    );
    expect(createSampleInstalledExtensionsStorageKey(' basic ')).toBe(
      `${DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY}/workbench-sample/basic`,
    );
  });

  it('uses a stable anonymous bucket before sign-in', () => {
    expect(createSampleInstalledExtensionsStorageKey(undefined)).toBe(
      `${DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY}/workbench-sample/anonymous`,
    );
  });

  it('escapes account identifiers before using them as storage key segments', () => {
    expect(createSampleInstalledExtensionsStorageKey('tester@workbench-sample.local')).toBe(
      `${DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY}/workbench-sample/tester%40workbench-sample.local`,
    );
  });
});
