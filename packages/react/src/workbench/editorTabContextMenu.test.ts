import { describe, expect, it, vi } from 'vitest';

import {
  createWorkbenchStandaloneEditorTabCommandContext,
  createWorkbenchStandaloneEditorTabContextMenuItems,
  isWorkbenchEditorTabClosable,
} from './editorTabContextMenu';

describe('editorTabContextMenu', () => {
  it('treats missing closable as closable', () => {
    expect(isWorkbenchEditorTabClosable({ id: 'a' })).toBe(true);
    expect(isWorkbenchEditorTabClosable({ closable: true, id: 'b' })).toBe(true);
    expect(isWorkbenchEditorTabClosable({ closable: false, id: 'c' })).toBe(false);
  });

  it('disables Close for non-closable tabs and skips them in Close others / Close all', () => {
    const closed: string[] = [];
    const tabs = [
      { closable: false, id: 'library' },
      { closable: true, id: 'item-1' },
      { closable: true, id: 'item-2' },
    ];

    const libraryContext = createWorkbenchStandaloneEditorTabCommandContext({
      onClose: (tabId) => closed.push(tabId),
      tabId: 'library',
      tabs,
    });

    expect(libraryContext.canClosePath).toBe(false);
    expect(libraryContext.canCloseOthers).toBe(true);
    expect(libraryContext.canCloseAll).toBe(true);

    libraryContext.closePath();
    expect(closed).toEqual([]);

    libraryContext.closeOthers();
    expect(closed).toEqual(['item-1', 'item-2']);

    closed.length = 0;
    libraryContext.closeAll();
    expect(closed).toEqual(['item-1', 'item-2']);
  });

  it('builds Close / Close others / Close all menu items with closable policy', () => {
    const onClose = vi.fn();
    const items = createWorkbenchStandaloneEditorTabContextMenuItems({
      onClose,
      tabId: 'library',
      tabs: [
        { closable: false, id: 'library' },
        { closable: true, id: 'item-1' },
      ],
    });

    expect(
      items.map((item) =>
        'label' in item ? { disabled: item.disabled, label: item.label } : item,
      ),
    ).toEqual([
      { disabled: true, label: 'Close' },
      { disabled: false, label: 'Close others' },
      { disabled: false, label: 'Close all' },
    ]);

    const closeOthers = items.find((item) => 'label' in item && item.label === 'Close others');
    if (!closeOthers || closeOthers.type === 'separator') {
      throw new Error('Close others menu item missing');
    }
    closeOthers.onSelect();
    expect(onClose).toHaveBeenCalledWith('item-1');
  });

  it('uses host bulk close callbacks when provided', () => {
    const onClose = vi.fn();
    const onCloseAll = vi.fn();
    const onCloseOthers = vi.fn();
    const context = createWorkbenchStandaloneEditorTabCommandContext({
      onClose,
      onCloseAll,
      onCloseOthers,
      tabId: 'item-1',
      tabs: [
        { closable: false, id: 'library' },
        { closable: true, id: 'item-1' },
        { closable: true, id: 'item-2' },
      ],
    });

    context.closeOthers();
    context.closeAll();

    expect(onCloseOthers).toHaveBeenCalledWith('item-1');
    expect(onCloseAll).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
