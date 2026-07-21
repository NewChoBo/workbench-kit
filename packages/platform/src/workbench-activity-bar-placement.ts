import type { WorkbenchSidebarSlotId } from './workbench-sidebar-slot.js';

export interface WorkbenchActivityBarItemLike {
  readonly id: string;
  readonly label: string;
  readonly title?: string | undefined;
}

export function resolveWorkbenchActivityBarItemTitle({
  baseTitle,
  placementLabels,
  slot,
}: {
  readonly baseTitle: string;
  readonly placementLabels: Record<WorkbenchSidebarSlotId, string>;
  readonly slot: WorkbenchSidebarSlotId;
}): string {
  return `${baseTitle} (${placementLabels[slot]})`;
}

export function applyWorkbenchActivityBarPlacementHints<TItem extends WorkbenchActivityBarItemLike>(
  items: readonly TItem[],
  placements: Readonly<Record<string, WorkbenchSidebarSlotId>>,
  placementLabels: Record<WorkbenchSidebarSlotId, string>,
  isDockableViewId: (viewId: string) => boolean,
): readonly TItem[] {
  return items.map((item) => {
    if (!isDockableViewId(item.id)) {
      return item;
    }

    const slot = placements[item.id];
    if (slot === undefined) {
      return item;
    }

    const baseTitle = item.title ?? item.label;

    return {
      ...item,
      title: resolveWorkbenchActivityBarItemTitle({
        baseTitle,
        placementLabels,
        slot,
      }),
    };
  });
}

/** Activity bar lists primary-slot dockable views; secondary-slot views use that slot's tab strip. */
export function filterWorkbenchActivityBarItemsByPrimarySlot<
  TItem extends WorkbenchActivityBarItemLike,
>(
  items: readonly TItem[],
  placements: Readonly<Record<string, WorkbenchSidebarSlotId>>,
  isDockableViewId: (viewId: string) => boolean,
): readonly TItem[] {
  return items.filter((item) => {
    if (!isDockableViewId(item.id)) {
      return true;
    }

    return placements[item.id] === 'primary';
  });
}
