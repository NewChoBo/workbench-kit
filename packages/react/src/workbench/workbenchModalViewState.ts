import { useCallback, useEffect, useState } from 'react';

export interface UseWorkbenchModalViewStateOptions<TViewId extends string> {
  readonly activeViewId: TViewId;
  readonly fallbackViewId: TViewId;
  readonly modalViewId: TViewId;
  readonly openView: (viewId: TViewId) => void;
}

export interface WorkbenchModalViewState<TViewId extends string> {
  readonly closeModalView: () => void;
  readonly isModalViewActive: boolean;
  readonly isModalViewOpen: boolean;
  readonly openModalView: () => void;
  readonly viewId: TViewId;
}

export function useWorkbenchModalViewState<TViewId extends string>({
  activeViewId,
  fallbackViewId,
  modalViewId,
  openView,
}: UseWorkbenchModalViewStateOptions<TViewId>): WorkbenchModalViewState<TViewId> {
  const isModalViewActive = activeViewId === modalViewId;
  const [isModalViewOpen, setModalViewOpen] = useState(isModalViewActive);

  useEffect(() => {
    if (isModalViewActive) {
      setModalViewOpen(true);
    }
  }, [isModalViewActive]);

  const openModalView = useCallback((): void => {
    setModalViewOpen(true);
  }, []);

  const closeModalView = useCallback((): void => {
    setModalViewOpen(false);

    if (isModalViewActive) {
      openView(fallbackViewId);
    }
  }, [fallbackViewId, isModalViewActive, openView]);

  return {
    closeModalView,
    isModalViewActive,
    isModalViewOpen,
    openModalView,
    viewId: modalViewId,
  };
}
