import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WidgetAssetPalette } from './WidgetAssetPalette.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';

describe('WidgetAssetPalette', () => {
  it('renders grouped asset cards', () => {
    const markup = renderToStaticMarkup(
      <WidgetAssetPalette
        assetsByCategory={WIDGET_TREE_DEMO_ASSET_CATALOG.assetsByCategory()}
        selectedContainer={{ type: 'column', children: [] }}
        onPlaceAsset={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-asset-palette"');
    expect(markup).toContain('data-testid="widget-asset-content.heading"');
    expect(markup).toContain('data-testid="widget-asset-layout.grid-2"');
    expect(markup).toContain('data-testid="widget-asset-template.section-stack"');
    expect(markup).toContain('Content');
    expect(markup).toContain('Layout');
    expect(markup).toContain('Templates');
  });

  it('disables placement when no container is selected', () => {
    const markup = renderToStaticMarkup(
      <WidgetAssetPalette
        assetsByCategory={WIDGET_TREE_DEMO_ASSET_CATALOG.assetsByCategory()}
        selectedContainer={null}
        onPlaceAsset={() => undefined}
      />,
    );

    expect(markup).toContain('widget-tree-asset-palette__card--disabled');
    expect(markup).toContain('Select a container node in Outline');
  });
});
