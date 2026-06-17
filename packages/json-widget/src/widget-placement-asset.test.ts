import { describe, expect, it } from 'vitest';

import { createWidgetAssetCatalog, mergeWidgetAssetCatalogs } from './widget-placement-asset.js';

const leafAsset = {
  id: 'content.body',
  label: 'Body',
  category: 'content',
  content: { type: 'text', text: 'Body' },
} as const;

const customAsset = {
  id: 'custom.feature-badge',
  label: 'Feature Badge',
  category: 'content',
  content: { type: 'row', children: [] },
} as const;

describe('mergeWidgetAssetCatalogs', () => {
  it('merges catalogs and lets later entries override the same id', () => {
    const builtin = createWidgetAssetCatalog([
      leafAsset,
      {
        id: 'layout.row',
        label: 'Row',
        category: 'layout',
        content: { type: 'row', children: [] } as never,
      },
    ]);
    const workspace = createWidgetAssetCatalog([
      customAsset,
      {
        ...leafAsset,
        label: 'Workspace Body',
      },
    ]);

    const merged = mergeWidgetAssetCatalogs(builtin, workspace);

    expect(merged.assets()).toHaveLength(3);
    expect(merged.asset('custom.feature-badge')).toMatchObject(customAsset);
    expect(merged.asset('content.body')?.label).toBe('Workspace Body');
    expect(merged.asset('layout.row')?.label).toBe('Row');
  });
});
