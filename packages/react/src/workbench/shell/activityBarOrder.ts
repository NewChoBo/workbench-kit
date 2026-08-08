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

export type ActivityBarOrientation = 'horizontal' | 'vertical';

export function getActivityBarDropPosition(
  target: HTMLElement,
  pointerPosition: number,
  orientation: ActivityBarOrientation = 'vertical',
): ActivityBarDropPosition {
  const rect = target.getBoundingClientRect();

  if (orientation === 'horizontal') {
    if (rect.width <= 0) {
      return 'after';
    }

    return pointerPosition < rect.left + rect.width / 2 ? 'before' : 'after';
  }

  if (rect.height <= 0) {
    return 'after';
  }

  return pointerPosition < rect.top + rect.height / 2 ? 'before' : 'after';
}

export function sortActivityBarItems<T extends { id: string }>(
  items: readonly T[],
  itemOrder?: readonly string[] | undefined,
  fallbackOrder: readonly string[] = DEFAULT_ACTIVITY_BAR_ITEM_ORDER,
): T[] {
  const order = itemOrder?.length ? itemOrder : fallbackOrder;
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  const contributionIndex = new Map(items.map((item, index) => [item.id, index]));

  return [...items].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id);
    const rightIndex = orderIndex.get(right.id);

    if (leftIndex === undefined && rightIndex === undefined) {
      return (contributionIndex.get(left.id) ?? 0) - (contributionIndex.get(right.id) ?? 0);
    }

    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });
}

export function filterActivityBarItems<T extends { id: string }>(
  items: readonly T[],
  hiddenItemIds?: readonly string[] | undefined,
): T[] {
  if (!hiddenItemIds?.length) {
    return [...items];
  }

  const hiddenItems = new Set(hiddenItemIds);
  return items.filter((item) => !hiddenItems.has(item.id));
}
