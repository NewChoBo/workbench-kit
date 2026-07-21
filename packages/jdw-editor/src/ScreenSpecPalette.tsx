import type { DragEvent } from 'react';
import { SCREEN_SPEC_PALETTE_ASSETS, type ScreenPaletteKind } from '@workbench-kit/jdw';
import { Codicon, WorkbenchPropertyHint } from '@workbench-kit/react/primitives';

export const SCREEN_PALETTE_MIME = 'application/x-workbench-kit-screen-palette';

export interface ScreenPaletteItem {
  readonly kind: ScreenPaletteKind;
  readonly label: string;
  readonly category: 'content' | 'layout';
  readonly icon: string;
  readonly description: string;
}

export const SCREEN_PALETTE_ITEMS: readonly ScreenPaletteItem[] = SCREEN_SPEC_PALETTE_ASSETS.map(
  (asset) => ({
    kind: asset.screenKind,
    label: asset.label,
    category: asset.category === 'layout' ? 'layout' : 'content',
    icon: asset.icon ?? 'symbol-misc',
    description: asset.description ?? asset.label,
  }),
);

const CATEGORY_LABELS = {
  content: 'Content',
  layout: 'Layout',
} as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function writeScreenPaletteDragData(
  dataTransfer: DataTransfer,
  kind: ScreenPaletteKind,
): void {
  dataTransfer.setData(SCREEN_PALETTE_MIME, kind);
  dataTransfer.setData('text/plain', kind);
  dataTransfer.effectAllowed = 'copy';
}

export function readScreenPaletteDragData(dataTransfer: DataTransfer): ScreenPaletteKind | null {
  const raw = dataTransfer.getData(SCREEN_PALETTE_MIME) || dataTransfer.getData('text/plain');
  if (
    raw === 'text' ||
    raw === 'panel' ||
    raw === 'row' ||
    raw === 'column' ||
    raw === 'grid' ||
    raw === 'stack'
  ) {
    return raw;
  }
  return null;
}

export interface ScreenSpecPaletteProps {
  readonly canClickPlace: boolean;
  readonly insertTargetLabel?: string | undefined;
  readonly onPlaceKind: (kind: ScreenPaletteKind) => void;
}

export function ScreenSpecPalette({
  canClickPlace,
  insertTargetLabel,
  onPlaceKind,
}: ScreenSpecPaletteProps) {
  const categories = ['content', 'layout'] as const;

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, kind: ScreenPaletteKind): void => {
    writeScreenPaletteDragData(event.dataTransfer, kind);
  };

  return (
    <div className="widget-tree-asset-palette" data-testid="screen-spec-palette">
      {canClickPlace ? (
        <WorkbenchPropertyHint>
          Click to add to <strong>{insertTargetLabel ?? 'container'}</strong>, or drag onto Outline.
        </WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyHint>
          Select a row/column/grid/stack in Outline to click-add, or drag onto a container.
        </WorkbenchPropertyHint>
      )}

      {categories.map((category) => (
        <section key={category} className="widget-tree-asset-palette__section">
          <h3 className="widget-tree-asset-palette__title">{CATEGORY_LABELS[category]}</h3>
          <div className="widget-tree-asset-palette__grid">
            {SCREEN_PALETTE_ITEMS.filter((item) => item.category === category).map((item) => (
              <button
                key={item.kind}
                aria-disabled={!canClickPlace}
                className={cx(
                  'widget-tree-asset-palette__card',
                  'widget-tree-asset-palette__card--draggable',
                  !canClickPlace && 'widget-tree-asset-palette__card--drop-only',
                )}
                data-testid={`screen-spec-palette-${item.kind}`}
                draggable
                title={item.description}
                type="button"
                onClick={() => {
                  if (!canClickPlace) return;
                  onPlaceKind(item.kind);
                }}
                onDragStart={(event) => handleDragStart(event, item.kind)}
              >
                <Codicon icon={item.icon} />
                <span className="widget-tree-asset-palette__label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
