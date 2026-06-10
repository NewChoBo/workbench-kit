import { describe, expect, it } from 'vitest';

import { formatWidgetAssetContent, formatWidgetAssetManifest } from './widget-asset-package.js';
import { validateWidgetAssetPackage } from './validate-widget-asset.js';

const packagePath = 'src/widgets/assets/heading';

describe('validateWidgetAssetPackage', () => {
  it('validates metadata and content subtree', () => {
    const result = validateWidgetAssetPackage({
      packagePath,
      manifestSource: formatWidgetAssetManifest({
        id: 'content.heading',
        label: 'Heading',
        category: 'content',
        kind: 'leaf',
      }),
      contentSource: formatWidgetAssetContent({
        type: 'text',
        text: 'Heading',
        fontSize: 24,
      }),
    });

    expect(result.valid).toBe(true);
    expect(result.parseError).toBeNull();
  });

  it('reports invalid content in a two-pass validation', () => {
    const result = validateWidgetAssetPackage({
      packagePath: 'src/widgets/assets/grid-broken',
      manifestSource: JSON.stringify({
        name: 'layout.grid-broken',
        label: 'Broken Grid',
        category: 'layout',
        kind: 'container',
      }),
      contentSource: JSON.stringify({
        type: 'grid',
        args: {
          children: [],
        },
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes('columns'))).toBe(true);
  });

  it('flags leaf assets that do not use text content', () => {
    const result = validateWidgetAssetPackage({
      packagePath: 'src/widgets/assets/bad-leaf',
      manifestSource: formatWidgetAssetManifest({
        id: 'content.bad-leaf',
        label: 'Bad Leaf',
        category: 'content',
        kind: 'leaf',
      }),
      contentSource: formatWidgetAssetContent({ type: 'row', children: [] }),
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'kind')).toBe(true);
  });
});
