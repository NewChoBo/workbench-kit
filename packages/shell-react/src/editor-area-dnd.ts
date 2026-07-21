import { WORKSPACE_EXPLORER_DRAG_DATA_TYPE } from '@workbench-kit/react/workbench/workspace/explorer';
import {
  resolveEditorGroupDropSide,
  type EditorDropRect,
  type EditorGroupDropSide,
} from '@workbench-kit/workbench-core';

export {
  EDITOR_TAB_DRAG_DATA_TYPE,
  getEditorTabDropPosition,
  isEditorTabMoveNoop,
  isEditorTabsScrollerEventTarget,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
} from '@workbench-kit/react';

export type { EditorTabDragPayload, EditorTabDropTarget } from '@workbench-kit/react';

const INTERNAL_EDITOR_AREA_DRAG_DATA_TYPES = [
  'application/x-workbench-kit-editor-tab',
  WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
] as const;

interface EditorDropTargetElement {
  getBoundingClientRect(): EditorDropRect;
}

export function isInternalEditorAreaDrag(
  dataTransfer: Pick<DataTransfer, 'types'>,
  draggedTab: { readonly groupId: string; readonly tabId: string } | null,
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
