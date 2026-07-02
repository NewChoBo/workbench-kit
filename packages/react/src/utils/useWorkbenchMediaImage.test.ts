import { describe, expect, it } from 'vitest';

import { hasWorkbenchMediaImageSource } from './useWorkbenchMediaImage';

describe('useWorkbenchMediaImage', () => {
  it('treats empty sources as placeholder-only', () => {
    expect(hasWorkbenchMediaImageSource(null)).toBe(false);
    expect(hasWorkbenchMediaImageSource(undefined)).toBe(false);
    expect(hasWorkbenchMediaImageSource('   ')).toBe(false);
    expect(hasWorkbenchMediaImageSource('https://example.com/cover.jpg')).toBe(true);
  });
});
