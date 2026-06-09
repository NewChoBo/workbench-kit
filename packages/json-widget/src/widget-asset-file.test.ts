import { describe, expect, it } from 'vitest';

import {
  createWidgetAssetCatalogFromWorkspaceFiles,
  formatWidgetAssetJson,
  inferWidgetAssetIdFromPath,
  parseWidgetAssetJson,
} from './widget-asset-file.js';

const headingAsset = {
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
  it('parses and formats a widget asset document', () => {
    const source = formatWidgetAssetJson({
      id: 'content.heading',
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
    });
  });

  it('infers asset ids from file paths when loading workspace files', () => {
    const catalog = createWidgetAssetCatalogFromWorkspaceFiles([
      {
        path: 'src/widgets/assets/heading.asset.json',
        content: formatWidgetAssetJson(headingAsset),
      },
    ]);

    expect(catalog.asset('heading')).toMatchObject({
      id: 'heading',
      label: 'Heading',
    });
    expect(catalog.assetsByCategory().content).toHaveLength(1);
  });

  it('reports mismatched default widget types', () => {
    const parsed = parseWidgetAssetJson(
      JSON.stringify({
        id: 'broken',
        label: 'Broken',
        category: 'content',
        widgetType: 'text',
        defaultWidget: { type: 'row', children: [] },
      }),
    );

    expect(parsed.parseError).toContain('defaultWidget.type');
  });

  it('infers ids from asset file names', () => {
    expect(inferWidgetAssetIdFromPath('src/widgets/assets/body.asset.json')).toBe('body');
  });
});
