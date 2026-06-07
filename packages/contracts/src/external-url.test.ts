import { describe, expect, it } from 'vitest';

import { normalizeExternalUrlTarget } from './external-url';

describe('normalizeExternalUrlTarget', () => {
  it('rejects disallowed protocols per policy', () => {
    expect(normalizeExternalUrlTarget('steam://store/valve', 'web-navigation')).toBeNull();
    expect(normalizeExternalUrlTarget('steam://store/valve', 'system-launch')).toBe('steam://store/valve');
  });

  it('normalizes invalid targets to null', () => {
    expect(normalizeExternalUrlTarget('   ', 'system-launch')).toBeNull();
    expect(normalizeExternalUrlTarget('C:\\Games\\foo.exe', 'system-launch')).toBeNull();
    expect(normalizeExternalUrlTarget('mailto:test@example.com', 'web-navigation')).toBeNull();
  });

  it('rejects http/https URLs without a hostname', () => {
    expect(normalizeExternalUrlTarget('https://', 'web-navigation')).toBeNull();
    expect(normalizeExternalUrlTarget('https://example.com', 'web-navigation')).toBe(
      'https://example.com/',
    );
  });
});
