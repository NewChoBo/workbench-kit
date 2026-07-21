export type WorkbenchSidebarSlotId = 'primary' | 'secondary';

export interface WorkbenchSidebarSlotViewContent<TViewId extends string> {
  readonly kind: 'view';
  readonly viewId: TViewId;
}

export type WorkbenchSidebarSlotContent<TViewId extends string> =
  WorkbenchSidebarSlotViewContent<TViewId> | { readonly kind: 'empty' };

export function oppositeWorkbenchSidebarSlot(slot: WorkbenchSidebarSlotId): WorkbenchSidebarSlotId {
  return slot === 'primary' ? 'secondary' : 'primary';
}

function isViewAssignedToSlot<TViewId extends string>(
  viewId: TViewId,
  slot: WorkbenchSidebarSlotId,
  placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>,
): boolean {
  return placements[viewId] === slot;
}

/**
 * Lists view container ids assigned to a sidebar layout region, preserving registration order.
 */
export function listWorkbenchSidebarSlotViewIds<TViewId extends string>(
  slot: WorkbenchSidebarSlotId,
  placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>,
  registeredViewIds: readonly TViewId[],
): readonly TViewId[] {
  return registeredViewIds.filter((viewId) => isViewAssignedToSlot(viewId, slot, placements));
}

export interface ResolveWorkbenchSidebarSlotActiveViewIdInput<TViewId extends string> {
  readonly companionViewIds?: ReadonlySet<TViewId> | undefined;
  readonly currentActivityViewId: TViewId;
  readonly focusedCompanionViewId?: TViewId | null | undefined;
  readonly isAuxiliarySidebarVisible?: boolean | undefined;
  readonly placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>;
  readonly registeredViewIds: readonly TViewId[];
  readonly slot: WorkbenchSidebarSlotId;
  readonly slotFocusedViewId?: TViewId | null | undefined;
}

/**
 * Resolves the active view container for a sidebar layout region.
 * Per-slot tab focus wins, then the routed activity view, then companion fallbacks.
 */
export function resolveWorkbenchSidebarSlotActiveViewId<TViewId extends string>(
  input: ResolveWorkbenchSidebarSlotActiveViewIdInput<TViewId>,
): TViewId | null {
  const {
    companionViewIds,
    currentActivityViewId,
    focusedCompanionViewId = null,
    isAuxiliarySidebarVisible = false,
    placements,
    registeredViewIds,
    slot,
    slotFocusedViewId = null,
  } = input;

  const slotViewIds = listWorkbenchSidebarSlotViewIds(slot, placements, registeredViewIds);
  if (slotViewIds.length === 0) {
    return null;
  }

  if (slotFocusedViewId !== null && isViewAssignedToSlot(slotFocusedViewId, slot, placements)) {
    return slotFocusedViewId;
  }

  if (
    companionViewIds !== undefined &&
    slot === 'primary' &&
    focusedCompanionViewId !== null &&
    companionViewIds.has(focusedCompanionViewId) &&
    isViewAssignedToSlot(focusedCompanionViewId, slot, placements)
  ) {
    return focusedCompanionViewId;
  }

  if (isViewAssignedToSlot(currentActivityViewId, slot, placements)) {
    return currentActivityViewId;
  }

  if (companionViewIds !== undefined && slot === 'secondary' && isAuxiliarySidebarVisible) {
    for (const viewId of registeredViewIds) {
      if (!companionViewIds.has(viewId)) {
        continue;
      }

      if (isViewAssignedToSlot(viewId, slot, placements)) {
        return viewId;
      }
    }
  }

  return null;
}

export interface ResolveWorkbenchSidebarSlotContentInput<TViewId extends string> {
  readonly companionViewIds?: ReadonlySet<TViewId> | undefined;
  readonly currentActivityViewId: TViewId;
  readonly focusedCompanionViewId?: TViewId | null | undefined;
  readonly isAuxiliarySidebarVisible: boolean;
  readonly placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>;
  readonly registeredViewIds?: readonly TViewId[] | undefined;
  readonly slot: WorkbenchSidebarSlotId;
  readonly slotFocusedViewId?: TViewId | null | undefined;
}

/**
 * Resolves which view occupies a sidebar layout region (VS Code Primary/Secondary Side Bar).
 * Activity views and companion views (e.g. chat) can appear in different slots simultaneously.
 */
export function resolveWorkbenchSidebarSlotContent<TViewId extends string>(
  input: ResolveWorkbenchSidebarSlotContentInput<TViewId>,
): WorkbenchSidebarSlotContent<TViewId> {
  const registeredViewIds = input.registeredViewIds ?? (Object.keys(input.placements) as TViewId[]);

  const activeViewId = resolveWorkbenchSidebarSlotActiveViewId({
    companionViewIds: input.companionViewIds,
    currentActivityViewId: input.currentActivityViewId,
    focusedCompanionViewId: input.focusedCompanionViewId,
    isAuxiliarySidebarVisible: input.isAuxiliarySidebarVisible,
    placements: input.placements,
    registeredViewIds,
    slot: input.slot,
    slotFocusedViewId: input.slotFocusedViewId,
  });

  if (activeViewId === null) {
    return { kind: 'empty' };
  }

  if (input.slot === 'secondary' && !input.isAuxiliarySidebarVisible) {
    return { kind: 'empty' };
  }

  return { kind: 'view', viewId: activeViewId };
}

/**
 * VS Code pattern: primary slot uses Activity Bar for view switching;
 * secondary/auxiliary slot uses a horizontal tab strip when it hosts views.
 */
export function shouldShowWorkbenchSidebarSlotActionBar(
  slot: WorkbenchSidebarSlotId,
  slotViewCount: number,
): boolean {
  if (slot === 'primary') {
    return false;
  }

  return slotViewCount > 0;
}

/**
 * Coerces a slot-focused view id when placements change or focus is stale.
 */
export function coerceWorkbenchSidebarSlotViewId<TViewId extends string>(
  slot: WorkbenchSidebarSlotId,
  viewId: TViewId,
  placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>,
  registeredViewIds: readonly TViewId[],
  fallbackViewId: TViewId,
): TViewId {
  const slotViewIds = listWorkbenchSidebarSlotViewIds(slot, placements, registeredViewIds);

  if (slotViewIds.includes(viewId)) {
    return viewId;
  }

  return slotViewIds[0] ?? fallbackViewId;
}

/**
 * Maps a routed editor/activity view id to the dockable activity view used by sidebar slot resolution.
 */
export function resolveWorkbenchSidebarActivityViewId<
  TViewId extends string,
  TActivityViewId extends TViewId,
>(
  currentViewId: TViewId,
  isActivityViewId: (viewId: TViewId) => viewId is TActivityViewId,
  fallbackActivityViewId: TActivityViewId,
): TActivityViewId {
  return isActivityViewId(currentViewId) ? currentViewId : fallbackActivityViewId;
}

export interface ResolveWorkbenchSidebarSlotViewIdAfterMoveInput<
  TViewId extends string,
  TActivityViewId extends TViewId = TViewId,
> {
  readonly activityViewId: TActivityViewId;
  readonly isActivityViewId: (viewId: TViewId) => viewId is TActivityViewId;
  readonly movedViewId: TViewId;
  readonly nextPlacements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>;
  readonly registeredViewIds: readonly TViewId[];
  readonly sourceSlot: WorkbenchSidebarSlotId;
  readonly targetSlot: WorkbenchSidebarSlotId;
}

export interface ResolveWorkbenchSidebarSlotViewIdAfterMoveResult<
  TViewId extends string,
  TActivityViewId extends TViewId = TViewId,
> {
  readonly nextActivityViewId: TActivityViewId | null;
  readonly nextPrimarySlotFocusedViewId: TViewId | null;
  readonly nextSecondarySlotFocusedViewId: TViewId | null;
}

/**
 * Updates activity routing and per-slot tab focus after a view moves between sidebar regions.
 */
export function resolveWorkbenchSidebarSlotViewIdAfterMove<
  TViewId extends string,
  TActivityViewId extends TViewId = TViewId,
>(
  input: ResolveWorkbenchSidebarSlotViewIdAfterMoveInput<TViewId, TActivityViewId>,
): ResolveWorkbenchSidebarSlotViewIdAfterMoveResult<TViewId, TActivityViewId> {
  const secondaryViews = listWorkbenchSidebarSlotViewIds(
    'secondary',
    input.nextPlacements,
    input.registeredViewIds,
  );
  const primaryViews = listWorkbenchSidebarSlotViewIds(
    'primary',
    input.nextPlacements,
    input.registeredViewIds,
  );

  let nextActivityViewId: TActivityViewId | null = null;
  if (input.targetSlot === 'primary' && input.isActivityViewId(input.movedViewId)) {
    nextActivityViewId = input.movedViewId;
  } else if (
    input.sourceSlot === 'primary' &&
    input.isActivityViewId(input.activityViewId) &&
    input.activityViewId === input.movedViewId
  ) {
    const fallbackActivityViewId = primaryViews.find((viewId) => input.isActivityViewId(viewId));
    if (fallbackActivityViewId !== undefined) {
      nextActivityViewId = fallbackActivityViewId;
    }
  }

  let nextPrimarySlotFocusedViewId: TViewId | null = null;
  if (input.targetSlot === 'primary') {
    nextPrimarySlotFocusedViewId = input.movedViewId;
  } else if (
    input.sourceSlot === 'primary' &&
    !primaryViews.includes(input.movedViewId) &&
    primaryViews[0] !== undefined
  ) {
    nextPrimarySlotFocusedViewId = primaryViews[0]!;
  }

  let nextSecondarySlotFocusedViewId: TViewId | null = null;
  if (input.targetSlot === 'secondary') {
    nextSecondarySlotFocusedViewId = input.movedViewId;
  } else if (
    input.sourceSlot === 'secondary' &&
    !secondaryViews.includes(input.movedViewId) &&
    secondaryViews[0] !== undefined
  ) {
    nextSecondarySlotFocusedViewId = secondaryViews[0]!;
  }

  return {
    nextActivityViewId,
    nextPrimarySlotFocusedViewId,
    nextSecondarySlotFocusedViewId,
  };
}
