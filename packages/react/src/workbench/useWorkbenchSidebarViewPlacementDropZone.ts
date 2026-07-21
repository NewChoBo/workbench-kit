import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
} from 'react';

import {
  hasWorkbenchSidebarViewPlacementDrag,
  readWorkbenchSidebarViewPlacementDrag,
  resetWorkbenchSidebarViewPlacementDragSession,
  subscribeWorkbenchSidebarViewPlacementDragSessionEnd,
} from './sidebarViewPlacementDnd';

export type WorkbenchSidebarViewPlacementDropZoneProps = HTMLAttributes<HTMLElement> & {
  readonly 'data-wb-sidebar-placement-drop-zone'?: string | undefined;
  readonly 'data-wb-sidebar-placement-drop-zone-active'?: 'true' | undefined;
};

export interface UseWorkbenchSidebarViewPlacementDropZoneOptions {
  readonly acceptViewForDrop?: ((viewId: string) => boolean) | undefined;
  readonly onDropView: (viewId: string) => void;
  readonly zoneId?: string | undefined;
}

function chainDragHandler<E extends DragEvent<HTMLElement>>(
  primary: ((event: E) => void) | undefined,
  secondary: ((event: E) => void) | undefined,
): ((event: E) => void) | undefined {
  if (primary === undefined) {
    return secondary;
  }

  if (secondary === undefined) {
    return primary;
  }

  return (event: E): void => {
    secondary(event);
    if (!event.defaultPrevented) {
      primary(event);
    }
  };
}

export function mergeWorkbenchSidebarViewPlacementDropZoneProps(
  dropZoneProps: WorkbenchSidebarViewPlacementDropZoneProps,
  hostProps: HTMLAttributes<HTMLElement>,
): HTMLAttributes<HTMLElement> {
  return {
    ...hostProps,
    ...dropZoneProps,
    onDragEnter: chainDragHandler(hostProps.onDragEnter, dropZoneProps.onDragEnter),
    onDragEnterCapture: chainDragHandler(
      hostProps.onDragEnterCapture,
      dropZoneProps.onDragEnterCapture,
    ),
    onDragLeave: chainDragHandler(hostProps.onDragLeave, dropZoneProps.onDragLeave),
    onDragOver: chainDragHandler(hostProps.onDragOver, dropZoneProps.onDragOver),
    onDragOverCapture: chainDragHandler(
      hostProps.onDragOverCapture,
      dropZoneProps.onDragOverCapture,
    ),
    onDrop: chainDragHandler(hostProps.onDrop, dropZoneProps.onDrop),
    onDropCapture: chainDragHandler(hostProps.onDropCapture, dropZoneProps.onDropCapture),
  };
}

export function useWorkbenchSidebarViewPlacementDropZone({
  acceptViewForDrop,
  onDropView,
  zoneId,
}: UseWorkbenchSidebarViewPlacementDropZoneOptions): WorkbenchSidebarViewPlacementDropZoneProps {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const resetDragOver = useCallback((): void => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
  }, []);

  useEffect(() => {
    const handleDragEnd = (): void => {
      resetDragOver();
      resetWorkbenchSidebarViewPlacementDragSession();
    };

    const handleDocumentDrop = (): void => {
      resetDragOver();
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDocumentDrop, true);
    const unsubscribe = subscribeWorkbenchSidebarViewPlacementDragSessionEnd(resetDragOver);

    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDocumentDrop, true);
      unsubscribe();
    };
  }, [resetDragOver]);

  const shouldAcceptDrag = useCallback(
    (dataTransfer: DataTransfer): boolean => {
      if (!hasWorkbenchSidebarViewPlacementDrag(dataTransfer)) {
        return false;
      }

      const viewId = readWorkbenchSidebarViewPlacementDrag(dataTransfer);
      if (viewId.length === 0) {
        return false;
      }

      return acceptViewForDrop?.(viewId) ?? true;
    },
    [acceptViewForDrop],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      if (!shouldAcceptDrag(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    [shouldAcceptDrag],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      if (!shouldAcceptDrag(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    },
    [shouldAcceptDrag],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>): void => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      resetDragOver();

      const viewId = readWorkbenchSidebarViewPlacementDrag(event.dataTransfer);
      if (viewId.length === 0) {
        resetWorkbenchSidebarViewPlacementDragSession();
        return;
      }

      if (acceptViewForDrop !== undefined && !acceptViewForDrop(viewId)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onDropView(viewId);
      resetWorkbenchSidebarViewPlacementDragSession();
    },
    [acceptViewForDrop, onDropView, resetDragOver],
  );

  return {
    ...(zoneId !== undefined ? { 'data-wb-sidebar-placement-drop-zone': zoneId } : {}),
    ...(isDragOver ? { 'data-wb-sidebar-placement-drop-zone-active': 'true' } : {}),
    onDragEnter: handleDragEnter,
    onDragEnterCapture: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDragOverCapture: handleDragOver,
    onDrop: handleDrop,
    onDropCapture: handleDrop,
  };
}
