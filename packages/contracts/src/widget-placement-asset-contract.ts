import type { WidgetTypeShape } from './widget-registry-contract.js';

export type WidgetPlacementAssetCategory = 'content' | 'layout' | (string & {});

/**
 * Pre-defined widget template that can be placed into a container from the editor palette.
 */
export interface WidgetPlacementAsset<W extends WidgetTypeShape = WidgetTypeShape> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly category: WidgetPlacementAssetCategory;
  readonly icon?: string;
  readonly widgetType: W['type'];
  readonly defaultWidget: W;
}

export interface WidgetAssetCatalogContract {
  asset(id: string): WidgetPlacementAsset | undefined;
  assets(): readonly WidgetPlacementAsset[];
  assetsByCategory(): Readonly<Record<string, readonly WidgetPlacementAsset[]>>;
}
