import type {
  WidgetAssetCatalogContract,
  WidgetPlacementAsset,
} from '@workbench-kit/contracts';

import { getWidgetChildren, type GenericWidget } from './widget-tree.js';

function cloneWidget(widget: WidgetPlacementAsset['defaultWidget']): GenericWidget {
  return JSON.parse(JSON.stringify(widget)) as GenericWidget;
}

function withGridPlacement(parent: GenericWidget, child: GenericWidget): GenericWidget {
  const columns = typeof parent.columns === 'number' && parent.columns > 0 ? parent.columns : 2;
  const nextIndex = getWidgetChildren(parent).length;

  return {
    ...child,
    col: nextIndex % columns,
    row: Math.floor(nextIndex / columns),
  };
}

export function materializeWidgetPlacementAsset(
  asset: WidgetPlacementAsset,
  parent?: GenericWidget | null,
): GenericWidget {
  const widget = cloneWidget(asset.defaultWidget);

  if (parent?.type === 'grid') {
    return withGridPlacement(parent, widget);
  }

  return widget;
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
