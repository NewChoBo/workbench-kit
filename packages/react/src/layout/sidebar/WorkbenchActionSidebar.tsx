import type { ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { SideBarViewFrame, type SideBarViewFrameProps } from './SideBarViewFrame';
import {
  WorkbenchActionList,
  WorkbenchActionListItem,
  type WorkbenchActionItem,
  type WorkbenchActionListProps,
} from './WorkbenchSidebarActions';

export interface WorkbenchActionSidebarItem extends WorkbenchActionItem {
  readonly selected?: boolean | undefined;
  readonly showStatus?: boolean | undefined;
  readonly testId?: string | undefined;
  readonly title?: string | undefined;
  readonly unavailable?: boolean | undefined;
}

export interface WorkbenchActionSidebarProps extends Omit<
  SideBarViewFrameProps,
  'children' | 'onSelect'
> {
  readonly emptyLabel?: ReactNode | undefined;
  readonly items: readonly WorkbenchActionSidebarItem[];
  readonly listProps?:
    Omit<WorkbenchActionListProps, 'children' | 'empty' | 'emptyLabel'> | undefined;
  readonly onSelect?: ((item: WorkbenchActionSidebarItem) => void) | undefined;
  readonly renderIcon?: ((item: WorkbenchActionSidebarItem) => ReactNode) | undefined;
}

export function WorkbenchActionSidebar({
  className,
  emptyLabel = 'No actions',
  items,
  listProps,
  onSelect,
  renderIcon,
  ...frameProps
}: WorkbenchActionSidebarProps) {
  const { className: listClassName, ...restListProps } = listProps ?? {};
  const empty = items.length === 0;

  return (
    <SideBarViewFrame className={cx('ui-workbench-action-sidebar', className)} {...frameProps}>
      <WorkbenchActionList
        className={cx('ui-workbench-action-sidebar__list', listClassName)}
        empty={empty}
        emptyLabel={emptyLabel}
        {...restListProps}
      >
        {items.map((item) => (
          <WorkbenchActionListItem
            key={item.id}
            danger={item.danger}
            data-testid={item.testId}
            description={item.description}
            disabledReason={item.disabledReason}
            icon={renderIcon ? renderIcon(item) : item.icon}
            label={item.label}
            selected={item.selected}
            shortcut={item.shortcut}
            showStatus={item.showStatus ?? false}
            status={item.status}
            title={item.title ?? item.label}
            unavailable={item.unavailable}
            onClick={onSelect ? () => onSelect(item) : undefined}
          />
        ))}
      </WorkbenchActionList>
    </SideBarViewFrame>
  );
}
