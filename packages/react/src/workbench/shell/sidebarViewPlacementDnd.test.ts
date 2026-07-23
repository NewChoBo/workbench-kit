import { describe, expect, it } from 'vitest';

import {
  hasWorkbenchSidebarViewPlacementDrag,
  readWorkbenchSidebarViewPlacementDrag,
  resetWorkbenchSidebarViewPlacementDragSession,
  subscribeWorkbenchSidebarViewPlacementDragSessionEnd,
  writeWorkbenchSidebarViewPlacementDrag,
} from './sidebarViewPlacementDnd';

function createDataTransferMock(): DataTransfer {
  const values = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as unknown as readonly string[],
    clearData: () => {
      values.clear();
    },
    getData(type: string) {
      return values.get(type) ?? '';
    },
    setData(type: string, value: string) {
      values.set(type, value);
      (this.types as string[]) = [...values.keys()];
    },
    setDragImage: () => undefined,
  } as DataTransfer;
}

describe('sidebarViewPlacementDnd', () => {
  it('writes and reads the shared sidebar placement drag payload', () => {
    const dataTransfer = createDataTransferMock();

    writeWorkbenchSidebarViewPlacementDrag(dataTransfer, 'library');

    expect(hasWorkbenchSidebarViewPlacementDrag(dataTransfer)).toBe(true);
    expect(readWorkbenchSidebarViewPlacementDrag(dataTransfer)).toBe('library');
  });

  it('notifies subscribers when the drag session ends', () => {
    const dataTransfer = createDataTransferMock();
    const calls: string[] = [];

    const unsubscribe = subscribeWorkbenchSidebarViewPlacementDragSessionEnd(() => {
      calls.push('end');
    });

    writeWorkbenchSidebarViewPlacementDrag(dataTransfer, 'library');
    resetWorkbenchSidebarViewPlacementDragSession();

    expect(calls).toEqual(['end']);

    unsubscribe();
  });
});
