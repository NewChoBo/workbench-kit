import './sidebar-chrome.css';
import { useCallback } from 'react';

import type { ComponentPropsWithRef, MouseEvent as ReactMouseEvent } from 'react';

import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { useContextMenuState } from '../../overlay/useContextMenuState';

import type { WorkbenchIconInput } from '../../icons/types';

import { IconButton } from '../../primitives/icon-button';

import { cx } from '../../utils/cx';

import { type ActivityBarOrientation } from '../../workbench/shell/activityBarOrder';

import {
  mergeWorkbenchSidebarViewPlacementDropZoneProps,
  useWorkbenchSidebarViewPlacementDropZone,
} from '../../workbench/shell/useWorkbenchSidebarViewPlacementDropZone';

import { useWorkbenchSidebarActionBarDnd } from '../../workbench/shell/useWorkbenchSidebarActionBarDnd';

import { SidebarToolbar } from './SidebarToolbar';

export interface SidebarActionIconDescriptor {
  readonly active?: boolean | undefined;

  readonly dataAttributes?: Readonly<Record<string, string | undefined>> | undefined;

  readonly disabled?: boolean | undefined;

  readonly icon: WorkbenchIconInput;

  readonly id: string;

  readonly label: string;

  readonly onSelect: () => void;
}

export interface SidebarActionIconBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  readonly acceptSidebarViewPlacementDrop?: ((viewId: string) => boolean) | undefined;
  readonly actions?: readonly SidebarActionIconDescriptor[] | undefined;

  readonly onActionsReorder?: ((actionIds: string[]) => void) | undefined;

  readonly onSidebarViewPlacementDrop?: ((viewId: string) => void) | undefined;

  readonly orientation?: ActivityBarOrientation | undefined;

  readonly overflowActions?: readonly SidebarActionIconDescriptor[] | undefined;

  readonly overflowMenuLabel?: string | undefined;

  readonly placementDraggable?: boolean | undefined;

  readonly reorderable?: boolean | undefined;

  readonly sidebarViewPlacementDropZoneId?: string | undefined;
}

function toContextMenuItems(actions: readonly SidebarActionIconDescriptor[]): ContextMenuItem[] {
  return actions.map((action) => ({
    disabled: action.disabled,
    icon: typeof action.icon === 'string' ? action.icon : undefined,
    id: action.id,
    label: action.label,
    onSelect: action.onSelect,
  }));
}

function resolveActionDataAttributes(
  dataAttributes: SidebarActionIconDescriptor['dataAttributes'],
): Record<string, string | undefined> {
  return dataAttributes ?? {};
}

export function SidebarActionIconBar({
  acceptSidebarViewPlacementDrop,
  actions = [],

  className,

  onActionsReorder,

  onSidebarViewPlacementDrop,

  orientation = 'horizontal',

  overflowActions = [],

  overflowMenuLabel = 'More actions',

  placementDraggable = false,

  reorderable = false,

  sidebarViewPlacementDropZoneId,

  ...toolbarProps
}: SidebarActionIconBarProps) {
  const {
    close: closeOverflowMenu,
    openAt: openOverflowMenuAt,
    state: overflowMenu,
  } = useContextMenuState<'overflow'>();

  const { draggingItemId, getDropPosition, getItemDragHandlers } = useWorkbenchSidebarActionBarDnd({
    itemIds: actions.map((action) => action.id),
    onReorder: onActionsReorder,
    orientation,
    placementDraggable,
    reorderable,
  });

  const placementDropZoneProps = useWorkbenchSidebarViewPlacementDropZone({
    acceptViewForDrop:
      onSidebarViewPlacementDrop === undefined
        ? () => false
        : (acceptSidebarViewPlacementDrop ??
          ((viewId) => !actions.some((action) => action.id === viewId))),
    onDropView: onSidebarViewPlacementDrop ?? (() => undefined),
    zoneId: sidebarViewPlacementDropZoneId,
  });

  const mergedToolbarProps =
    onSidebarViewPlacementDrop === undefined
      ? toolbarProps
      : mergeWorkbenchSidebarViewPlacementDropZoneProps(placementDropZoneProps, toolbarProps);

  const openOverflowMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      openOverflowMenuAt({ x: rect.left, y: rect.bottom + 4 }, 'overflow');
    },
    [openOverflowMenuAt],
  );
  if (actions.length === 0 && overflowActions.length === 0) {
    return null;
  }

  const renderAction = (action: SidebarActionIconDescriptor) => {
    const dropPosition = getDropPosition(action.id);
    const dragHandlers = getItemDragHandlers(action.id, { disabled: action.disabled });

    const button = (
      <IconButton
        aria-pressed={action.active ? true : undefined}
        className={cx(
          'ui-sidebar-action-icon-bar__button',
          action.active && 'ui-sidebar-action-icon-bar__button--active',
        )}
        compact
        data-drop-position={dropPosition}
        disabled={action.disabled}
        icon={action.icon}
        label={action.label}
        title={action.label}
        onClick={action.onSelect}
        {...resolveActionDataAttributes(action.dataAttributes)}
      />
    );

    if (dragHandlers === null) {
      return button;
    }

    return (
      <span
        className={cx(
          'ui-sidebar-action-icon-bar__item-host',
          reorderable && 'ui-sidebar-action-icon-bar__item-host--reorderable',
          placementDraggable && 'ui-sidebar-action-icon-bar__item-host--placement-draggable',
          draggingItemId === action.id && 'ui-sidebar-action-icon-bar__item-host--dragging',
        )}
        {...dragHandlers}
      >
        {dropPosition !== undefined ? (
          <span
            aria-hidden
            className={cx(
              'ui-sidebar-action-icon-bar__drop-indicator',
              dropPosition === 'before'
                ? 'ui-sidebar-action-icon-bar__drop-indicator--before'
                : 'ui-sidebar-action-icon-bar__drop-indicator--after',
            )}
          />
        ) : null}
        {button}
      </span>
    );
  };

  return (
    <>
      <SidebarToolbar
        className={cx(
          'ui-sidebar-action-icon-bar',

          orientation === 'horizontal' && 'ui-sidebar-action-icon-bar--horizontal',

          reorderable && 'ui-sidebar-action-icon-bar--reorderable',

          className,
        )}
        data-ui-sidebar-action-icon-bar="true"
        {...mergedToolbarProps}
      >
        {actions.map((action) => (
          <span key={action.id} className="ui-sidebar-action-icon-bar__item">
            {renderAction(action)}
          </span>
        ))}

        {overflowActions.length > 0 ? (
          <IconButton
            aria-expanded={overflowMenu !== null}
            aria-haspopup="menu"
            className="ui-sidebar-action-icon-bar__overflow"
            compact
            icon="ellipsis"
            label={overflowMenuLabel}
            title={overflowMenuLabel}
            onClick={openOverflowMenu}
          />
        ) : null}
      </SidebarToolbar>

      {overflowMenu && overflowActions.length > 0 ? (
        <ContextMenu
          ariaLabel={overflowMenuLabel}
          className="ui-sidebar-action-icon-bar__menu"
          items={toContextMenuItems(overflowActions)}
          x={overflowMenu.x}
          y={overflowMenu.y}
          onClose={closeOverflowMenu}
        />
      ) : null}
    </>
  );
}
