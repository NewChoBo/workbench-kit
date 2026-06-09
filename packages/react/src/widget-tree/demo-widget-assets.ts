import { widgetStudioAssetFiles } from '@workbench-kit/adapters';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  createWidgetAssetCatalog,
  createWidgetAssetCatalogFromWorkspaceFiles,
} from '@workbench-kit/json-widget';

/** @deprecated Prefer workspace `*.asset.json` files via {@link WIDGET_TREE_DEMO_ASSET_CATALOG}. */
export const WIDGET_TREE_DEMO_PLACEMENT_ASSETS: readonly WidgetPlacementAsset[] = [
  {
    id: 'content.heading',
    label: 'Heading',
    description: 'Large title text',
    category: 'content',
    icon: 'codicon-symbol-text',
    widgetType: 'text',
    defaultWidget: {
      type: 'text',
      text: 'Heading',
      fontSize: 24,
    },
  },
  {
    id: 'content.body',
    label: 'Body',
    description: 'Default paragraph text',
    category: 'content',
    icon: 'codicon-whole-word',
    widgetType: 'text',
    defaultWidget: {
      type: 'text',
      text: 'Body text',
    },
  },
  {
    id: 'content.label',
    label: 'Label',
    description: 'Small muted label',
    category: 'content',
    icon: 'codicon-tag',
    widgetType: 'text',
    defaultWidget: {
      type: 'text',
      text: 'Label',
      fontSize: 12,
      color: '#9aa0a6',
    },
  },
  {
    id: 'content.caption',
    label: 'Caption',
    description: 'Secondary supporting text',
    category: 'content',
    icon: 'codicon-info',
    widgetType: 'text',
    defaultWidget: {
      type: 'text',
      text: 'Caption',
      fontSize: 11,
      color: '#7a7f87',
    },
  },
  {
    id: 'layout.row',
    label: 'Row',
    description: 'Horizontal flex container',
    category: 'layout',
    icon: 'codicon-arrow-right',
    widgetType: 'row',
    defaultWidget: {
      type: 'row',
      gap: 8,
      padding: 0,
      children: [],
    },
  },
  {
    id: 'layout.column',
    label: 'Column',
    description: 'Vertical flex container',
    category: 'layout',
    icon: 'codicon-arrow-down',
    widgetType: 'column',
    defaultWidget: {
      type: 'column',
      gap: 8,
      padding: 0,
      children: [],
    },
  },
  {
    id: 'layout.grid-2',
    label: '2-col Grid',
    description: 'Two column grid',
    category: 'layout',
    icon: 'codicon-layout',
    widgetType: 'grid',
    defaultWidget: {
      type: 'grid',
      columns: 2,
      gap: 8,
      padding: 0,
      children: [],
    },
  },
  {
    id: 'layout.grid-3',
    label: '3-col Grid',
    description: 'Three column grid',
    category: 'layout',
    icon: 'codicon-layout',
    widgetType: 'grid',
    defaultWidget: {
      type: 'grid',
      columns: 3,
      gap: 8,
      padding: 0,
      children: [],
    },
  },
];

export const WIDGET_TREE_DEMO_ASSET_CATALOG = createWidgetAssetCatalogFromWorkspaceFiles(
  widgetStudioAssetFiles.map((file) => ({
    path: file.path,
    content: file.content,
  })),
);

/** Inline catalog fallback for isolated stories/tests without a workspace. */
export const WIDGET_TREE_INLINE_DEMO_ASSET_CATALOG = createWidgetAssetCatalog(
  WIDGET_TREE_DEMO_PLACEMENT_ASSETS,
);
