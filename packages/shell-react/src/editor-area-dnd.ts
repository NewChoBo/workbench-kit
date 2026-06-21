import { WORKSPACE_EXPLORER_DRAG_DATA_TYPE } from '@workbench-kit/react/workbench/workspace/explorer';
import type { EditorTabDropPosition } from '@workbench-kit/react/primitives';
import {
  resolveEditorGroupDropSide,
  type EditorDropRect,
  type EditorGroupDropSide,
  type EditorTabState,
} from '@workbench-kit/workbench-core';

export const EDITOR_TAB_DRAG_DATA_TYPE = 'application/x-workbench-kit-editor-tab' as const;

const INTERNAL_EDITOR_AREA_DRAG_DATA_TYPES = [
  EDITOR_TAB_DRAG_DATA_TYPE,
  WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
] as const;

export interface EditorTabDragPayload {
  readonly groupId: string;
  readonly tabId: string;
}

export interface EditorTabDropTarget {
  readonly position: EditorTabDropPosition;
  readonly tabId: string;
  readonly targetIndex: number;
}

interface EditorDropTargetElement {
  getBoundingClientRect(): EditorDropRect;
}

export function readEditorTabDragPayload(
  dataTransfer: Pick<DataTransfer, 'getData'>,
): EditorTabDragPayload | null {
  try {
    const rawPayload = dataTransfer.getData(EDITOR_TAB_DRAG_DATA_TYPE);
    if (!rawPayload) {
      return null;
    }

    const payload = JSON.parse(rawPayload) as Partial<EditorTabDragPayload>;
    if (typeof payload.groupId !== 'string' || typeof payload.tabId !== 'string') {
      return null;
    }

    return {
      groupId: payload.groupId,
      tabId: payload.tabId,
    };
  } catch {
    return null;
  }
}

export function isInternalEditorAreaDrag(
  dataTransfer: Pick<DataTransfer, 'types'>,
  draggedTab: EditorTabDragPayload | null,
): boolean {
  return (
    draggedTab !== null ||
    INTERNAL_EDITOR_AREA_DRAG_DATA_TYPES.some((dataType) =>
      dataTransferHasType(dataTransfer, dataType),
    )
  );
}

export function dataTransferHasType(
  dataTransfer: Pick<DataTransfer, 'types'>,
  dataType: string,
): boolean {
  return Array.from(dataTransfer.types).includes(dataType);
}

export function isEditorTabsScrollerEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('.ui-editor-tabs__tab')) {
    return false;
  }

  return Boolean(target.closest('.ui-editor-tabs__scroller'));
}

export function resolveEditorTabDropTarget({
  clientX,
  draggedTab,
  groupId,
  preferredPosition,
  tabs,
  target,
  targetTabId,
}: {
  readonly clientX: number;
  readonly draggedTab: EditorTabDragPayload;
  readonly groupId: string;
  readonly preferredPosition?: EditorTabDropPosition | undefined;
  readonly tabs: readonly EditorTabState[];
  readonly target: EditorDropTargetElement;
  readonly targetTabId: string;
}): EditorTabDropTarget | null {
  const targetTabIndex = tabs.findIndex((tab) => tab.id === targetTabId);
  if (targetTabIndex < 0) {
    return null;
  }

  const position = preferredPosition ?? getEditorTabDropPosition(target, clientX);
  const targetIndex = position === 'after' ? targetTabIndex + 1 : targetTabIndex;
  if (isEditorTabMoveNoop({ draggedTab, groupId, tabs, targetIndex })) {
    return null;
  }

  return {
    position,
    tabId: targetTabId,
    targetIndex,
  };
}

export function resolveEditorTabStripDropTarget({
  draggedTab,
  groupId,
  tabs,
}: {
  readonly draggedTab: EditorTabDragPayload;
  readonly groupId: string;
  readonly tabs: readonly EditorTabState[];
}): EditorTabDropTarget | null {
  const lastTab = tabs[tabs.length - 1];
  if (!lastTab) {
    return null;
  }

  const targetIndex = tabs.length;
  if (isEditorTabMoveNoop({ draggedTab, groupId, tabs, targetIndex })) {
    return null;
  }

  return {
    position: 'after',
    tabId: lastTab.id,
    targetIndex,
  };
}

export function isEditorTabMoveNoop({
  draggedTab,
  groupId,
  tabs,
  targetIndex,
}: {
  readonly draggedTab: EditorTabDragPayload;
  readonly groupId: string;
  readonly tabs: readonly EditorTabState[];
  readonly targetIndex: number;
}): boolean {
  if (draggedTab.groupId !== groupId) {
    return false;
  }

  const sourceIndex = tabs.findIndex((tab) => tab.id === draggedTab.tabId);
  return sourceIndex >= 0 && (targetIndex === sourceIndex || targetIndex === sourceIndex + 1);
}

export function getEditorGroupDropSide(
  target: EditorDropTargetElement,
  clientX: number,
  clientY: number,
): EditorGroupDropSide {
  return resolveEditorGroupDropSide({
    point: { x: clientX, y: clientY },
    rect: getEditorDropRect(target),
  });
}

export function getEditorDropRect(target: EditorDropTargetElement): EditorDropRect {
  const rect = target.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function getEditorTabDropPosition(
  target: EditorDropTargetElement,
  clientX: number,
): EditorTabDropPosition {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0) {
    return 'after';
  }

  return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
}
