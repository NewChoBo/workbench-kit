import { useCallback, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';

import type { EditorTabDropPosition, EditorTabsProps } from '../primitives/WorkbenchEditor';
import {
  EDITOR_TAB_DRAG_DATA_TYPE,
  isEditorTabsScrollerEventTarget,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
  type EditorTabDragPayload,
} from './editor-tabs-dnd';

interface EditorTabLike {
  readonly id: string;
}

export interface UseEditorTabsStripDndOptions<TTab extends EditorTabLike> {
  readonly groupId: string;
  readonly onMoveTab: (input: { tabId: string; targetIndex: number }) => void;
  readonly onSelectTab?: ((tabId: string) => void) | undefined;
  readonly tabs: readonly TTab[];
}

export interface UseEditorTabsStripDndResult {
  readonly getTabDropPosition: (tabId: string) => EditorTabDropPosition | undefined;
  readonly editorTabsDndProps: Pick<
    EditorTabsProps,
    | 'draggableTabs'
    | 'onDragOver'
    | 'onDrop'
    | 'onTabDragEnd'
    | 'onTabDragLeave'
    | 'onTabDragOver'
    | 'onTabDragStart'
    | 'onTabDrop'
  >;
}

export function useEditorTabsStripDnd<TTab extends EditorTabLike>({
  groupId,
  onMoveTab,
  onSelectTab,
  tabs,
}: UseEditorTabsStripDndOptions<TTab>): UseEditorTabsStripDndResult {
  const draggedTabRef = useRef<EditorTabDragPayload | null>(null);
  const [tabDropTarget, setTabDropTarget] = useState<{
    position: EditorTabDropPosition;
    tabId: string;
  } | null>(null);

  const getDraggedTab = useCallback((event?: ReactDragEvent<HTMLElement>) => {
    if (draggedTabRef.current) {
      return draggedTabRef.current;
    }

    return event ? readEditorTabDragPayload(event.dataTransfer) : null;
  }, []);

  const clearDragFeedback = useCallback(() => {
    setTabDropTarget(null);
  }, []);

  const finishDrag = useCallback(() => {
    draggedTabRef.current = null;
    clearDragFeedback();
  }, [clearDragFeedback]);

  const handleTabDragStart = useCallback(
    (tabId: string, event: ReactDragEvent<HTMLElement>) => {
      draggedTabRef.current = { groupId, tabId };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(EDITOR_TAB_DRAG_DATA_TYPE, JSON.stringify({ groupId, tabId }));
      onSelectTab?.(tabId);
    },
    [groupId, onSelectTab],
  );

  const handleTabDragEnd = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  const handleTabDragOver = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedTab(event);
      if (!draggedTab) {
        setTabDropTarget(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (draggedTab.tabId === targetTabId) {
        event.dataTransfer.dropEffect = 'none';
        clearDragFeedback();
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      const dropTarget = resolveEditorTabDropTarget({
        clientX: event.clientX,
        draggedTab,
        groupId,
        tabs,
        target: event.currentTarget,
        targetTabId,
      });
      if (!dropTarget) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      setTabDropTarget({
        position: dropTarget.position,
        tabId: dropTarget.tabId,
      });
    },
    [clearDragFeedback, getDraggedTab, groupId, tabs],
  );

  const handleTabDrop = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedTab(event);
      if (!draggedTab) {
        setTabDropTarget(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (draggedTab.tabId === targetTabId) {
        finishDrag();
        return;
      }

      const dropTarget = resolveEditorTabDropTarget({
        clientX: event.clientX,
        draggedTab,
        groupId,
        preferredPosition:
          tabDropTarget?.tabId === targetTabId ? tabDropTarget.position : undefined,
        tabs,
        target: event.currentTarget,
        targetTabId,
      });
      if (!dropTarget) {
        finishDrag();
        return;
      }

      onMoveTab({
        tabId: draggedTab.tabId,
        targetIndex: dropTarget.targetIndex,
      });
      finishDrag();
    },
    [finishDrag, getDraggedTab, groupId, onMoveTab, tabDropTarget, tabs],
  );

  const handleTabDragLeave = useCallback(
    (targetTabId: string, event: ReactDragEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }

      setTabDropTarget((current) => (current?.tabId === targetTabId ? null : current));
    },
    [],
  );

  const handleTabStripDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedTab(event);
      if (!draggedTab || !isEditorTabsScrollerEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const dropTarget = resolveEditorTabStripDropTarget({
        draggedTab,
        groupId,
        tabs,
      });
      if (!dropTarget) {
        event.dataTransfer.dropEffect = 'none';
        setTabDropTarget(null);
        return;
      }

      event.dataTransfer.dropEffect = 'move';
      setTabDropTarget({
        position: dropTarget.position,
        tabId: dropTarget.tabId,
      });
    },
    [getDraggedTab, groupId, tabs],
  );

  const handleTabStripDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const draggedTab = getDraggedTab(event);
      if (!draggedTab || !isEditorTabsScrollerEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const dropTarget = resolveEditorTabStripDropTarget({
        draggedTab,
        groupId,
        tabs,
      });
      if (!dropTarget) {
        finishDrag();
        return;
      }

      onMoveTab({
        tabId: draggedTab.tabId,
        targetIndex: dropTarget.targetIndex,
      });
      finishDrag();
    },
    [finishDrag, getDraggedTab, groupId, onMoveTab, tabs],
  );

  const getTabDropPosition = useCallback(
    (tabId: string): EditorTabDropPosition | undefined =>
      tabDropTarget?.tabId === tabId ? tabDropTarget.position : undefined,
    [tabDropTarget],
  );

  const editorTabsDndProps = useMemo(
    (): UseEditorTabsStripDndResult['editorTabsDndProps'] => ({
      draggableTabs: true,
      onDragOver: handleTabStripDragOver,
      onDrop: handleTabStripDrop,
      onTabDragEnd: handleTabDragEnd,
      onTabDragLeave: handleTabDragLeave,
      onTabDragOver: handleTabDragOver,
      onTabDragStart: handleTabDragStart,
      onTabDrop: handleTabDrop,
    }),
    [
      handleTabDragEnd,
      handleTabDragLeave,
      handleTabDragOver,
      handleTabDragStart,
      handleTabDrop,
      handleTabStripDragOver,
      handleTabStripDrop,
    ],
  );

  return {
    editorTabsDndProps,
    getTabDropPosition,
  };
}
