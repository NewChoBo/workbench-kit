import { describe, expect, it } from 'vitest';

import { createScreenSpecPaletteAssetCatalog, SCREEN_SPEC_PALETTE_ASSETS } from './assets.js';

describe('createScreenSpecPaletteAssetCatalog', () => {
  it('represents every Screen Spec palette block as a JDW placement asset', () => {
    const catalog = createScreenSpecPaletteAssetCatalog();

    expect(SCREEN_SPEC_PALETTE_ASSETS.map((asset) => asset.screenKind)).toEqual([
      'text',
      'panel',
      'row',
      'column',
      'grid',
      'stack',
    ]);
    expect(catalog.assets()).toHaveLength(6);
    expect(catalog.asset('screen-spec.text')?.content).toEqual({
      type: 'text',
      text: 'Text',
    });
    expect(catalog.asset('screen-spec.row')?.content).toEqual({
      type: 'row',
      children: [{ type: 'text', text: 'Item' }],
    });
    expect(catalog.assetsByCategory().layout).toHaveLength(4);
  });
});
