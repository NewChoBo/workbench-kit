import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';

import {
  getActivityBarDropPosition,
  reorderActivityBarItems,
  type ActivityBarDropPosition,
  type ActivityBarOrientation,
} from './activityBarOrder';
import {
  hasWorkbenchSidebarViewPlacementDrag,
  readWorkbenchSidebarViewPlacementDrag,
  resetWorkbenchSidebarViewPlacementDragSession,
  subscribeWorkbenchSidebarViewPlacementDragSessionEnd,
  writeWorkbenchSidebarViewPlacementDrag,
} from './sidebarViewPlacementDnd';

export interface WorkbenchSidebarActionBarDropTarget {
  readonly itemId: string;
  readonly position: ActivityBarDropPosition;
}

export interface UseWorkbenchSidebarActionBarDndOptions {
  readonly itemIds: readonly string[];
  readonly onReorder?: (itemIds: string[]) => void;
  readonly orientation?: ActivityBarOrientation;
  readonly placementDraggable?: boolean;
  readonly reorderable?: boolean;
  /** Prevents nested placement drop zones from handling reorder drag events. Default: true */
  readonly stopPropagationOnReorder?: boolean;
}

export interface WorkbenchSidebarActionBarItemDragHandlers {
  readonly draggable: true;
  readonly onDragEnd: () => void;
  readonly onDragLeave: () => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface UseWorkbenchSidebarActionBarDndResult {
  readonly clearDragState: () => void;
  readonly draggingItemId: string | null;
  readonly dropTarget: WorkbenchSidebarActionBarDropTarget | null;
  readonly getDropPosition: (itemId: string) => ActivityBarDropPosition | undefined;
  readonly getItemDragHandlers: (
    itemId: string,
    options?: { readonly disabled?: boolean | undefined },
  ) => WorkbenchSidebarActionBarItemDragHandlers | null;
}

export function useWorkbenchSidebarActionBarDnd({
  itemIds,
  onReorder,
  orientation = 'vertical',
  placementDraggable = false,
  reorderable = false,
  stopPropagationOnReorder = true,
}: UseWorkbenchSidebarActionBarDndOptions): UseWorkbenchSidebarActionBarDndResult {
  const draggingItemIdRef = useRef<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<WorkbenchSidebarActionBarDropTarget | null>(null);

  const clearDragState = useCallback((): void => {
    draggingItemIdRef.current = null;
    setDraggingItemId(null);
    setDropTarget(null);
    resetWorkbenchSidebarViewPlacementDragSession();
  }, []);

  useEffect(() => {
    const clearLocalDragVisualState = (): void => {
      draggingItemIdRef.current = null;
      setDraggingItemId(null);
      setDropTarget(null);
    };

    document.addEventListener('drop', clearLocalDragVisualState, true);
    const unsubscribe =
      subscribeWorkbenchSidebarViewPlacementDragSessionEnd(clearLocalDragVisualState);

    return () => {
      document.removeEventListener('drop', clearLocalDragVisualState, true);
      unsubscribe();
    };
  }, []);

  const isLocalReorderSource = useCallback(
    (sourceId: string): boolean => itemIds.includes(sourceId),
    [itemIds],
  );

  const resolveDragSourceId = useCallback(
    (dataTransfer: DataTransfer): string =>
      draggingItemIdRef.current ?? readWorkbenchSidebarViewPlacementDrag(dataTransfer),
    [],
  );

  const reorderItems = useCallback(
    (sourceId: string, targetId: string, position: ActivityBarDropPosition): void => {
      if (onReorder === undefined) {
        return;
      }

      const nextItemIds = reorderActivityBarItems([...itemIds], sourceId, targetId, position);
      if (nextItemIds !== undefined) {
        onReorder([...nextItemIds]);
      }
    },
    [itemIds, onReorder],
  );

  const getDropPosition = useCallback(
    (itemId: string): ActivityBarDropPosition | undefined =>
      dropTarget?.itemId === itemId ? dropTarget.position : undefined,
    [dropTarget],
  );

  const getItemDragHandlers = useCallback(
    (
      itemId: string,
      options?: { readonly disabled?: boolean | undefined },
    ): WorkbenchSidebarActionBarItemDragHandlers | null => {
      const disabled = options?.disabled ?? false;
      const isItemReorderable = reorderable && !disabled;
      const isItemPlacementDraggable = placementDraggable && !disabled;

      if (!isItemReorderable && !isItemPlacementDraggable) {
        return null;
      }

      return {
        draggable: true,
        onDragEnd: clearDragState,
        onDragLeave: () => {
          if (dropTarget?.itemId === itemId) {
            setDropTarget(null);
          }
        },
        onDragOver: (event: DragEvent<HTMLElement>) => {
          if (!reorderable || !hasWorkbenchSidebarViewPlacementDrag(event.dataTransfer)) {
            return;
          }

          const sourceId = resolveDragSourceId(event.dataTransfer);
          if (sourceId.length === 0 || !isLocalReorderSource(sourceId) || sourceId === itemId) {
            return;
          }

          event.preventDefault();
          if (stopPropagationOnReorder) {
            event.stopPropagation();
          }
          event.dataTransfer.dropEffect = 'move';

          const position = getActivityBarDropPosition(
            event.currentTarget,
            orientation === 'horizontal' ? event.clientX : event.clientY,
            orientation,
          );

          setDropTarget((current) =>
            current?.itemId === itemId && current.position === position
              ? current
              : { itemId, position },
          );
        },
        onDragStart: (event: DragEvent<HTMLElement>) => {
          if ((!placementDraggable && !reorderable) || disabled) {
            event.preventDefault();
            return;
          }

          writeWorkbenchSidebarViewPlacementDrag(event.dataTransfer, itemId);
          draggingItemIdRef.current = itemId;
          setDraggingItemId(itemId);
        },
        onDrop: (event: DragEvent<HTMLElement>) => {
          if (!reorderable || !hasWorkbenchSidebarViewPlacementDrag(event.dataTransfer)) {
            return;
          }

          const sourceId = resolveDragSourceId(event.dataTransfer);
          if (sourceId.length === 0 || !isLocalReorderSource(sourceId)) {
            return;
          }

          event.preventDefault();
          if (stopPropagationOnReorder) {
            event.stopPropagation();
          }

          reorderItems(
            sourceId,
            itemId,
            getActivityBarDropPosition(
              event.currentTarget,
              orientation === 'horizontal' ? event.clientX : event.clientY,
              orientation,
            ),
          );
          clearDragState();
        },
      };
    },
    [
      clearDragState,
      dropTarget?.itemId,
      isLocalReorderSource,
      orientation,
      placementDraggable,
      reorderItems,
      reorderable,
      resolveDragSourceId,
      stopPropagationOnReorder,
    ],
  );

  return {
    clearDragState,
    draggingItemId,
    dropTarget,
    getDropPosition,
    getItemDragHandlers,
  };
}
