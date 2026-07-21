import {
  resolveWorkbenchSidebarActivityViewId,
  resolveWorkbenchSidebarSlotContent,
  type WorkbenchSidebarSlotId,
} from './workbench-sidebar-slot.js';

export interface WorkbenchShellNavigateModalTarget<TViewId extends string> {
  readonly openModalView: () => void;
  readonly viewId: TViewId;
}

export interface WorkbenchShellNavigateSlotRouter<TDockableViewId extends string> {
  readonly primaryViewId: TDockableViewId;
  readonly secondaryViewId: TDockableViewId;
  readonly selectPrimaryView: (viewId: TDockableViewId) => void;
  readonly selectSecondaryView: (viewId: TDockableViewId) => void;
}

export interface CreateWorkbenchShellNavigateInput<
  TViewId extends string,
  TDockableViewId extends string,
> {
  readonly currentView: TViewId;
  readonly ensureSlotVisible: (slot: WorkbenchSidebarSlotId) => void;
  readonly isDockableSidebarViewId: (viewId: string) => viewId is TDockableViewId;
  readonly isSidebarOnlyViewId?: ((viewId: TDockableViewId) => boolean) | undefined;
  readonly isViewId?: ((viewId: string) => viewId is TViewId) | undefined;
  readonly modalTargets?: ReadonlyArray<WorkbenchShellNavigateModalTarget<TViewId>> | undefined;
  readonly placements: Readonly<Record<TDockableViewId, WorkbenchSidebarSlotId>>;
  readonly resolveViewFocus?:
    | ((input: {
        currentView: TViewId;
        slotFocusedViewId: TDockableViewId;
        viewId: TDockableViewId;
      }) => boolean)
    | undefined;
  readonly slotRouter: WorkbenchShellNavigateSlotRouter<TDockableViewId>;
  readonly switchView: (viewId: TViewId) => void;
  readonly toggleSlot: (slot: WorkbenchSidebarSlotId) => void;
}

export function resolveWorkbenchShellViewFocus<
  TViewId extends string,
  TDockableViewId extends string,
>({
  currentView,
  isSidebarOnlyViewId,
  slotFocusedViewId,
  viewId,
}: {
  readonly currentView: TViewId;
  readonly isSidebarOnlyViewId?: ((viewId: TDockableViewId) => boolean) | undefined;
  readonly slotFocusedViewId: TDockableViewId;
  readonly viewId: TDockableViewId;
}): boolean {
  if (isSidebarOnlyViewId?.(viewId) === true) {
    return slotFocusedViewId === viewId;
  }

  return (currentView as string) === viewId && slotFocusedViewId === viewId;
}

/**
 * VS Code-aligned activity bar navigation: modal targets, slot focus, and re-click toggle.
 */
export function createWorkbenchShellNavigate<
  TViewId extends string,
  TDockableViewId extends string,
>({
  currentView,
  ensureSlotVisible,
  isDockableSidebarViewId,
  isSidebarOnlyViewId,
  isViewId,
  modalTargets = [],
  placements,
  resolveViewFocus,
  slotRouter,
  switchView,
  toggleSlot,
}: CreateWorkbenchShellNavigateInput<TViewId, TDockableViewId>): (viewId: string) => void {
  const modalTargetByViewId = new Map(modalTargets.map((target) => [target.viewId, target]));

  const resolveFocus =
    resolveViewFocus ??
    ((input: {
      currentView: TViewId;
      slotFocusedViewId: TDockableViewId;
      viewId: TDockableViewId;
    }) =>
      resolveWorkbenchShellViewFocus({
        currentView: input.currentView,
        isSidebarOnlyViewId,
        slotFocusedViewId: input.slotFocusedViewId,
        viewId: input.viewId,
      }));

  return (viewId: string): void => {
    const modalTarget = modalTargetByViewId.get(viewId as TViewId);
    if (modalTarget !== undefined) {
      modalTarget.openModalView();
      return;
    }

    if (!isDockableSidebarViewId(viewId)) {
      if (isViewId?.(viewId) === true) {
        switchView(viewId);
      }
      return;
    }

    const dockableViewId = viewId;
    const slot = placements[dockableViewId];
    const slotFocusedViewId =
      slot === 'primary' ? slotRouter.primaryViewId : slotRouter.secondaryViewId;
    const isFocused = resolveFocus({
      currentView,
      slotFocusedViewId,
      viewId: dockableViewId,
    });

    if (isFocused) {
      toggleSlot(slot);
      return;
    }

    if (isSidebarOnlyViewId?.(dockableViewId) !== true && isViewId?.(dockableViewId) === true) {
      switchView(dockableViewId);
    }

    if (slot === 'primary') {
      slotRouter.selectPrimaryView(dockableViewId);
    } else {
      slotRouter.selectSecondaryView(dockableViewId);
    }

    ensureSlotVisible(slot);
  };
}

export interface ResolveWorkbenchSidebarSlotDisplayedViewIdInput<
  TViewId extends string,
  TDockableViewId extends string,
  TActivityViewId extends TViewId & TDockableViewId,
> {
  readonly companionViewIds?: ReadonlySet<TDockableViewId> | undefined;
  readonly currentActivityViewId: TViewId;
  readonly defaultActivityViewId: TActivityViewId;
  readonly isActivityViewId: (viewId: TViewId) => viewId is TActivityViewId;
  readonly isAuxiliarySidebarVisible: boolean;
  readonly placements: Readonly<Record<TDockableViewId, WorkbenchSidebarSlotId>>;
  readonly primarySlotFocusedViewId: TDockableViewId;
  readonly registeredViewIds: readonly TDockableViewId[];
  readonly secondarySlotFocusedViewId: TDockableViewId;
  readonly slot: WorkbenchSidebarSlotId;
}

/** Resolves the visible view container for a primary or secondary sidebar slot. */
export function resolveWorkbenchSidebarSlotDisplayedViewId<
  TViewId extends string,
  TDockableViewId extends string,
  TActivityViewId extends TViewId & TDockableViewId,
>(
  input: ResolveWorkbenchSidebarSlotDisplayedViewIdInput<TViewId, TDockableViewId, TActivityViewId>,
): TDockableViewId | null {
  const content = resolveWorkbenchSidebarSlotContent<TDockableViewId>({
    companionViewIds: input.companionViewIds,
    currentActivityViewId: resolveWorkbenchSidebarActivityViewId(
      input.currentActivityViewId,
      input.isActivityViewId,
      input.defaultActivityViewId,
    ),
    isAuxiliarySidebarVisible: input.isAuxiliarySidebarVisible,
    placements: input.placements,
    registeredViewIds: input.registeredViewIds,
    slot: input.slot,
    slotFocusedViewId:
      input.slot === 'primary' ? input.primarySlotFocusedViewId : input.secondarySlotFocusedViewId,
  });

  return content.kind === 'view' ? content.viewId : null;
}
