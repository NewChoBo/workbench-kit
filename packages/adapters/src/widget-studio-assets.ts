import type { WorkspaceFile } from '@workbench-kit/workspace';

import {
  flattenWidgetStudioAssetPackages,
  WIDGET_STUDIO_ASSETS_DIR,
  WIDGET_STUDIO_CUSTOM_ASSETS_DIR,
  type WidgetStudioAssetPackageDefinition,
} from './widget-studio-asset-package.js';

export const WIDGET_STUDIO_ASSET_MIME = 'application/vnd.workbench-kit.widget-asset+json';
export { WIDGET_STUDIO_ASSETS_DIR, WIDGET_STUDIO_CUSTOM_ASSETS_DIR };

export type WidgetStudioWorkspaceAssetFile = WorkspaceFile;

const TEXT_INPUTS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'TextAssetInputs',
  type: 'object',
  properties: {
    text: { type: 'string' },
    fontSize: { type: 'number', minimum: 1 },
    color: { type: 'string' },
  },
};

const LAYOUT_INPUTS_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'LayoutAssetInputs',
  type: 'object',
  properties: {
    gap: { type: 'number', minimum: 0, default: 8 },
    padding: { type: 'number', minimum: 0, default: 0 },
  },
};

const builtinAssetPackages: WidgetStudioAssetPackageDefinition[] = [
  {
    slug: 'heading',
    updatedAt: '2026-06-02T09:24:00.000Z',
    manifest: {
      name: 'content.heading',
      version: '1.0.0',
      label: 'Heading',
      description: 'Large title text',
      category: 'content',
      kind: 'leaf',
      icon: 'codicon-symbol-text',
    },
    schema: TEXT_INPUTS_SCHEMA,
    content: {
      type: 'text',
      args: { text: 'Heading', fontSize: 24 },
    },
  },
  {
    slug: 'body',
    updatedAt: '2026-06-02T09:24:10.000Z',
    manifest: {
      name: 'content.body',
      version: '1.0.0',
      label: 'Body',
      description: 'Default paragraph text',
      category: 'content',
      kind: 'leaf',
      icon: 'codicon-whole-word',
    },
    schema: TEXT_INPUTS_SCHEMA,
    content: {
      type: 'text',
      args: { text: 'Body text' },
    },
  },
  {
    slug: 'label',
    updatedAt: '2026-06-02T09:24:12.000Z',
    manifest: {
      name: 'content.label',
      version: '1.0.0',
      label: 'Label',
      description: 'Small muted label',
      category: 'content',
      kind: 'leaf',
      icon: 'codicon-tag',
    },
    schema: TEXT_INPUTS_SCHEMA,
    content: {
      type: 'text',
      args: { text: 'Label', fontSize: 12, color: '#9aa0a6' },
    },
  },
  {
    slug: 'caption',
    updatedAt: '2026-06-02T09:24:14.000Z',
    manifest: {
      name: 'content.caption',
      version: '1.0.0',
      label: 'Caption',
      description: 'Secondary supporting text',
      category: 'content',
      kind: 'leaf',
      icon: 'codicon-info',
    },
    schema: TEXT_INPUTS_SCHEMA,
    content: {
      type: 'text',
      args: { text: 'Caption', fontSize: 11, color: '#7a7f87' },
    },
  },
  {
    slug: 'row',
    updatedAt: '2026-06-02T09:24:20.000Z',
    manifest: {
      name: 'layout.row',
      version: '1.0.0',
      label: 'Row',
      description: 'Horizontal flex container',
      category: 'layout',
      kind: 'container',
      icon: 'codicon-arrow-right',
    },
    schema: LAYOUT_INPUTS_SCHEMA,
    content: {
      type: 'row',
      args: { gap: 8, padding: 0, children: [] },
    },
  },
  {
    slug: 'column',
    updatedAt: '2026-06-02T09:24:22.000Z',
    manifest: {
      name: 'layout.column',
      version: '1.0.0',
      label: 'Column',
      description: 'Vertical flex container',
      category: 'layout',
      kind: 'container',
      icon: 'codicon-arrow-down',
    },
    schema: LAYOUT_INPUTS_SCHEMA,
    content: {
      type: 'column',
      args: { gap: 8, padding: 0, children: [] },
    },
  },
  {
    slug: 'grid-2',
    updatedAt: '2026-06-02T09:24:30.000Z',
    manifest: {
      name: 'layout.grid-2',
      version: '1.0.0',
      label: '2-col Grid',
      description: 'Two column grid',
      category: 'layout',
      kind: 'container',
      icon: 'codicon-layout',
    },
    schema: {
      ...LAYOUT_INPUTS_SCHEMA,
      properties: {
        ...LAYOUT_INPUTS_SCHEMA.properties,
        columns: { type: 'number', minimum: 1, default: 2 },
      },
    },
    content: {
      type: 'grid',
      args: { columns: 2, gap: 8, padding: 0, children: [] },
    },
  },
  {
    slug: 'grid-3',
    updatedAt: '2026-06-02T09:24:32.000Z',
    manifest: {
      name: 'layout.grid-3',
      version: '1.0.0',
      label: '3-col Grid',
      description: 'Three column grid',
      category: 'layout',
      kind: 'container',
      icon: 'codicon-layout',
    },
    schema: {
      ...LAYOUT_INPUTS_SCHEMA,
      properties: {
        ...LAYOUT_INPUTS_SCHEMA.properties,
        columns: { type: 'number', minimum: 1, default: 3 },
      },
    },
    content: {
      type: 'grid',
      args: { columns: 3, gap: 8, padding: 0, children: [] },
    },
  },
  {
    slug: 'media-card',
    updatedAt: '2026-06-02T09:24:36.000Z',
    manifest: {
      name: 'template.media-card',
      version: '1.0.0',
      label: 'Media Card',
      description: 'Image placeholder with title and caption',
      category: 'template',
      kind: 'template',
      icon: 'codicon-file-media',
    },
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'MediaCardInputs',
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Card title' },
        description: { type: 'string', default: 'Short description for the card.' },
      },
    },
    content: {
      type: 'column',
      args: {
        gap: 8,
        children: [
          {
            type: 'row',
            args: {
              gap: 0,
              children: [
                {
                  type: 'expanded',
                  args: {
                    flex: 1,
                    child: {
                      type: 'text',
                      args: { text: ' ', background: '#2b2f36' },
                    },
                  },
                },
              ],
            },
          },
          {
            type: 'text',
            args: { text: 'Card title', fontSize: 16 },
          },
          {
            type: 'text',
            args: {
              text: 'Short description for the card.',
              fontSize: 12,
              color: '#9aa0a6',
            },
          },
        ],
      },
    },
  },
  {
    slug: 'section-stack',
    updatedAt: '2026-06-02T09:24:40.000Z',
    manifest: {
      name: 'template.section-stack',
      version: '1.0.0',
      label: 'Section Stack',
      description: 'Title with supporting body copy',
      category: 'template',
      kind: 'template',
      icon: 'codicon-layers',
    },
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'SectionStackInputs',
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Section title' },
        body: { type: 'string', default: 'Supporting body copy.' },
      },
    },
    content: {
      type: 'column',
      args: {
        gap: 4,
        children: [
          { type: 'text', args: { text: 'Section title', fontSize: 18 } },
          { type: 'text', args: { text: 'Supporting body copy.' } },
        ],
      },
    },
  },
];

const customAssetPackages: WidgetStudioAssetPackageDefinition[] = [
  {
    slug: 'feature-badge',
    baseDir: WIDGET_STUDIO_CUSTOM_ASSETS_DIR,
    updatedAt: '2026-06-02T09:25:00.000Z',
    manifest: {
      name: 'custom.feature-badge',
      version: '1.0.0',
      label: 'Feature Badge',
      description: 'Custom workspace asset example',
      category: 'content',
      kind: 'template',
      icon: 'codicon-verified',
    },
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'FeatureBadgeInputs',
      type: 'object',
      properties: {
        label: { type: 'string', default: 'Feature enabled' },
      },
    },
    content: {
      type: 'row',
      args: {
        gap: 6,
        children: [
          { type: 'text', args: { text: '✓', fontSize: 12, color: '#34a853' } },
          { type: 'text', args: { text: 'Feature enabled', fontSize: 12 } },
        ],
      },
    },
  },
];

export const widgetStudioBuiltinAssetFiles = flattenWidgetStudioAssetPackages(builtinAssetPackages);
export const widgetStudioCustomAssetExampleFiles =
  flattenWidgetStudioAssetPackages(customAssetPackages);

/** @deprecated Use {@link widgetStudioBuiltinAssetFiles}. */

export const widgetStudioAssetPackageSlugs = [
  ...builtinAssetPackages.map((pkg) => pkg.slug),
  ...customAssetPackages.map((pkg) => `${pkg.baseDir?.split('/').pop()}/${pkg.slug}`),
];
