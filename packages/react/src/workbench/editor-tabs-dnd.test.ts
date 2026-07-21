/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  EDITOR_TAB_DRAG_DATA_TYPE,
  getEditorTabDropPosition,
  isEditorTabMoveNoop,
  isEditorTabsScrollerEventTarget,
  normalizeEditorTabReorderIndex,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
} from './editor-tabs-dnd';

const tabs = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

describe('editor-tabs-dnd', () => {
  it('reads editor tab drag payloads from data transfer', () => {
    expect(
      readEditorTabDragPayload(
        dataTransfer({
          [EDITOR_TAB_DRAG_DATA_TYPE]: JSON.stringify({ groupId: 'main', tabId: 'first' }),
        }),
      ),
    ).toEqual({ groupId: 'main', tabId: 'first' });
  });

  it('resolves tab drop targets and no-op moves', () => {
    const target = rectElement({ left: 100, width: 200 });

    expect(
      resolveEditorTabDropTarget({
        clientX: 120,
        draggedTab: { groupId: 'main', tabId: 'first' },
        groupId: 'main',
        tabs,
        target,
        targetTabId: 'third',
      }),
    ).toEqual({ position: 'before', tabId: 'third', targetIndex: 2 });
    expect(
      resolveEditorTabDropTarget({
        clientX: 260,
        draggedTab: { groupId: 'main', tabId: 'first' },
        groupId: 'main',
        tabs,
        target,
        targetTabId: 'first',
      }),
    ).toBeNull();
    expect(
      isEditorTabMoveNoop({
        draggedTab: { groupId: 'main', tabId: 'second' },
        groupId: 'main',
        tabs,
        targetIndex: 2,
      }),
    ).toBe(true);
  });

  it('resolves tab strip drops after the last tab', () => {
    expect(
      resolveEditorTabStripDropTarget({
        draggedTab: { groupId: 'side', tabId: 'remote' },
        groupId: 'main',
        tabs,
      }),
    ).toEqual({ position: 'after', tabId: 'third', targetIndex: 3 });
  });

  it('detects tab scroller drag targets without matching tab children', () => {
    const scroller = document.createElement('div');
    scroller.className = 'ui-editor-tabs__scroller';
    const tab = document.createElement('button');
    tab.className = 'ui-editor-tabs__tab';
    scroller.append(tab);

    expect(isEditorTabsScrollerEventTarget(scroller)).toBe(true);
    expect(isEditorTabsScrollerEventTarget(tab)).toBe(false);
  });

  it('normalizes reorder indices after removal', () => {
    expect(
      normalizeEditorTabReorderIndex({
        index: 3,
        sourceIndex: 0,
        tabCount: 3,
      }),
    ).toBe(2);
    expect(
      normalizeEditorTabReorderIndex({
        index: 0,
        sourceIndex: 2,
        tabCount: 3,
      }),
    ).toBe(0);
  });

  it('resolves tab drop geometry', () => {
    expect(getEditorTabDropPosition(rectElement({ left: 0, width: 100 }), 20)).toBe('before');
    expect(getEditorTabDropPosition(rectElement({ left: 0, width: 100 }), 80)).toBe('after');
  });
});

function dataTransfer(values: Record<string, string>, types = Object.keys(values)) {
  return {
    getData: (type: string) => values[type] ?? '',
    types,
  } as Pick<DataTransfer, 'getData' | 'types'>;
}

function rectElement({ height = 20, left = 0, top = 0, width = 100 }: Partial<DOMRect> = {}) {
  return {
    getBoundingClientRect: () =>
      ({
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
      }) as DOMRect,
  };
}
