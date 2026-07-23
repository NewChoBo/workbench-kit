import './activity-bar.css';
import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Button } from '../../primitives/button';
import { cx } from '../../utils/cx';
import { type ActivityBarOrientation } from './activityBarOrder';
import {
  mergeWorkbenchSidebarViewPlacementDropZoneProps,
  useWorkbenchSidebarViewPlacementDropZone,
} from './useWorkbenchSidebarViewPlacementDropZone';
import { useWorkbenchSidebarActionBarDnd } from './useWorkbenchSidebarActionBarDnd';
import { WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE } from './sidebarViewPlacementDnd';

export interface ActivityBarItem {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  title?: string;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  acceptSidebarViewPlacementDrop?: ((viewId: string) => boolean);
  itemDataAttributeName?: string;
  items: ActivityBarItem[];
  onItemActivate?: (item: ActivityBarItem) => void;
  onItemsReorder?: (itemIds: string[]) => void;
  onSidebarViewPlacementDrop?: ((viewId: string) => void);
  orientation?: ActivityBarOrientation;
  reorderable?: boolean;
  secondaryItems?: ActivityBarItem[];
  sidebarViewPlacementDropZoneId?: string;
  /** Enables cross-slot placement drag without reordering within the bar. */
  placementDraggable?: boolean;
}

/** @deprecated Use WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE */
export const ACTIVITY_BAR_DRAG_DATA_TYPE = WORKBENCH_SIDEBAR_VIEW_PLACEMENT_DRAG_DATA_TYPE;

export function ActivityBar({
  'aria-label': ariaLabel = 'Activity bar',
  acceptSidebarViewPlacementDrop,
  className,
  itemDataAttributeName,
  items,
  onItemActivate,
  onItemsReorder,
  onSidebarViewPlacementDrop,
  orientation = 'vertical',
  placementDraggable = false,
  reorderable = false,
  secondaryItems = [],
  sidebarViewPlacementDropZoneId,
  ...navProps
}: ActivityBarProps) {
  const { draggingItemId, getDropPosition, getItemDragHandlers } = useWorkbenchSidebarActionBarDnd({
    itemIds: items.map((item) => item.id),
    onReorder: onItemsReorder,
    orientation,
    placementDraggable,
    reorderable,
  });

  const placementDropZoneProps = useWorkbenchSidebarViewPlacementDropZone({
    acceptViewForDrop:
      onSidebarViewPlacementDrop === undefined
        ? () => false
        : (acceptSidebarViewPlacementDrop ??
          ((viewId) => !items.some((item) => item.id === viewId))),
    onDropView: onSidebarViewPlacementDrop ?? (() => undefined),
    zoneId: sidebarViewPlacementDropZoneId,
  });

  const mergedNavProps =
    onSidebarViewPlacementDrop === undefined
      ? navProps
      : mergeWorkbenchSidebarViewPlacementDropZoneProps(placementDropZoneProps, navProps);

  const renderItem = (item: ActivityBarItem, options: { reorderable: boolean }) => {
    const dropPosition = getDropPosition(item.id);
    const itemDataAttribute =
      itemDataAttributeName === undefined ? {} : { [itemDataAttributeName]: item.id };
    const isItemReorderable = options.reorderable && !item.disabled;
    const isItemPlacementDraggable = placementDraggable && !item.disabled;
    const dragHandlers = getItemDragHandlers(item.id, { disabled: item.disabled });

    const button = (
      <Button
        aria-label={item.label}
        aria-pressed={item.active}
        className={cx(
          'ui-workbench-activity-bar__item',
          item.active && 'ui-workbench-activity-bar__item--active',
          isItemReorderable && 'ui-workbench-activity-bar__item--reorderable',
          draggingItemId === item.id && 'ui-workbench-activity-bar__item--dragging',
        )}
        data-drop-position={dropPosition}
        disabled={item.disabled}
        title={item.title ?? item.label}
        {...itemDataAttribute}
        onClick={() => onItemActivate?.(item)}
      >
        {dropPosition !== undefined ? (
          <span
            aria-hidden
            className={cx(
              'ui-workbench-activity-bar__drop-indicator',
              dropPosition === 'before'
                ? 'ui-workbench-activity-bar__drop-indicator--before'
                : 'ui-workbench-activity-bar__drop-indicator--after',
            )}
          />
        ) : null}
        <span className="ui-workbench-activity-bar__icon">{item.icon}</span>
      </Button>
    );

    if (dragHandlers === null) {
      return (
        <div key={item.id} className="ui-workbench-activity-bar__item-host">
          {button}
        </div>
      );
    }

    return (
      <span
        key={item.id}
        className={cx(
          'ui-workbench-activity-bar__item-host',
          isItemReorderable && 'ui-workbench-activity-bar__item-host--reorderable',
          isItemPlacementDraggable &&
            !isItemReorderable &&
            'ui-workbench-activity-bar__item-host--placement-draggable',
          draggingItemId === item.id && 'ui-workbench-activity-bar__item-host--dragging',
        )}
        {...dragHandlers}
      >
        {button}
      </span>
    );
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={cx(
        'ui-workbench-activity-bar',
        orientation === 'horizontal' && 'ui-workbench-activity-bar--horizontal',
        className,
      )}
      {...mergedNavProps}
    >
      {items.map((item) => renderItem(item, { reorderable }))}
      {secondaryItems.length ? <span className="ui-workbench-activity-bar__spacer" /> : null}
      {secondaryItems.map((item) => renderItem(item, { reorderable: false }))}
    </nav>
  );
}
