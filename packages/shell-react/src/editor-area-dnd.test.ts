/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { WORKSPACE_EXPLORER_DRAG_DATA_TYPE } from '@workbench-kit/react/workbench/workspace/explorer';
import type { EditorTabState } from '@workbench-kit/workbench-core';

import {
  EDITOR_TAB_DRAG_DATA_TYPE,
  dataTransferHasType,
  getEditorGroupDropSide,
  getEditorTabDropPosition,
  isEditorTabsScrollerEventTarget,
  isEditorTabMoveNoop,
  isInternalEditorAreaDrag,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
} from './editor-area-dnd.js';

const tabs: EditorTabState[] = [createTab('first'), createTab('second'), createTab('third')];

describe('editor-area-dnd', () => {
  it('reads editor tab drag payloads from data transfer', () => {
    expect(
      readEditorTabDragPayload(
        dataTransfer({
          [EDITOR_TAB_DRAG_DATA_TYPE]: JSON.stringify({ groupId: 'main', tabId: 'first' }),
        }),
      ),
    ).toEqual({ groupId: 'main', tabId: 'first' });
    expect(
      readEditorTabDragPayload(dataTransfer({ [EDITOR_TAB_DRAG_DATA_TYPE]: '{}' })),
    ).toBeNull();
  });

  it('detects internal editor area drags', () => {
    expect(
      isInternalEditorAreaDrag(dataTransfer({}, [WORKSPACE_EXPLORER_DRAG_DATA_TYPE]), null),
    ).toBe(true);
    expect(
      isInternalEditorAreaDrag(dataTransfer({}, []), { groupId: 'main', tabId: 'first' }),
    ).toBe(true);
    expect(isInternalEditorAreaDrag(dataTransfer({}, []), null)).toBe(false);
    expect(
      dataTransferHasType(dataTransfer({}, [EDITOR_TAB_DRAG_DATA_TYPE]), EDITOR_TAB_DRAG_DATA_TYPE),
    ).toBe(true);
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

  it('resolves tab and group drop geometry', () => {
    expect(getEditorTabDropPosition(rectElement({ left: 0, width: 100 }), 20)).toBe('before');
    expect(getEditorTabDropPosition(rectElement({ left: 0, width: 100 }), 80)).toBe('after');
    expect(
      getEditorGroupDropSide(rectElement({ height: 100, left: 0, top: 0, width: 100 }), 50, 50),
    ).toBe('center');
  });
});

function createTab(id: string): EditorTabState {
  return {
    dirty: false,
    editorId: 'workbench-kit.builtin.editor.text',
    id,
    pinned: true,
    preview: false,
    resourceUri: `workspace://file/${id}.ts`,
  };
}

function dataTransfer(values: Record<string, string>, types = Object.keys(values)) {
  return {
    getData: (type: string) => values[type] ?? '',
    types,
  } as Pick<DataTransfer, 'getData' | 'types'>;
}

function rectElement({
  bottom,
  height = 20,
  left = 0,
  right,
  top = 0,
  width = 100,
}: Partial<DOMRect> = {}) {
  return {
    getBoundingClientRect: () =>
      ({
        bottom: bottom ?? top + height,
        height,
        left,
        right: right ?? left + width,
        top,
        width,
      }) as DOMRect,
  };
}
