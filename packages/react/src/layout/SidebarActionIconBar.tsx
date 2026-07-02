import { useCallback, useState } from 'react';
import type { ComponentPropsWithRef, MouseEvent as ReactMouseEvent } from 'react';

import { ContextMenu, type ContextMenuItem } from '../overlay/ContextMenu';
import { IconButton } from '../primitives/IconButton';
import { cx } from '../utils/cx';
import { SidebarToolbar } from './SidebarToolbar';

export interface SidebarActionIconDescriptor {
  readonly active?: boolean | undefined;
  readonly dataAttributes?: Readonly<Record<string, string | undefined>> | undefined;
  readonly disabled?: boolean | undefined;
  readonly icon: string;
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
}

export interface SidebarActionIconBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  readonly actions?: readonly SidebarActionIconDescriptor[] | undefined;
  readonly overflowActions?: readonly SidebarActionIconDescriptor[] | undefined;
  readonly overflowMenuLabel?: string | undefined;
}

function toContextMenuItems(
  actions: readonly SidebarActionIconDescriptor[],
): ContextMenuItem[] {
  return actions.map((action) => ({
    disabled: action.disabled,
    icon: action.icon,
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
  actions = [],
  className,
  overflowActions = [],
  overflowMenuLabel = 'More actions',
  ...props
}: SidebarActionIconBarProps) {
  const [overflowMenu, setOverflowMenu] = useState<{ x: number; y: number } | null>(null);

  const openOverflowMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOverflowMenu({
      x: rect.left,
      y: rect.bottom + 4,
    });
  }, []);

  const closeOverflowMenu = useCallback(() => {
    setOverflowMenu(null);
  }, []);

  if (actions.length === 0 && overflowActions.length === 0) {
    return null;
  }

  return (
    <>
      <SidebarToolbar
        className={cx('ui-sidebar-action-icon-bar', className)}
        data-ui-sidebar-action-icon-bar="true"
        {...props}
      >
        {actions.map((action) => (
          <IconButton
            key={action.id}
            aria-pressed={action.active ? true : undefined}
            className={cx(
              'ui-sidebar-action-icon-bar__button',
              action.active && 'ui-sidebar-action-icon-bar__button--active',
            )}
            compact
            disabled={action.disabled}
            icon={action.icon}
            label={action.label}
            title={action.label}
            onClick={action.onSelect}
            {...resolveActionDataAttributes(action.dataAttributes)}
          />
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
