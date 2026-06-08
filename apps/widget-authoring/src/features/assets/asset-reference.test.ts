import { describe, expect, it } from 'vitest';

import { svgToDataUrl, toColorAssetDataUrl } from './asset-content.js';
import { createAssetResolver, parseAssetSrc, toAssetSrc } from './asset-reference.js';
import type { AuthoringAssetRecord } from './asset-types.js';

describe('asset-reference', () => {
  it('round-trips asset references', () => {
    expect(toAssetSrc('abc-123')).toBe('asset:abc-123');
    expect(parseAssetSrc('asset:abc-123')).toBe('abc-123');
    expect(parseAssetSrc('https://example.com/x')).toBeNull();
  });

  it('resolves image, icon, and color assets', () => {
    const records = new Map<string, AuthoringAssetRecord>([
      [
        'img-1',
        {
          id: 'img-1',
          name: 'Photo',
          type: 'image',
          mimeType: 'image/png',
          createdAt: 1,
          dataUrl: 'data:image/png;base64,abc',
        },
      ],
      [
        'icon-1',
        {
          id: 'icon-1',
          name: 'Star',
          type: 'icon',
          mimeType: 'image/svg+xml',
          createdAt: 1,
          dataUrl: svgToDataUrl('<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>'),
        },
      ],
      [
        'color-1',
        {
          id: 'color-1',
          name: 'Blue',
          type: 'color',
          mimeType: 'application/x-authoring-color',
          createdAt: 1,
          dataUrl: toColorAssetDataUrl('#2563eb'),
        },
      ],
    ]);

    const resolve = createAssetResolver((assetId) => records.get(assetId) ?? null);

    expect(resolve('asset:img-1')).toBe('data:image/png;base64,abc');
    expect(resolve('asset:icon-1')).toContain('data:image/svg+xml');
    expect(resolve('asset:color-1')).toBe('#2563eb');
    expect(resolve('https://example.com/logo.png')).toBe('https://example.com/logo.png');
    expect(resolve('asset:missing')).toBe('asset:missing');
  });
});
