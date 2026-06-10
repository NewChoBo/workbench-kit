import { describe, expect, it } from 'vitest';

import {
  createWidgetAssetCatalogFromWorkspaceFiles,
  createWidgetAssetDocument,
} from './widget-asset-file.js';
import {
  formatWidgetAssetContent,
  formatWidgetAssetManifest,
  inferWidgetAssetSlugFromPackagePath,
} from './widget-asset-package.js';

const headingManifest = {
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  kind: 'leaf' as const,
  description: 'Large title text',
  icon: 'codicon-symbol-text',
};

const headingContent = {
  type: 'text',
  text: 'Heading',
  fontSize: 24,
};

const headingPackagePath = 'src/widgets/assets/heading';

describe('widget asset package workspace', () => {
  it('loads asset packages from workspace files', () => {
    const catalog = createWidgetAssetCatalogFromWorkspaceFiles([
      {
        path: `${headingPackagePath}/manifest.json`,
        content: formatWidgetAssetManifest(headingManifest),
      },
      {
        path: `${headingPackagePath}/content.json`,
        content: formatWidgetAssetContent(headingContent),
      },
    ]);

    expect(catalog.asset('content.heading')).toMatchObject({
      id: 'content.heading',
      label: 'Heading',
      widgetType: 'text',
      defaultWidget: {
        type: 'text',
        text: 'Heading',
        fontSize: 24,
      },
    });
    expect(catalog.assetsByCategory().content).toHaveLength(1);
  });

  it('resolves edited manifest with sibling content for design surfaces', () => {
    const manifest = formatWidgetAssetManifest(headingManifest);
    const content = formatWidgetAssetContent(headingContent);
    const document = createWidgetAssetDocument(manifest, {
      path: `${headingPackagePath}/manifest.json`,
      workspaceFiles: [
        { path: `${headingPackagePath}/manifest.json`, content: manifest },
        { path: `${headingPackagePath}/content.json`, content },
      ],
    });

    expect(document.parseError).toBeNull();
    expect(document.asset?.label).toBe('Heading');
  });

  it('infers ids from package folder names', () => {
    expect(inferWidgetAssetSlugFromPackagePath('src/widgets/assets/body')).toBe('body');
  });
});
