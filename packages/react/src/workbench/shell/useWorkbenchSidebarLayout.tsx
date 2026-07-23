import { useCallback, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';

import {
  coerceWorkbenchSidebarSlotViewId,
  listWorkbenchSidebarSlotViewIds,
  moveWorkbenchSidebarSlotViewOrder,
  normalizeWorkbenchSidebarSlotViewOrder,
  resolveWorkbenchSidebarSlotViewIdAfterMove,
  sortWorkbenchSidebarSlotViewIds,
  type WorkbenchSidebarSlotId,
  type WorkbenchSidebarSlotViewOrders,
} from '@workbench-kit/platform';

import {
  WorkbenchSidebarLayoutContext,
  type WorkbenchSidebarLayoutContextValue,
  toWorkbenchSidebarLayoutContextValue,
  useWorkbenchSidebarLayoutContextValue,
} from './workbenchSidebarLayoutContext.js';

export interface WorkbenchSidebarLayoutProviderProps<
  TViewId extends string,
  TActivityViewId extends TViewId,
> {
  readonly activityViewId: TActivityViewId | string;
  readonly children: ReactNode;
  readonly defaultPrimaryViewId: TViewId;
  readonly defaultSecondaryViewId: TViewId;
  readonly isActivityViewId: (viewId: string) => viewId is TActivityViewId;
  readonly listSlotViewIds?: (
    slot: WorkbenchSidebarSlotId,
    placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>,
  ) => readonly TViewId[];
  readonly normalizePlacements: (
    input: Partial<Record<TViewId, WorkbenchSidebarSlotId>>,
  ) => Record<TViewId, WorkbenchSidebarSlotId>;
  readonly onActivityViewChange: (viewId: TActivityViewId) => void;
  readonly onPlacementsChange: (placements: Record<TViewId, WorkbenchSidebarSlotId>) => void;
  readonly placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>;
  readonly registeredViewIds: readonly TViewId[];
}

export function WorkbenchSidebarLayoutProvider<
  TViewId extends string,
  TActivityViewId extends TViewId,
>({
  activityViewId,
  children,
  defaultPrimaryViewId,
  defaultSecondaryViewId,
  isActivityViewId,
  listSlotViewIds,
  normalizePlacements,
  onActivityViewChange,
  onPlacementsChange,
  placements,
  registeredViewIds,
}: WorkbenchSidebarLayoutProviderProps<TViewId, TActivityViewId>): JSX.Element {
  const [primarySlotViewId, setPrimarySlotViewId] = useState<TViewId>(defaultPrimaryViewId);
  const [secondarySlotViewId, setSecondarySlotViewId] = useState<TViewId>(defaultSecondaryViewId);
  const [orders, setOrders] = useState<WorkbenchSidebarSlotViewOrders<TViewId>>({});

  const listViewsForSlot = useCallback(
    (slot: WorkbenchSidebarSlotId): readonly TViewId[] =>
      listSlotViewIds?.(slot, placements) ??
      listWorkbenchSidebarSlotViewIds(slot, placements, registeredViewIds),
    [listSlotViewIds, placements, registeredViewIds],
  );

  const primaryViewId = useMemo(
    () =>
      coerceWorkbenchSidebarSlotViewId(
        'primary',
        primarySlotViewId,
        placements,
        registeredViewIds,
        defaultPrimaryViewId,
      ),
    [defaultPrimaryViewId, placements, primarySlotViewId, registeredViewIds],
  );

  const secondaryViewId = useMemo(
    () =>
      coerceWorkbenchSidebarSlotViewId(
        'secondary',
        secondarySlotViewId,
        placements,
        registeredViewIds,
        defaultSecondaryViewId,
      ),
    [defaultSecondaryViewId, placements, registeredViewIds, secondarySlotViewId],
  );

  useEffect(() => {
    setPrimarySlotViewId((current) =>
      coerceWorkbenchSidebarSlotViewId(
        'primary',
        current,
        placements,
        registeredViewIds,
        defaultPrimaryViewId,
      ),
    );
    setSecondarySlotViewId((current) =>
      coerceWorkbenchSidebarSlotViewId(
        'secondary',
        current,
        placements,
        registeredViewIds,
        defaultSecondaryViewId,
      ),
    );
  }, [defaultPrimaryViewId, defaultSecondaryViewId, placements, registeredViewIds]);

  const resolveSlotViewIds = useCallback(
    (slot: WorkbenchSidebarSlotId, baseViewIds: readonly TViewId[]): readonly TViewId[] =>
      sortWorkbenchSidebarSlotViewIds(baseViewIds, orders[slot]),
    [orders],
  );

  const setSlotViewOrder = useCallback(
    (
      slot: WorkbenchSidebarSlotId,
      orderedViewIds: readonly TViewId[],
      availableViewIds: readonly TViewId[],
    ): void => {
      setOrders((current) => ({
        ...current,
        [slot]: normalizeWorkbenchSidebarSlotViewOrder(orderedViewIds, availableViewIds),
      }));
    },
    [],
  );

  const dropViewOnSlot = useCallback(
    (viewId: TViewId, targetSlot: WorkbenchSidebarSlotId): void => {
      const sourceSlot = placements[viewId];
      if (sourceSlot === undefined || sourceSlot === targetSlot) {
        return;
      }

      const nextPlacements = normalizePlacements({
        ...placements,
        [viewId]: targetSlot,
      });

      onPlacementsChange(nextPlacements);

      setOrders((current) =>
        moveWorkbenchSidebarSlotViewOrder(current, {
          sourceSlot,
          sourceViewIds: listViewsForSlot(sourceSlot),
          targetSlot,
          targetViewIds: listViewsForSlot(targetSlot),
          viewId,
        }),
      );

      const { nextActivityViewId, nextPrimarySlotFocusedViewId, nextSecondarySlotFocusedViewId } =
        resolveWorkbenchSidebarSlotViewIdAfterMove<TViewId, TActivityViewId>({
          activityViewId: activityViewId as TActivityViewId,
          isActivityViewId,
          movedViewId: viewId,
          nextPlacements,
          registeredViewIds,
          sourceSlot,
          targetSlot,
        });

      if (nextPrimarySlotFocusedViewId !== null) {
        setPrimarySlotViewId(nextPrimarySlotFocusedViewId);
      }

      if (nextSecondarySlotFocusedViewId !== null) {
        setSecondarySlotViewId(nextSecondarySlotFocusedViewId);
      }

      if (nextActivityViewId !== null) {
        onActivityViewChange(nextActivityViewId);
      }
    },
    [
      activityViewId,
      isActivityViewId,
      listViewsForSlot,
      normalizePlacements,
      onActivityViewChange,
      onPlacementsChange,
      placements,
      registeredViewIds,
    ],
  );

  const value = useMemo(
    (): WorkbenchSidebarLayoutContextValue<TViewId> => ({
      dropViewOnSlot,
      placements,
      primaryViewId,
      resolveSlotViewIds,
      secondaryViewId,
      selectPrimaryView: setPrimarySlotViewId,
      selectSecondaryView: setSecondarySlotViewId,
      setSlotViewOrder,
    }),
    [
      dropViewOnSlot,
      placements,
      primaryViewId,
      resolveSlotViewIds,
      secondaryViewId,
      setSlotViewOrder,
    ],
  );

  return (
    <WorkbenchSidebarLayoutContext.Provider value={toWorkbenchSidebarLayoutContextValue(value)}>
      {children}
    </WorkbenchSidebarLayoutContext.Provider>
  );
}

export function useWorkbenchSidebarLayout<
  TViewId extends string,
>(): WorkbenchSidebarLayoutContextValue<TViewId> {
  const context = useWorkbenchSidebarLayoutContextValue<TViewId>();

  if (context === null) {
    throw new Error('useWorkbenchSidebarLayout must be used within WorkbenchSidebarLayoutProvider');
  }

  return context;
}
