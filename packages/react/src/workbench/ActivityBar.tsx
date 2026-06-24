import { useState, type ComponentPropsWithoutRef, type DragEvent, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { cx } from '../utils/cx';
import {
  getActivityBarDropPosition,
  reorderActivityBarItems,
  type ActivityBarDropPosition,
} from './activityBarOrder';

export interface ActivityBarItem {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  title?: string;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  itemDataAttributeName?: string;
  items: ActivityBarItem[];
  onItemActivate?: (item: ActivityBarItem) => void;
  onItemsReorder?: (itemIds: string[]) => void;
  reorderable?: boolean;
  secondaryItems?: ActivityBarItem[];
}

const ACTIVITY_BAR_DRAG_DATA_TYPE = 'application/x-workbench-activity-bar-item';

interface ActivityBarDropTarget {
  itemId: string;
  position: ActivityBarDropPosition;
}

export function ActivityBar({
  'aria-label': ariaLabel = 'Activity bar',
  className,
  itemDataAttributeName,
  items,
  onItemActivate,
  onItemsReorder,
  reorderable = false,
  secondaryItems = [],
  ...props
}: ActivityBarProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ActivityBarDropTarget | null>(null);

  const reorderItems = (sourceId: string, targetId: string, position: ActivityBarDropPosition) => {
    if (!onItemsReorder) return;

    const nextItemIds = reorderActivityBarItems(
      items.map((item) => item.id),
      sourceId,
      targetId,
      position,
    );
    if (nextItemIds) {
      onItemsReorder([...nextItemIds]);
    }
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
    const position = getActivityBarDropPosition(event.currentTarget, event.clientY);
    setDropTarget((current) =>
      current?.itemId === item.id && current.position === position
        ? current
        : { itemId: item.id, position },
    );
  };

  const handleDrop = (item: ActivityBarItem, event: DragEvent<HTMLButtonElement>) => {
    if (!reorderable) return;

    event.preventDefault();
    const sourceId = event.dataTransfer.getData(ACTIVITY_BAR_DRAG_DATA_TYPE) || draggingItemId;
    if (sourceId) {
      reorderItems(
        sourceId,
        item.id,
        getActivityBarDropPosition(event.currentTarget, event.clientY),
      );
    }
    setDraggingItemId(null);
    setDropTarget(null);
  };

  const renderItem = (item: ActivityBarItem, options: { reorderable: boolean }) => {
    const isDropTarget = dropTarget?.itemId === item.id;
    const itemDataAttribute =
      itemDataAttributeName === undefined
        ? {}
        : { [itemDataAttributeName]: item.id };

    return (
      <Button
        key={item.id}
        aria-label={item.label}
        aria-pressed={item.active}
        className={cx(
          'ui-workbench-activity-bar__item',
          item.active && 'ui-workbench-activity-bar__item--active',
          options.reorderable && 'ui-workbench-activity-bar__item--reorderable',
          draggingItemId === item.id && 'ui-workbench-activity-bar__item--dragging',
        )}
        data-drop-position={isDropTarget ? dropTarget.position : undefined}
        disabled={item.disabled}
        draggable={options.reorderable && !item.disabled}
        title={item.title ?? item.label}
        {...itemDataAttribute}
        onClick={() => onItemActivate?.(item)}
        onDragEnd={() => {
          setDraggingItemId(null);
          setDropTarget(null);
        }}
        onDragLeave={() => {
          if (dropTarget?.itemId === item.id) {
            setDropTarget(null);
          }
        }}
        onDragOver={(event) => handleDragOver(item, event)}
        onDragStart={(event) => handleDragStart(item, event)}
        onDrop={(event) => handleDrop(item, event)}
      >
        {isDropTarget ? (
          <span
            aria-hidden
            className={cx(
              'ui-workbench-activity-bar__drop-indicator',
              dropTarget.position === 'before'
                ? 'ui-workbench-activity-bar__drop-indicator--before'
                : 'ui-workbench-activity-bar__drop-indicator--after',
            )}
          />
        ) : null}
        <span className="ui-workbench-activity-bar__icon">{item.icon}</span>
      </Button>
    );
  };

  return (
    <nav aria-label={ariaLabel} className={cx('ui-workbench-activity-bar', className)} {...props}>
      {items.map((item) => renderItem(item, { reorderable }))}
      {secondaryItems.length ? <span className="ui-workbench-activity-bar__spacer" /> : null}
      {secondaryItems.map((item) => renderItem(item, { reorderable: false }))}
    </nav>
  );
}
