import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKBENCH_APPEARANCE,
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  readPersistedWorkbenchAppearance,
  writePersistedWorkbenchAppearance,
} from './workbench-appearance-storage.js';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('workbench-appearance-storage', () => {
  it('round-trips appearance settings through storage', () => {
    const storage = createMemoryStorage();
    const settings = {
      darkPreset: 'modern' as const,
      lightPreset: 'light-plus' as const,
      themePreference: 'dark' as const,
    };

    writePersistedWorkbenchAppearance(settings, DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, storage);

    expect(readPersistedWorkbenchAppearance(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, storage)).toEqual(
      settings,
    );
  });

  it('migrates legacy sample appearance storage key', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'workbench-kit/.workbench/sample-appearance',
      JSON.stringify({
        darkPreset: 'navy',
        lightPreset: 'orange',
        themePreference: 'light',
      }),
    );

    expect(readPersistedWorkbenchAppearance(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, storage)).toEqual({
      darkPreset: 'navy',
      lightPreset: 'orange',
      themePreference: 'light',
    });
    expect(storage.getItem('workbench-kit/.workbench/sample-appearance')).toBeNull();
    expect(storage.getItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY)).toContain('"orange"');
  });

  it('falls back to defaults for invalid payloads', () => {
    const storage = createMemoryStorage();
    storage.setItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, '{not-json');

    expect(readPersistedWorkbenchAppearance(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, storage)).toEqual(
      DEFAULT_WORKBENCH_APPEARANCE,
    );
  });
});
