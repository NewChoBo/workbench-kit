import type { WidgetTypeShape } from './widget-registry-contract.js';

export type WidgetPlacementAssetCategory = 'content' | 'layout' | 'template' | (string & {});

/** How the palette treats the asset when placing into a document. */
export type WidgetPlacementAssetKind = 'leaf' | 'container' | 'template';

/** Insert-time behavior when materializing an asset into a parent container. */
export type WidgetPlacementPolicy = 'rematerialize-grid-slot' | 'preserve-internal-layout';

/**
 * Pre-defined widget template that can be placed into a container from the editor palette.
 */
export interface WidgetPlacementAsset<W extends WidgetTypeShape = WidgetTypeShape> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly category: WidgetPlacementAssetCategory;
  readonly kind?: WidgetPlacementAssetKind;
  readonly placementPolicy?: WidgetPlacementPolicy;
  readonly icon?: string;
  /** Workspace directory path when loaded from a package layout. */
  readonly packagePath?: string;
  /** Per-asset inputs JSON Schema (`schema.json` in package directory). */
  readonly inputsSchema?: Record<string, unknown>;
  readonly widgetType: W['type'];
  readonly defaultWidget: W;
}

export interface WidgetAssetCatalogContract {
  asset(id: string): WidgetPlacementAsset | undefined;
  assets(): readonly WidgetPlacementAsset[];
  assetsByCategory(): Readonly<Record<string, readonly WidgetPlacementAsset[]>>;
}
