import { describe, expect, it } from 'vitest';

import { shouldHideOnClose, shouldQuitWhenAllWindowsClosed } from './tray-close-policy.js';

describe('shouldHideOnClose', () => {
  it.each([
    { trayEnabled: true, expected: true },
    { trayEnabled: false, expected: false },
  ] as const)('trayEnabled=$trayEnabled → $expected', ({ trayEnabled, expected }) => {
    expect(shouldHideOnClose({ trayEnabled })).toBe(expected);
  });
});

describe('shouldQuitWhenAllWindowsClosed', () => {
  it.each([
    { platform: 'darwin', trayEnabled: false, expected: false },
    { platform: 'darwin', trayEnabled: true, expected: false },
    { platform: 'win32', trayEnabled: false, expected: true },
    { platform: 'win32', trayEnabled: true, expected: false },
    { platform: 'linux', trayEnabled: false, expected: true },
    { platform: 'linux', trayEnabled: true, expected: false },
    { platform: 'freebsd', trayEnabled: false, expected: true },
    { platform: 'freebsd', trayEnabled: true, expected: false },
  ] as const)(
    'platform=$platform trayEnabled=$trayEnabled → $expected',
    ({ platform, trayEnabled, expected }) => {
      expect(shouldQuitWhenAllWindowsClosed({ platform, trayEnabled })).toBe(expected);
    },
  );
});
