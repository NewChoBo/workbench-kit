import { describe, expect, it } from 'vitest';

import {
  normalizeHexColor,
  normalizeSvgMarkup,
  parseColorAssetDataUrl,
  resolveRecordValue,
  svgToDataUrl,
  toColorAssetDataUrl,
} from './asset-content.js';
import type { AuthoringAssetRecord } from './asset-types.js';

describe('asset-content', () => {
  it('normalizes short and long hex colors', () => {
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHexColor('red')).toBeNull();
  });

  it('stores and parses color asset payloads', () => {
    const dataUrl = toColorAssetDataUrl('#3b82f6');
    expect(dataUrl).toBe('color:#3b82f6');
    expect(parseColorAssetDataUrl(dataUrl)).toBe('#3b82f6');
  });

  it('validates svg markup and encodes data urls', () => {
    const svg = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    expect(normalizeSvgMarkup(svg)).toBe(svg);
    expect(svgToDataUrl(svg).startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(() => normalizeSvgMarkup('<div></div>')).toThrow();
  });

  it('resolves record values by asset type', () => {
    const colorRecord: AuthoringAssetRecord = {
      id: 'color-1',
      name: 'Blue',
      type: 'color',
      mimeType: 'application/x-authoring-color',
      createdAt: 1,
      dataUrl: 'color:#3b82f6',
    };
    const iconRecord: AuthoringAssetRecord = {
      id: 'icon-1',
      name: 'Dot',
      type: 'icon',
      mimeType: 'image/svg+xml',
      createdAt: 1,
      dataUrl: svgToDataUrl('<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>'),
    };

    expect(resolveRecordValue(colorRecord)).toBe('#3b82f6');
    expect(resolveRecordValue(iconRecord)).toContain('data:image/svg+xml');
  });
});
