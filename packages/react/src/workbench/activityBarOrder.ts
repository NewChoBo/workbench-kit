export const DEFAULT_ACTIVITY_BAR_ITEM_ORDER = [
  'explorer',
  'search',
  'chatting',
  'aiChat',
] as const;

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
