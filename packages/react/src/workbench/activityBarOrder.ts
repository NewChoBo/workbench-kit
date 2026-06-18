export const DEFAULT_ACTIVITY_BAR_ITEM_ORDER = [
  'explorer',
  'search',
  'chatting',
  'aiChat',
] as const;

export type ActivityBarDropPosition = 'after' | 'before';

export function reorderActivityBarItems(
  itemIds: readonly string[],
  sourceId: string,
  targetId: string,
  position: ActivityBarDropPosition,
): readonly string[] | undefined {
  if (sourceId === targetId) {
    return undefined;
  }

  const sourceIndex = itemIds.indexOf(sourceId);
  const targetIndex = itemIds.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return undefined;
  }

  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  const nextItemIds = [...itemIds];
  nextItemIds.splice(sourceIndex, 1);

  if (sourceIndex < insertIndex) {
    insertIndex -= 1;
  }

  if (insertIndex === sourceIndex) {
    return undefined;
  }

  nextItemIds.splice(insertIndex, 0, sourceId);
  return nextItemIds;
}

export function getActivityBarDropPosition(
  target: HTMLElement,
  clientY: number,
): ActivityBarDropPosition {
  const rect = target.getBoundingClientRect();
  if (rect.height <= 0) {
    return 'after';
  }

  return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

export function sortActivityBarItems<T extends { id: string }>(
  items: readonly T[],
  itemOrder?: readonly string[] | undefined,
  fallbackOrder: readonly string[] = DEFAULT_ACTIVITY_BAR_ITEM_ORDER,
): T[] {
  const order = itemOrder?.length ? itemOrder : fallbackOrder;
  const orderIndex = new Map(order.map((id, index) => [id, index]));

  return [...items].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id);
    const rightIndex = orderIndex.get(right.id);

    if (leftIndex === undefined && rightIndex === undefined) {
      return left.id.localeCompare(right.id);
    }

    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
}
