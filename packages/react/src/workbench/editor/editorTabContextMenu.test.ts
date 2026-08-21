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

  it('builds Close / Close others / Close to the right / Close all with closable policy', () => {
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
      { disabled: false, label: 'Close to the right' },
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

  it('closes only later closable tabs in tab order', () => {
    const closed: string[] = [];
    const context = createWorkbenchStandaloneEditorTabCommandContext({
      onClose: (tabId) => closed.push(tabId),
      tabId: 'middle',
      tabs: [
        { id: 'before' },
        { id: 'middle' },
        { closable: false, id: 'pinned-after' },
        { id: 'after-1' },
        { id: 'after-2' },
      ],
    });

    expect(context.canCloseToRight).toBe(true);
    context.closeToRight?.();
    expect(closed).toEqual(['after-1', 'after-2']);
  });

  it('disables Close to the right for the last tab or pinned-only tabs to the right', () => {
    const onClose = vi.fn();
    const lastContext = createWorkbenchStandaloneEditorTabCommandContext({
      onClose,
      tabId: 'last',
      tabs: [{ id: 'first' }, { id: 'last' }],
    });
    const pinnedOnlyContext = createWorkbenchStandaloneEditorTabCommandContext({
      onClose,
      tabId: 'first',
      tabs: [{ id: 'first' }, { closable: false, id: 'pinned-after' }],
    });

    expect(lastContext.canCloseToRight).toBe(false);
    expect(pinnedOnlyContext.canCloseToRight).toBe(false);
    lastContext.closeToRight?.();
    pinnedOnlyContext.closeToRight?.();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the Close to the right host override without running the default close loop', () => {
    const onClose = vi.fn();
    const onCloseToRight = vi.fn();
    const context = createWorkbenchStandaloneEditorTabCommandContext({
      onClose,
      onCloseToRight,
      tabId: 'first',
      tabs: [{ id: 'first' }, { id: 'second' }],
    });

    context.closeToRight?.();

    expect(onCloseToRight).toHaveBeenCalledOnce();
    expect(onCloseToRight).toHaveBeenCalledWith('first');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('appends extra host items after one separator and executes their action', () => {
    const onInspect = vi.fn();
    const items = createWorkbenchStandaloneEditorTabContextMenuItems({
      getExtraTabContextMenuItems: () => [
        { id: 'inspect', label: 'Inspect tab', onSelect: onInspect },
      ],
      onClose: vi.fn(),
      tabId: 'first',
      tabs: [{ id: 'first' }, { id: 'second' }],
    });

    expect(items.map((item) => (item.type === 'separator' ? 'separator' : item.label))).toEqual([
      'Close',
      'Close others',
      'Close to the right',
      'Close all',
      'separator',
      'Inspect tab',
    ]);

    const inspect = items[items.length - 1];
    if (!inspect || inspect.type === 'separator') {
      throw new Error('Inspect tab menu item missing');
    }
    inspect.onSelect();
    expect(onInspect).toHaveBeenCalledOnce();
  });

  it.each([
    ['undefined', undefined],
    ['empty', () => []],
  ] as const)('preserves the built-in shape for %s extra items', (_label, getExtraItems) => {
    const items = createWorkbenchStandaloneEditorTabContextMenuItems({
      getExtraTabContextMenuItems: getExtraItems,
      onClose: vi.fn(),
      tabId: 'first',
      tabs: [{ id: 'first' }, { id: 'second' }],
    });

    expect(items.some((item) => item.type === 'separator')).toBe(false);
    expect(items.map((item) => (item.type === 'separator' ? '' : item.label))).toEqual([
      'Close',
      'Close others',
      'Close to the right',
      'Close all',
    ]);
  });
});
