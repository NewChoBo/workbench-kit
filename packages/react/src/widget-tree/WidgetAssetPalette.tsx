import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import type { GenericWidget } from '@workbench-kit/json-widget';

import { WorkbenchPropertyHint } from '../layout/WorkbenchPropertyPanel';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { canAddChildren } from './widget-tree-layout.js';

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  layout: 'Layout',
};

export interface WidgetAssetPaletteProps {
  readonly assetsByCategory: Readonly<Record<string, readonly WidgetPlacementAsset[]>>;
  readonly selectedContainer: GenericWidget | null;
  readonly readOnly?: boolean | undefined;
  readonly onPlaceAsset: (asset: WidgetPlacementAsset) => void;
}

export function WidgetAssetPalette({
  assetsByCategory,
  onPlaceAsset,
  readOnly = false,
  selectedContainer,
}: WidgetAssetPaletteProps) {
  const canPlace = canAddChildren(selectedContainer) && !readOnly;
  const categories = Object.keys(assetsByCategory);

  return (
    <div className="widget-tree-asset-palette" data-testid="widget-tree-asset-palette">
      {!canPlace ? (
        <WorkbenchPropertyHint>
          Select a container node in Outline to place an asset.
        </WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyHint>
          Click an asset to add it to{' '}
          <strong>{selectedContainer?.type ?? 'container'}</strong>.
        </WorkbenchPropertyHint>
      )}

      {categories.map((category) => (
        <section key={category} className="widget-tree-asset-palette__section">
          <h3 className="widget-tree-asset-palette__title">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="widget-tree-asset-palette__grid">
            {assetsByCategory[category]?.map((asset) => (
              <button
                key={asset.id}
                className={cx(
                  'widget-tree-asset-palette__card',
                  !canPlace && 'widget-tree-asset-palette__card--disabled',
                )}
                data-testid={`widget-asset-${asset.id}`}
                disabled={!canPlace}
                title={asset.description ?? asset.label}
                type="button"
                onClick={() => onPlaceAsset(asset)}
              >
                {asset.icon ? (
                  <i aria-hidden className={cxCodicon(asset.icon)} />
                ) : (
                  <span className="widget-tree-asset-palette__fallback-icon" aria-hidden>
                    {asset.label.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="widget-tree-asset-palette__label">{asset.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
