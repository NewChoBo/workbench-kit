import type { ReactNode } from 'react';
import type {
  WorkbenchViewActivityBarItem,
  WorkbenchViewActivityBarModel,
  WorkbenchViewEditorTabItem,
} from '@workbench-kit/platform';

import type { EditorTab } from '../primitives/WorkbenchEditor';
import type { ActivityBarItem } from './ActivityBar';
import type { WorkbenchShellProps } from './WorkbenchShell';
import type { WorkbenchViewSidebarItem, WorkbenchViewSidebarProps } from './WorkbenchViewSidebar';

export type WorkbenchShellActivityBarViewModelProps = Omit<
  WorkbenchShellProps['activityBar'],
  'items' | 'secondaryItems'
>;

export type WorkbenchViewSidebarViewModelProps<TViewId extends string, TIcon = unknown> = Omit<
  WorkbenchViewSidebarProps<TViewId, TIcon>,
  'items'
>;

export interface CreateWorkbenchShellActivityBarFromViewModelInput<
  TViewId extends string,
  TIcon = unknown,
> {
  readonly activeId?: TViewId | undefined;
  readonly activityBarProps?: WorkbenchShellActivityBarViewModelProps | undefined;
  readonly model: WorkbenchViewActivityBarModel<TViewId, TIcon>;
  readonly onSelect?:
    | ((viewId: TViewId, item: WorkbenchViewActivityBarItem<TViewId, TIcon>) => void)
    | undefined;
  readonly renderIcon: (
    icon: TIcon,
    item: WorkbenchViewActivityBarItem<TViewId, TIcon>,
  ) => ReactNode;
}

export interface CreateWorkbenchEditorTabsFromViewModelInput<
  TViewId extends string,
  TIcon extends EditorTab['icon'] = EditorTab['icon'],
> {
  readonly items: ReadonlyArray<WorkbenchViewEditorTabItem<TViewId, TIcon>>;
  readonly resolveTitle?:
    | ((item: WorkbenchViewEditorTabItem<TViewId, TIcon>) => string | undefined)
    | undefined;
}

export interface CreateWorkbenchViewSidebarItemsFromViewModelInput<
  TViewId extends string,
  TIcon = unknown,
> {
  readonly model: WorkbenchViewActivityBarModel<TViewId, TIcon>;
}

export interface CreateWorkbenchViewSidebarFromViewModelInput<
  TViewId extends string,
  TIcon = unknown,
> extends WorkbenchViewSidebarViewModelProps<TViewId, TIcon> {
  readonly model: WorkbenchViewActivityBarModel<TViewId, TIcon>;
}

export function createWorkbenchShellActivityBarFromViewModel<
  TViewId extends string,
  TIcon = unknown,
>({
  activeId,
  activityBarProps,
  model,
  onSelect,
  renderIcon,
}: CreateWorkbenchShellActivityBarFromViewModelInput<
  TViewId,
  TIcon
>): WorkbenchShellProps['activityBar'] {
  const sourceItemsById = new Map<string, WorkbenchViewActivityBarItem<TViewId, TIcon>>();
  const { onItemActivate, ...restActivityBarProps } = activityBarProps ?? {};

  const toActivityBarItem = (
    item: WorkbenchViewActivityBarItem<TViewId, TIcon>,
  ): ActivityBarItem => {
    sourceItemsById.set(item.id, item);

    return {
      active: item.id === activeId,
      icon: renderIcon(item.icon, item),
      id: item.id,
      label: item.label,
      title: item.label,
    };
  };

  const items = model.sections.flatMap((section) => section.map(toActivityBarItem));
  const secondaryItems = model.footerItems.map(toActivityBarItem);
  const activityBar: WorkbenchShellProps['activityBar'] = {
    ...restActivityBarProps,
    items,
    secondaryItems,
  };

  if (onItemActivate !== undefined || onSelect !== undefined) {
    activityBar.onItemActivate = (item) => {
      onItemActivate?.(item);

      const sourceItem = sourceItemsById.get(item.id);
      if (sourceItem !== undefined) {
        onSelect?.(sourceItem.id, sourceItem);
      }
    };
  }

  return activityBar;
}

export function createWorkbenchEditorTabsFromViewModel<
  TViewId extends string,
  TIcon extends EditorTab['icon'] = EditorTab['icon'],
>({
  items,
  resolveTitle,
}: CreateWorkbenchEditorTabsFromViewModelInput<TViewId, TIcon>): ReadonlyArray<EditorTab> {
  return items.map((item): EditorTab => {
    const title = resolveTitle?.(item) ?? item.label;

    return {
      closable: item.closable,
      dirty: item.dirty,
      icon: item.icon,
      id: item.id,
      label: item.label,
      title,
    };
  });
}

export function createWorkbenchViewSidebarItemsFromViewModel<
  TViewId extends string,
  TIcon = unknown,
>({
  model,
}: CreateWorkbenchViewSidebarItemsFromViewModelInput<TViewId, TIcon>): ReadonlyArray<
  WorkbenchViewSidebarItem<TViewId, TIcon>
> {
  return [...model.sections.flatMap((section) => section), ...model.footerItems].map((item) => ({
    icon: item.icon,
    id: item.id,
    label: item.label,
  }));
}

export function createWorkbenchViewSidebarFromViewModel<TViewId extends string, TIcon = unknown>({
  model,
  ...sidebarProps
}: CreateWorkbenchViewSidebarFromViewModelInput<TViewId, TIcon>): WorkbenchViewSidebarProps<
  TViewId,
  TIcon
> {
  return {
    ...sidebarProps,
    items: createWorkbenchViewSidebarItemsFromViewModel({ model }),
  };
}
