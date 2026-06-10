import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';

import { normalizeWidgetForPlacementPolicy, resolvePlacementPolicy } from './widget-normalize.js';
import type { GenericWidget } from './widget-tree.js';

function cloneWidget(widget: WidgetPlacementAsset['content']): GenericWidget {
  return JSON.parse(JSON.stringify(widget)) as GenericWidget;
}

export function materializeWidgetPlacementAsset(
  asset: WidgetPlacementAsset,
  parent?: GenericWidget | null,
): GenericWidget {
  const widget = cloneWidget(asset.content);
  if (!parent) {
    return widget;
  }

  const policy = resolvePlacementPolicy(asset.placementPolicy, asset.kind);
  return normalizeWidgetForPlacementPolicy(widget, parent, policy);
}

const ASSET_KIND_ORDER: Record<string, number> = {
  leaf: 0,
  container: 1,
  template: 2,
};

function compareAssetsForCatalog(a: WidgetPlacementAsset, b: WidgetPlacementAsset): number {
  const categoryOrder = a.category.localeCompare(b.category);
  if (categoryOrder !== 0) {
    return categoryOrder;
  }

  const kindOrder =
    (ASSET_KIND_ORDER[a.kind ?? 'leaf'] ?? 0) - (ASSET_KIND_ORDER[b.kind ?? 'leaf'] ?? 0);
  if (kindOrder !== 0) {
    return kindOrder;
  }

  return a.label.localeCompare(b.label);
}

/**
 * Merges catalogs left-to-right; later catalogs override earlier entries with the same `id`.
 */
export function mergeWidgetAssetCatalogs(
  ...catalogs: readonly WidgetAssetCatalogContract[]
): WidgetAssetCatalogContract {
  const byId = new Map<string, WidgetPlacementAsset>();

  for (const catalog of catalogs) {
    for (const asset of catalog.assets()) {
      byId.set(asset.id, asset);
    }
  }

  return createWidgetAssetCatalog([...byId.values()].sort(compareAssetsForCatalog));
}

export function createWidgetAssetCatalog(
  assets: readonly WidgetPlacementAsset[],
): WidgetAssetCatalogContract {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  return {
    asset(id: string) {
      return byId.get(id);
    },
    assets() {
      return assets;
    },
    assetsByCategory() {
      const grouped = new Map<string, WidgetPlacementAsset[]>();

      for (const asset of assets) {
        const bucket = grouped.get(asset.category) ?? [];
        bucket.push(asset);
        grouped.set(asset.category, bucket);
      }

      return Object.fromEntries(grouped);
    },
  };
}
