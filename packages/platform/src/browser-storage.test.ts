/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest';

import { clearBrowserStorageByPrefixes, collectStorageKeysByPrefix } from './browser-storage.js';

describe('browser-storage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('collects keys by prefix', () => {
    localStorage.setItem('workbench-kit:appearance', '{}');
    localStorage.setItem('workbench-kit:layout', '{}');
    localStorage.setItem('other:settings', '{}');

    expect(collectStorageKeysByPrefix(localStorage, 'workbench-kit:')).toEqual([
      'workbench-kit:appearance',
      'workbench-kit:layout',
    ]);
  });

  it('clears matching keys from local and session storage', () => {
    localStorage.setItem('host-app:ui', '{}');
    localStorage.setItem('host-app:workspace', '{}');
    sessionStorage.setItem('host-app:session', '{}');
    localStorage.setItem('keep-me', '1');

    const removed = clearBrowserStorageByPrefixes(['host-app:']);

    expect(removed.sort()).toEqual(['host-app:session', 'host-app:ui', 'host-app:workspace']);
    expect(localStorage.getItem('keep-me')).toBe('1');
    expect(localStorage.getItem('host-app:ui')).toBeNull();
    expect(sessionStorage.getItem('host-app:session')).toBeNull();
  });
});
