import { describe, expect, it } from 'vitest';

import { resolveWidgetStudioAssetCatalog } from './resolve-widget-studio-asset-catalog.js';

describe('resolveWidgetStudioAssetCatalog', () => {
  it('includes built-in assets and workspace custom assets', () => {
    const catalog = resolveWidgetStudioAssetCatalog([
      {
        path: 'src/widgets/assets/custom/feature-badge/manifest.json',
        content: JSON.stringify({
          name: 'custom.feature-badge',
          label: 'Feature Badge',
          category: 'content',
          kind: 'template',
        }),
      },
      {
        path: 'src/widgets/assets/custom/feature-badge/content.json',
        content: JSON.stringify({
          type: 'row',
          args: { children: [] },
        }),
      },
    ]);

    expect(catalog.asset('content.heading')?.label).toBe('Heading');
    expect(catalog.asset('layout.column')?.label).toBe('Column');
    expect(catalog.asset('template.section-stack')?.category).toBe('template');
    expect(catalog.asset('custom.feature-badge')?.label).toBe('Feature Badge');
  });

  it('lets workspace assets override built-ins with the same id', () => {
    const catalog = resolveWidgetStudioAssetCatalog([
      {
        path: 'src/widgets/assets/heading/manifest.json',
        content: JSON.stringify({
          name: 'content.heading',
          label: 'Custom Heading',
          category: 'content',
        }),
      },
      {
        path: 'src/widgets/assets/heading/content.json',
        content: JSON.stringify({
          type: 'text',
          args: { text: 'Custom' },
        }),
      },
    ]);

    expect(catalog.asset('content.heading')?.label).toBe('Custom Heading');
  });
});
