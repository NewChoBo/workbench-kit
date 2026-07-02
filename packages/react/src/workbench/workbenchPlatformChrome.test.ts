import { describe, expect, it } from 'vitest';

import { resolveWorkbenchHostPlatform } from './workbenchPlatformChrome';

describe('resolveWorkbenchHostPlatform', () => {
  it('prefers an explicit host override', () => {
    expect(resolveWorkbenchHostPlatform('darwin')).toBe('darwin');
    expect(resolveWorkbenchHostPlatform('win32')).toBe('win32');
    expect(resolveWorkbenchHostPlatform('linux')).toBe('linux');
  });
});
