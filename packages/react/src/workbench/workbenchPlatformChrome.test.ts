import { describe, expect, it } from 'vitest';

import {
  resolveWorkbenchHostPlatform,
  resolveWorkbenchWindowChromeDataAttributes,
} from './workbenchPlatformChrome';

describe('resolveWorkbenchHostPlatform', () => {
  it('prefers an explicit host override', () => {
    expect(resolveWorkbenchHostPlatform('darwin')).toBe('darwin');
    expect(resolveWorkbenchHostPlatform('win32')).toBe('win32');
    expect(resolveWorkbenchHostPlatform('linux')).toBe('linux');
  });
});

describe('resolveWorkbenchWindowChromeDataAttributes', () => {
  it('emits platform chrome data attributes only for platform mode', () => {
    expect(resolveWorkbenchWindowChromeDataAttributes('platform')).toEqual({
      'data-workbench-window-chrome': 'platform',
    });
    expect(resolveWorkbenchWindowChromeDataAttributes('generic')).toBeUndefined();
  });
});
