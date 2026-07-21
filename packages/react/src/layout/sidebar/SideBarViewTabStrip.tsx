import './sidebar-chrome.css';
import type { ComponentPropsWithRef } from 'react';

import type { WorkbenchIconInput } from '../../icons/types';
import { cx } from '../../utils/cx';
import { SidebarActionIconBar } from './SidebarActionIconBar';

export interface SideBarViewTabDescriptor {
  readonly active?: boolean | undefined;
  readonly dataAttributes?: Readonly<Record<string, string | undefined>> | undefined;
  readonly disabled?: boolean | undefined;
  readonly icon: WorkbenchIconInput;
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
}

export interface SideBarViewTabStripProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  readonly acceptSidebarViewPlacementDrop?: ((viewId: string) => boolean) | undefined;
  readonly onSidebarViewPlacementDrop?: ((viewId: string) => void) | undefined;
  readonly onTabsReorder?: ((tabIds: string[]) => void) | undefined;
  readonly placementDraggable?: boolean | undefined;
  readonly reorderable?: boolean | undefined;
  readonly sidebarViewPlacementDropZoneId?: string | undefined;
  readonly tabs: readonly SideBarViewTabDescriptor[];
}

export function SideBarViewTabStrip({
  className,
  onTabsReorder,
  placementDraggable = false,
  reorderable = false,
  tabs,
  ...props
}: SideBarViewTabStripProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <SidebarActionIconBar
      actions={tabs.map((tab) => ({
        active: tab.active,
        dataAttributes: tab.dataAttributes,
        disabled: tab.disabled,
        icon: tab.icon,
        id: tab.id,
        label: tab.label,
        onSelect: tab.onSelect,
      }))}
      className={cx('ui-sidebar-view-tab-strip', className)}
      data-ui-sidebar-view-tab-strip="true"
      onActionsReorder={onTabsReorder}
      orientation="horizontal"
      placementDraggable={placementDraggable}
      reorderable={reorderable}
      {...props}
    />
  );
}
