import { describe, expect, it } from 'vitest';

import { createWidgetAssetCatalogFromWorkspaceFiles } from './widget-asset-file.js';
import {
  discoverWidgetAssetPackages,
  formatWidgetAssetManifest,
  inferWidgetAssetPackagePath,
  parseWidgetAssetPackage,
} from './widget-asset-package.js';
import { validateWidgetAssetPackage } from './validate-widget-asset.js';

const headingPackage = {
  packagePath: 'src/widgets/assets/heading',
  manifestSource: formatWidgetAssetManifest({
    id: 'content.heading',
    label: 'Heading',
    category: 'content',
    kind: 'leaf',
  }),
  contentSource: JSON.stringify({
    type: 'text',
    args: { text: 'Heading', fontSize: 24 },
  }),
  schemaSource: JSON.stringify({
    type: 'object',
    properties: {
      text: { type: 'string' },
      fontSize: { type: 'number' },
    },
  }),
};

describe('widget asset package', () => {
  it('discovers packages from manifest.json + content.json pairs', () => {
    const packages = discoverWidgetAssetPackages([
      {
        path: 'src/widgets/assets/heading/manifest.json',
        content: headingPackage.manifestSource,
      },
      {
        path: 'src/widgets/assets/heading/content.json',
        content: headingPackage.contentSource,
      },
      {
        path: 'src/widgets/assets/heading/schema.json',
        content: headingPackage.schemaSource!,
      },
    ]);

    expect(packages).toHaveLength(1);
    expect(packages[0]?.packagePath).toBe('src/widgets/assets/heading');
  });

  it('parses manifest, content, and schema into a placement asset', () => {
    const parsed = parseWidgetAssetPackage(headingPackage);
    expect(parsed.parseError).toBeNull();
    expect(parsed.value).toMatchObject({
      id: 'content.heading',
      label: 'Heading',
      packagePath: 'src/widgets/assets/heading',
      widgetType: 'text',
    });
    expect(parsed.value?.inputsSchema).toMatchObject({
      properties: {
        text: { type: 'string' },
      },
    });
  });

  it('loads package assets from workspace files for the catalog', () => {
    const catalog = createWidgetAssetCatalogFromWorkspaceFiles([
      {
        path: 'src/widgets/assets/heading/manifest.json',
        content: headingPackage.manifestSource,
      },
      {
        path: 'src/widgets/assets/heading/content.json',
        content: headingPackage.contentSource,
      },
    ]);

    expect(catalog.asset('content.heading')).toMatchObject({
      id: 'content.heading',
      packagePath: 'src/widgets/assets/heading',
    });
  });

  it('validates package files in two passes', () => {
    const result = validateWidgetAssetPackage(headingPackage);
    expect(result.valid).toBe(true);
  });

  it('infers package paths from package member files', () => {
    expect(inferWidgetAssetPackagePath('src/widgets/assets/heading/content.json')).toBe(
      'src/widgets/assets/heading',
    );
  });
});
