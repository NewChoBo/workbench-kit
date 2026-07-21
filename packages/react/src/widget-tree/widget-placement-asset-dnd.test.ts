import { describe, expect, it } from 'vitest';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';

import {
  WIDGET_PLACEMENT_ASSET_DRAG_MIME,
  readWidgetPlacementAssetDragData,
  writeWidgetPlacementAssetDragData,
} from './widget-placement-asset-dnd.js';

const asset: WidgetPlacementAsset = {
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  kind: 'leaf',
  content: { type: 'text' },
};

describe('widget-placement-asset-dnd', () => {
  it('round-trips widget placement assets through DataTransfer', () => {
    const dataTransfer = createDataTransfer();

    writeWidgetPlacementAssetDragData(dataTransfer, asset);

    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(dataTransfer.getData('text/plain')).toBe('Heading');
    expect(dataTransfer.getData(WIDGET_PLACEMENT_ASSET_DRAG_MIME)).toContain('content.heading');
    expect(readWidgetPlacementAssetDragData(dataTransfer)).toEqual(asset);
  });

  it('rejects missing or malformed drag data', () => {
    const dataTransfer = createDataTransfer();

    expect(readWidgetPlacementAssetDragData(dataTransfer)).toBeNull();

    dataTransfer.setData(WIDGET_PLACEMENT_ASSET_DRAG_MIME, '{"id":"missing-content"}');
    expect(readWidgetPlacementAssetDragData(dataTransfer)).toBeNull();

    dataTransfer.setData(WIDGET_PLACEMENT_ASSET_DRAG_MIME, '{');
    expect(readWidgetPlacementAssetDragData(dataTransfer)).toBeNull();
  });
});

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();

  return {
    clearData: (format?: string) => {
      if (format) store.delete(format);
      else store.clear();
    },
    dropEffect: 'none',
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    getData: (format: string) => store.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setDragImage: () => undefined,
    setData: (format: string, data: string) => {
      store.set(format, data);
    },
    types: [],
  } as unknown as DataTransfer;
}
