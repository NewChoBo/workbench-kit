import { describe, expect, it } from 'vitest';

import {
  createWidgetAssetCatalog,
  materializeWidgetPlacementAsset,
} from './widget-placement-asset.js';

const assets = createWidgetAssetCatalog([
  {
    id: 'content.body',
    label: 'Body',
    category: 'content',
    widgetType: 'text',
    defaultWidget: { type: 'text', text: 'Body' },
  },
  {
    id: 'layout.grid-2',
    label: 'Grid',
    category: 'layout',
    widgetType: 'grid',
    defaultWidget: { type: 'grid', columns: 2, children: [] },
  },
]);

describe('widget placement assets', () => {
  it('groups assets by category', () => {
    expect(assets.assetsByCategory()).toEqual({
      content: [
        expect.objectContaining({ id: 'content.body' }),
      ],
      layout: [
        expect.objectContaining({ id: 'layout.grid-2' }),
      ],
    });
  });

  it('materializes grid placement for children', () => {
    const parent = {
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
    };

    expect(
      materializeWidgetPlacementAsset(assets.asset('content.body')!, parent as never),
    ).toEqual({
      type: 'text',
      text: 'Body',
      col: 1,
      row: 0,
    });
  });
});
