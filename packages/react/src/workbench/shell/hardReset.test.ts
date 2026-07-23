/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { performWorkbenchHardReset } from './hardReset';

describe('performWorkbenchHardReset', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('skips reset when confirmation is declined', async () => {
    localStorage.setItem('workbench-kit:test', '1');
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    const result = await performWorkbenchHardReset();

    expect(result).toBe(false);
    expect(localStorage.getItem('workbench-kit:test')).toBe('1');
  });

  it('clears prefixed storage and reloads when confirmed', async () => {
    localStorage.setItem('workbench-kit:test', '1');
    localStorage.setItem('host:keep', '1');
    const reload = vi.fn();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { reload },
    });

    const beforeReset = vi.fn();
    const result = await performWorkbenchHardReset({
      storagePrefixes: ['workbench-kit:', 'host:'],
      beforeReset,
    });

    expect(result).toBe(true);
    expect(beforeReset).toHaveBeenCalledOnce();
    expect(localStorage.getItem('workbench-kit:test')).toBeNull();
    expect(localStorage.getItem('host:keep')).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });
});
