import { useState, type ComponentPropsWithoutRef, type DragEvent, type ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface ActivityBarItem {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  title?: string;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  items: ActivityBarItem[];
  onItemActivate?: (item: ActivityBarItem) => void;
  onItemsReorder?: (itemIds: string[]) => void;
  reorderable?: boolean;
  secondaryItems?: ActivityBarItem[];
}

const ACTIVITY_BAR_DRAG_DATA_TYPE = 'application/x-workbench-activity-bar-item';

export function ActivityBar({
  'aria-label': ariaLabel = 'Activity bar',
  className,
  items,
  onItemActivate,
  onItemsReorder,
  reorderable = false,
  secondaryItems = [],
  ...props
}: ActivityBarProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTargetItemId, setDropTargetItemId] = useState<string | null>(null);

  const reorderItems = (sourceId: string, targetId: string) => {
    if (!onItemsReorder || sourceId === targetId) return;

    const itemIds = items.map((item) => item.id);
    const sourceIndex = itemIds.indexOf(sourceId);
    const targetIndex = itemIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextItemIds = [...itemIds];
    nextItemIds.splice(sourceIndex, 1);
    nextItemIds.splice(targetIndex, 0, sourceId);
    onItemsReorder(nextItemIds);
  };

  const handleDragStart = (item: ActivityBarItem, event: DragEvent<HTMLButtonElement>) => {
    if (!reorderable || item.disabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(ACTIVITY_BAR_DRAG_DATA_TYPE, item.id);
    setDraggingItemId(item.id);
  };

  const handleDragOver = (item: ActivityBarItem, event: DragEvent<HTMLButtonElement>) => {
    if (!reorderable || !draggingItemId || draggingItemId === item.id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetItemId(item.id);
  };

  const handleDrop = (item: ActivityBarItem, event: DragEvent<HTMLButtonElement>) => {
    if (!reorderable) return;

    event.preventDefault();
    const sourceId = event.dataTransfer.getData(ACTIVITY_BAR_DRAG_DATA_TYPE) || draggingItemId;
    if (sourceId) {
      reorderItems(sourceId, item.id);
    }
    setDraggingItemId(null);
    setDropTargetItemId(null);
  };

  const renderItem = (item: ActivityBarItem, options: { reorderable: boolean }) => (
    <button
      key={item.id}
      type="button"
      aria-label={item.label}
      aria-pressed={item.active}
      className={cx(
        'ui-workbench-activity-bar__item',
        item.active && 'ui-workbench-activity-bar__item--active',
        options.reorderable && 'ui-workbench-activity-bar__item--reorderable',
        draggingItemId === item.id && 'ui-workbench-activity-bar__item--dragging',
        dropTargetItemId === item.id && 'ui-workbench-activity-bar__item--drop-target',
      )}
      disabled={item.disabled}
      draggable={options.reorderable && !item.disabled}
      title={item.title ?? item.label}
      onClick={() => onItemActivate?.(item)}
      onDragEnd={() => {
        setDraggingItemId(null);
        setDropTargetItemId(null);
      }}
      onDragLeave={() => {
        if (dropTargetItemId === item.id) {
          setDropTargetItemId(null);
        }
      }}
      onDragOver={(event) => handleDragOver(item, event)}
      onDragStart={(event) => handleDragStart(item, event)}
      onDrop={(event) => handleDrop(item, event)}
    >
      <span className="ui-workbench-activity-bar__icon">{item.icon}</span>
    </button>
  );

  return (
    <nav aria-label={ariaLabel} className={cx('ui-workbench-activity-bar', className)} {...props}>
      {items.map((item) => renderItem(item, { reorderable }))}
      {secondaryItems.length ? <span className="ui-workbench-activity-bar__spacer" /> : null}
      {secondaryItems.map((item) => renderItem(item, { reorderable: false }))}
    </nav>
  );
}
