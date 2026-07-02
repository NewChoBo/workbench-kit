import type { EditorTabDropPosition } from '../primitives/WorkbenchEditor';

export const EDITOR_TAB_DRAG_DATA_TYPE = 'application/x-workbench-kit-editor-tab' as const;

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
  getBoundingClientRect(): Pick<DOMRect, 'left' | 'width'>;
}

interface EditorTabLike {
  readonly id: string;
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

export function isEditorTabsScrollerEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('.ui-editor-tabs__tab')) {
    return false;
  }

  return Boolean(target.closest('.ui-editor-tabs__scroller'));
}

export function resolveEditorTabDropTarget<TTab extends EditorTabLike>({
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
  readonly tabs: readonly TTab[];
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

export function resolveEditorTabStripDropTarget<TTab extends EditorTabLike>({
  draggedTab,
  groupId,
  tabs,
}: {
  readonly draggedTab: EditorTabDragPayload;
  readonly groupId: string;
  readonly tabs: readonly TTab[];
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

export function isEditorTabMoveNoop<TTab extends EditorTabLike>({
  draggedTab,
  groupId,
  tabs,
  targetIndex,
}: {
  readonly draggedTab: EditorTabDragPayload;
  readonly groupId: string;
  readonly tabs: readonly TTab[];
  readonly targetIndex: number;
}): boolean {
  if (draggedTab.groupId !== groupId) {
    return false;
  }

  const sourceIndex = tabs.findIndex((tab) => tab.id === draggedTab.tabId);
  return sourceIndex >= 0 && (targetIndex === sourceIndex || targetIndex === sourceIndex + 1);
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

export function normalizeEditorTabReorderIndex({
  index,
  sourceIndex,
  tabCount,
}: {
  index: number;
  sourceIndex: number;
  tabCount: number;
}): number {
  const clampedIndex = Math.max(0, Math.min(index, tabCount));
  return clampedIndex > sourceIndex ? clampedIndex - 1 : clampedIndex;
}
