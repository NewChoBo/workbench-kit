import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  readPersistedKeybindingOverrides,
  writePersistedKeybindingOverrides,
} from './keybinding-overrides-storage.js';
import {
  DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  readPersistedLocalPreferences,
  writePersistedLocalPreferences,
} from './preference-settings-storage.js';

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

describe('management local persistence storage', () => {
  it('round-trips preferences and keybinding overrides', () => {
    const storage = createMemoryStorage();
    const preferences = { 'workbench.colorScheme': 'dark' };
    const keybindings = [{ command: 'workbench.action.openSettings', key: 'ctrl+,' }] as const;

    writePersistedLocalPreferences(
      preferences,
      DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
      storage,
    );
    writePersistedKeybindingOverrides(
      keybindings,
      DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
      storage,
    );

    expect(
      readPersistedLocalPreferences(DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY, storage),
    ).toEqual(preferences);
    expect(
      readPersistedKeybindingOverrides(DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY, storage),
    ).toEqual(keybindings);
  });

  it('keeps invalid persisted JSON non-fatal', () => {
    const storage = createMemoryStorage();
    storage.setItem(DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY, '{not-json');
    storage.setItem(DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY, '{not-json');

    expect(
      readPersistedLocalPreferences(DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY, storage),
    ).toEqual({});
    expect(
      readPersistedKeybindingOverrides(DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY, storage),
    ).toEqual([]);
  });

  it('preserves preference and keybinding write failures for their callers', () => {
    const storage = {
      setItem() {
        throw new Error('quota exceeded');
      },
    };

    expect(() =>
      writePersistedLocalPreferences({}, DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY, storage),
    ).toThrow('quota exceeded');
    expect(() =>
      writePersistedKeybindingOverrides([], DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY, storage),
    ).toThrow('quota exceeded');
  });
});
