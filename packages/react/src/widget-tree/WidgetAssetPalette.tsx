import type { DragEvent } from 'react';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import type { GenericWidget } from '@workbench-kit/jdw';

import { WorkbenchPropertyHint } from '../layout/WorkbenchPropertyPanel';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { writeWidgetPlacementAssetDragData } from './widget-placement-asset-dnd.js';
import { canAddChildren } from './widget-tree-layout.js';

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  layout: 'Layout',
  template: 'Templates',
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
  const canClickPlace = canAddChildren(selectedContainer) && !readOnly;
  const canDrag = !readOnly;
  const categories = Object.keys(assetsByCategory);

  const handleAssetClick = (asset: WidgetPlacementAsset): void => {
    if (!canClickPlace) return;
    onPlaceAsset(asset);
  };

  const handleAssetDragStart = (
    event: DragEvent<HTMLButtonElement>,
    asset: WidgetPlacementAsset,
  ): void => {
    if (!canDrag) return;
    writeWidgetPlacementAssetDragData(event.dataTransfer, asset);
  };

  return (
    <div className="widget-tree-asset-palette" data-testid="widget-tree-asset-palette">
      {readOnly ? (
        <WorkbenchPropertyHint>Widget assets are read-only in this editor.</WorkbenchPropertyHint>
      ) : !canClickPlace ? (
        <WorkbenchPropertyHint>
          Select a container node in Outline to click-add, or drag an asset onto the outline or
          preview.
        </WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyHint>
          Click an asset to add it to <strong>{selectedContainer?.type ?? 'container'}</strong>, or
          drag it onto the outline or preview.
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
                aria-disabled={!canClickPlace}
                className={cx(
                  'widget-tree-asset-palette__card',
                  canDrag && 'widget-tree-asset-palette__card--draggable',
                  !canClickPlace && !readOnly && 'widget-tree-asset-palette__card--drop-only',
                  readOnly && 'widget-tree-asset-palette__card--disabled',
                )}
                data-testid={`widget-asset-${asset.id}`}
                disabled={readOnly}
                draggable={canDrag}
                title={asset.description ?? asset.label}
                type="button"
                onClick={() => handleAssetClick(asset)}
                onDragStart={(event) => handleAssetDragStart(event, asset)}
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
