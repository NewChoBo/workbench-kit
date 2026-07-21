import type { WidgetPlacementAsset } from '@workbench-kit/contracts';

export const WIDGET_PLACEMENT_ASSET_DRAG_MIME =
  'application/vnd.workbench-kit.widget-placement-asset+json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function writeWidgetPlacementAssetDragData(
  dataTransfer: DataTransfer,
  asset: WidgetPlacementAsset,
): void {
  dataTransfer.setData(WIDGET_PLACEMENT_ASSET_DRAG_MIME, JSON.stringify(asset));
  dataTransfer.setData('text/plain', asset.label);
  dataTransfer.effectAllowed = 'copy';
}

export function readWidgetPlacementAssetDragData(
  dataTransfer: DataTransfer | null,
): WidgetPlacementAsset | null {
  const raw = dataTransfer?.getData(WIDGET_PLACEMENT_ASSET_DRAG_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.content)) return null;
    if (typeof parsed.id !== 'string' || typeof parsed.label !== 'string') return null;
    if (typeof parsed.category !== 'string') return null;

    return parsed as unknown as WidgetPlacementAsset;
  } catch {
    return null;
  }
}
