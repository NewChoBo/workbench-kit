import { describe, expect, it } from 'vitest';

import {
  createWidgetAssetCatalogFromWorkspaceFiles,
  formatWidgetAssetJson,
  inferWidgetAssetIdFromPath,
  parseWidgetAssetJson,
} from './widget-asset-file.js';

const headingAsset = {
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Heading',
    fontSize: 24,
  },
};

describe('widget asset file', () => {
  it('parses and formats a JDW content asset document', () => {
    const source = formatWidgetAssetJson({
      ...headingAsset,
      description: 'Large title text',
      icon: 'codicon-symbol-text',
    });

    const parsed = parseWidgetAssetJson(source);
    expect(parsed.parseError).toBeNull();
    expect(parsed.value).toMatchObject({
      id: 'content.heading',
      label: 'Heading',
      widgetType: 'text',
      defaultWidget: {
        type: 'text',
        text: 'Heading',
        fontSize: 24,
      },
    });
    expect(source).toContain('"content"');
    expect(source).toContain('"args"');
    expect(source).not.toContain('"defaultWidget"');
  });

  it('infers asset ids from file paths when loading workspace files', () => {
    const catalog = createWidgetAssetCatalogFromWorkspaceFiles([
      {
        path: 'src/widgets/assets/heading.asset.json',
        content: formatWidgetAssetJson({
          id: 'heading',
          label: 'Heading',
          category: 'content',
          widgetType: 'text',
          defaultWidget: { type: 'text', text: 'Heading' } as never,
        }),
      },
    ]);

    expect(catalog.asset('heading')).toMatchObject({
      id: 'heading',
      label: 'Heading',
    });
    expect(catalog.assetsByCategory().content).toHaveLength(1);
  });

  it('reports invalid JDW content envelopes', () => {
    const parsed = parseWidgetAssetJson(
      JSON.stringify({
        name: 'broken',
        label: 'Broken',
        category: 'content',
        content: { type: 'text', text: 'Missing args envelope' },
      }),
    );

    expect(parsed.parseError).toContain('JDW v7 envelope');
  });

  it('infers ids from asset file names', () => {
    expect(inferWidgetAssetIdFromPath('src/widgets/assets/body.asset.json')).toBe('body');
  });
});
