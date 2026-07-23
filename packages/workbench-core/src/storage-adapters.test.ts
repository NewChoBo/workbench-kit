import { describe, expect, it } from 'vitest';

import {
  createBrowserWorkbenchStorage,
  createMemoryWorkbenchStorage,
} from './storage-adapters.js';

describe('workbench storage adapters', () => {
  it('stores values in memory without touching web storage', () => {
    const adapter = createMemoryWorkbenchStorage();
    adapter.setItem('k', 'v');
    expect(adapter.getItem('k')).toBe('v');
    adapter.removeItem('k');
    expect(adapter.getItem('k')).toBeNull();
  });

  it('wraps an injected Storage implementation', () => {
    const backing = new Map<string, string>();
    const storage = {
      get length() {
        return backing.size;
      },
      clear() {
        backing.clear();
      },
      getItem(key: string) {
        return backing.has(key) ? (backing.get(key) ?? null) : null;
      },
      key() {
        return null;
      },
      removeItem(key: string) {
        backing.delete(key);
      },
      setItem(key: string, value: string) {
        backing.set(key, value);
      },
    } satisfies Storage;

    const adapter = createBrowserWorkbenchStorage({ storage });
    expect(adapter).toBeDefined();
    adapter!.setItem('layout', '{}');
    expect(adapter!.getItem('layout')).toBe('{}');
    adapter!.removeItem('layout');
    expect(adapter!.getItem('layout')).toBeNull();
  });
});
