import type { ReactNode } from 'react';

import {
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
  type SideBarListProps,
  type SideBarViewFrameProps,
} from '../layout/SideBarViewFrame';
import { cx } from '../utils/cx';

export interface WorkbenchViewSidebarItem<TViewId extends string, TIcon = unknown> {
  readonly disabled?: boolean | undefined;
  readonly icon: TIcon;
  readonly id: TViewId;
  readonly label: string;
  readonly title?: string | undefined;
}

export interface WorkbenchViewSidebarProps<TViewId extends string, TIcon = unknown> extends Omit<
  SideBarViewFrameProps,
  'children' | 'onSelect'
> {
  readonly [key: `data-${string}`]: boolean | number | string | undefined;
  readonly activeId?: TViewId | undefined;
  readonly itemDataAttributeName?: string | undefined;
  readonly items: ReadonlyArray<WorkbenchViewSidebarItem<TViewId, TIcon>>;
  readonly listProps?: Omit<SideBarListProps, 'children'> | undefined;
  readonly onSelect?:
    | ((viewId: TViewId, item: WorkbenchViewSidebarItem<TViewId, TIcon>) => void)
    | undefined;
  readonly renderIcon: (icon: TIcon, item: WorkbenchViewSidebarItem<TViewId, TIcon>) => ReactNode;
}

export function WorkbenchViewSidebar<TViewId extends string, TIcon = unknown>({
  activeId,
  className,
  itemDataAttributeName,
  items,
  listProps,
  onSelect,
  renderIcon,
  ...frameProps
}: WorkbenchViewSidebarProps<TViewId, TIcon>) {
  const { className: listClassName, fill = true, ...restListProps } = listProps ?? {};

  return (
    <SideBarViewFrame
      className={cx('ui-workbench-view-sidebar', 'workbench-primary-side-bar', className)}
      {...frameProps}
    >
      <SideBarList
        className={cx('ui-workbench-view-sidebar__list', listClassName)}
        fill={fill}
        {...restListProps}
      >
        {items.map((item) => {
          const selected = item.id === activeId;
          const itemDataProps =
            itemDataAttributeName === undefined
              ? undefined
              : ({ [itemDataAttributeName]: item.id } as Record<string, string>);

          return (
            <SideBarListItem
              key={item.id}
              active={selected}
              disabled={item.disabled}
              onClick={onSelect === undefined ? undefined : () => onSelect(item.id, item)}
              selected={selected}
              title={item.title ?? item.label}
              {...itemDataProps}
            >
              <span className="ui-workbench-view-sidebar__item-content">
                <span className="ui-workbench-view-sidebar__item-icon">
                  {renderIcon(item.icon, item)}
                </span>
                <span className="ui-workbench-view-sidebar__item-label">{item.label}</span>
              </span>
            </SideBarListItem>
          );
        })}
      </SideBarList>
    </SideBarViewFrame>
  );
}
