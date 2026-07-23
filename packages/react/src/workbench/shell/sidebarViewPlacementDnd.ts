/** Shared drag payload for moving a view container between sidebar slots (activity bar or action bar). */
export const WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE =
  'application/x-workbench-activity-bar-item';

const WORKBENCH_SIDEBAR_VIEW_PLACEMENT_TEXT_PREFIX = 'workbench-sidebar-view:';

let activeSidebarViewPlacementDragViewId: string | null = null;

const dragSessionEndListeners = new Set<() => void>();

function notifyWorkbenchSidebarViewPlacementDragSessionEnd(): void {
  for (const listener of dragSessionEndListeners) {
    listener();
  }
}

export function subscribeWorkbenchSidebarViewPlacementDragSessionEnd(
  listener: () => void,
): () => void {
  dragSessionEndListeners.add(listener);
  return () => {
    dragSessionEndListeners.delete(listener);
  };
}

export function resetWorkbenchSidebarViewPlacementDragSession(): void {
  activeSidebarViewPlacementDragViewId = null;
  notifyWorkbenchSidebarViewPlacementDragSessionEnd();
}

export function hasWorkbenchSidebarViewPlacementDrag(dataTransfer: DataTransfer): boolean {
  if (activeSidebarViewPlacementDragViewId !== null) {
    return true;
  }

  return [...dataTransfer.types].includes(WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE);
}

export function writeWorkbenchSidebarViewPlacementDrag(
  dataTransfer: DataTransfer,
  viewId: string,
): void {
  activeSidebarViewPlacementDragViewId = viewId;
  dataTransfer.effectAllowed = 'move';
  dataTransfer.setData(WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE, viewId);
  dataTransfer.setData('text/plain', `${WORKBENCH_SIDEBAR_VIEW_PLACEMENT_TEXT_PREFIX}${viewId}`);
}

export function readWorkbenchSidebarViewPlacementDrag(dataTransfer: DataTransfer): string {
  const payload = dataTransfer.getData(WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE);
  if (payload.length > 0) {
    return payload;
  }

  const plainTextPayload = dataTransfer.getData('text/plain');
  if (plainTextPayload.startsWith(WORKBENCH_SIDEBAR_VIEW_PLACEMENT_TEXT_PREFIX)) {
    return plainTextPayload.slice(WORKBENCH_SIDEBAR_VIEW_PLACEMENT_TEXT_PREFIX.length);
  }

  return activeSidebarViewPlacementDragViewId ?? '';
}
