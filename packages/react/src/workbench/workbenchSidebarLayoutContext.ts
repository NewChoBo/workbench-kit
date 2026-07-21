import { createContext, useContext } from 'react';

import type { WorkbenchSidebarSlotId } from '@workbench-kit/platform';

export interface WorkbenchSidebarLayoutContextValue<TViewId extends string = string> {
  readonly dropViewOnSlot: (viewId: TViewId, targetSlot: WorkbenchSidebarSlotId) => void;
  readonly placements: Readonly<Record<TViewId, WorkbenchSidebarSlotId>>;
  readonly primaryViewId: TViewId;
  readonly resolveSlotViewIds: (
    slot: WorkbenchSidebarSlotId,
    baseViewIds: readonly TViewId[],
  ) => readonly TViewId[];
  readonly secondaryViewId: TViewId;
  readonly selectPrimaryView: (viewId: TViewId) => void;
  readonly selectSecondaryView: (viewId: TViewId) => void;
  readonly setSlotViewOrder: (
    slot: WorkbenchSidebarSlotId,
    orderedViewIds: readonly TViewId[],
    availableViewIds: readonly TViewId[],
  ) => void;
}

type WorkbenchSidebarLayoutContextStore = WorkbenchSidebarLayoutContextValue<string>;

export const WorkbenchSidebarLayoutContext =
  createContext<WorkbenchSidebarLayoutContextStore | null>(null);

export function useWorkbenchSidebarLayoutContextValue<
  TViewId extends string,
>(): WorkbenchSidebarLayoutContextValue<TViewId> | null {
  return useContext(
    WorkbenchSidebarLayoutContext,
  ) as WorkbenchSidebarLayoutContextValue<TViewId> | null;
}

export function toWorkbenchSidebarLayoutContextValue<TViewId extends string>(
  value: WorkbenchSidebarLayoutContextValue<TViewId>,
): WorkbenchSidebarLayoutContextStore {
  return value as unknown as WorkbenchSidebarLayoutContextStore;
}

export function fromWorkbenchSidebarLayoutContextValue<TViewId extends string>(
  value: WorkbenchSidebarLayoutContextStore,
): WorkbenchSidebarLayoutContextValue<TViewId> {
  return value as unknown as WorkbenchSidebarLayoutContextValue<TViewId>;
}
