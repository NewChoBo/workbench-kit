import type { WorkbenchSidebarSlotId } from './workbench-sidebar-slot.js';

export type WorkbenchSidebarSlotViewOrders<TViewId extends string> = Partial<
  Record<WorkbenchSidebarSlotId, readonly TViewId[]>
>;

/**
 * Sorts slot view ids using a persisted order. Unknown ids append in stable locale order.
 */
export function sortWorkbenchSidebarSlotViewIds<TViewId extends string>(
  viewIds: readonly TViewId[],
  orderedViewIds: readonly TViewId[] | undefined,
): readonly TViewId[] {
  if (orderedViewIds === undefined || orderedViewIds.length === 0) {
    return viewIds;
  }

  const orderIndex = new Map(orderedViewIds.map((viewId, index) => [viewId, index]));

  return [...viewIds].sort((left, right) => {
    const leftIndex = orderIndex.get(left);
    const rightIndex = orderIndex.get(right);

    if (leftIndex === undefined && rightIndex === undefined) {
      return left.localeCompare(right);
    }

    if (leftIndex === undefined) {
      return 1;
    }

    if (rightIndex === undefined) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

/**
 * Normalizes a persisted order to available slot views only, preserving order and appending missing ids.
 */
export function normalizeWorkbenchSidebarSlotViewOrder<TViewId extends string>(
  orderedViewIds: readonly string[],
  availableViewIds: readonly TViewId[],
): TViewId[] {
  const available = new Set(availableViewIds);
  const seen = new Set<TViewId>();
  const normalized: TViewId[] = [];

  for (const viewId of orderedViewIds) {
    if (!available.has(viewId as TViewId) || seen.has(viewId as TViewId)) {
      continue;
    }

    seen.add(viewId as TViewId);
    normalized.push(viewId as TViewId);
  }

  for (const viewId of availableViewIds) {
    if (!seen.has(viewId)) {
      normalized.push(viewId);
    }
  }

  return normalized;
}

export interface MoveWorkbenchSidebarSlotViewOrderInput<TViewId extends string> {
  readonly sourceSlot: WorkbenchSidebarSlotId;
  readonly sourceViewIds: readonly TViewId[];
  readonly targetSlot: WorkbenchSidebarSlotId;
  readonly targetViewIds: readonly TViewId[];
  readonly viewId: TViewId;
}

/**
 * Updates per-slot view order when a view moves between sidebar layout regions.
 */
export function moveWorkbenchSidebarSlotViewOrder<TViewId extends string>(
  orders: WorkbenchSidebarSlotViewOrders<TViewId>,
  input: MoveWorkbenchSidebarSlotViewOrderInput<TViewId>,
): WorkbenchSidebarSlotViewOrders<TViewId> {
  const sourceOrder = normalizeWorkbenchSidebarSlotViewOrder(
    orders[input.sourceSlot] ?? input.sourceViewIds,
    input.sourceViewIds,
  ).filter((candidate) => candidate !== input.viewId);

  const targetOrder = normalizeWorkbenchSidebarSlotViewOrder(
    [...(orders[input.targetSlot] ?? input.targetViewIds), input.viewId],
    [...input.targetViewIds, input.viewId],
  );

  return {
    ...orders,
    [input.sourceSlot]: sourceOrder,
    [input.targetSlot]: targetOrder,
  };
}
