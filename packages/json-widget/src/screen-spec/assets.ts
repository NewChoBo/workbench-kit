import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';

import { jdwNodeToGenericWidget } from '../jdw-node.js';
import { createWidgetAssetCatalog } from '../widget-placement-asset.js';
import type { GenericWidget } from '../widget-tree.js';
import { createDefaultScreenNode, type ScreenPaletteKind } from './tree.js';
import { compileScreenNode } from './compile.js';

export interface ScreenSpecPaletteWidgetAsset extends WidgetPlacementAsset<GenericWidget> {
  readonly screenKind: ScreenPaletteKind;
}

function createPaletteAsset(
  screenKind: ScreenPaletteKind,
  metadata: Omit<ScreenSpecPaletteWidgetAsset, 'content' | 'id' | 'screenKind'>,
): ScreenSpecPaletteWidgetAsset {
  return {
    ...metadata,
    id: `screen-spec.${screenKind}`,
    screenKind,
    content: jdwNodeToGenericWidget(compileScreenNode(createDefaultScreenNode(screenKind))),
  };
}

/**
 * Canonical WidgetTreeLab placement assets for the legacy Screen Spec palette blocks.
 *
 * These assets let templates/scaffolds continue to provide familiar starter
 * blocks without introducing a second editable hierarchy after JDW compilation.
 */
export const SCREEN_SPEC_PALETTE_ASSETS: readonly ScreenSpecPaletteWidgetAsset[] = [
  createPaletteAsset('text', {
    label: 'Text',
    category: 'content',
    kind: 'leaf',
    icon: 'symbol-text',
    description: 'Text label',
  }),
  createPaletteAsset('panel', {
    label: 'Panel',
    category: 'content',
    kind: 'leaf',
    icon: 'symbol-misc',
    description: 'Filled content panel',
  }),
  createPaletteAsset('row', {
    label: 'Row',
    category: 'layout',
    kind: 'container',
    icon: 'split-horizontal',
    description: 'Horizontal layout container',
  }),
  createPaletteAsset('column', {
    label: 'Column',
    category: 'layout',
    kind: 'container',
    icon: 'split-vertical',
    description: 'Vertical layout container',
  }),
  createPaletteAsset('grid', {
    label: 'Grid',
    category: 'layout',
    kind: 'container',
    icon: 'editor-layout',
    description: 'Grid layout container',
  }),
  createPaletteAsset('stack', {
    label: 'Stack',
    category: 'layout',
    kind: 'container',
    icon: 'layers',
    description: 'Stacked layers container',
  }),
];

export function createScreenSpecPaletteAssetCatalog(): WidgetAssetCatalogContract {
  return createWidgetAssetCatalog(SCREEN_SPEC_PALETTE_ASSETS);
}
