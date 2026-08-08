import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  WorkbenchShell as ReactWorkbenchShell,
  type StatusBarItemModel,
  type StatusBarSectionModel,
  type WorkbenchShellProps as ReactWorkbenchShellProps,
} from '@workbench-kit/react/workbench/shell';
import {
  filterActivityBarItems,
  sortActivityBarItems,
} from '@workbench-kit/react/workbench/activityBarOrder';
import { filterActivitiesByWhenClause } from '@workbench-kit/workbench-core';

import { useContextKeyRevision } from '../commands/use-context-key-revision.js';
import { createWorkbenchShellActivityItems } from './model.js';
import { useWorkbench } from './provider.js';
import {
  WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX,
  WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX,
  workbenchHostPrimarySidebarSizePercentFromPx,
  workbenchHostPrimarySidebarSizePxFromPercent,
} from './layout-metrics.js';

export interface WorkbenchHostShellProps {
  activityBarAriaLabel?: string | undefined;
  activityBarPosition?: ReactWorkbenchShellProps['activityBarPosition'];
  auxiliarySidebar?: ReactNode;
  bottomPanel?: ReactNode;
  compactStatus?: boolean | undefined;
  editorArea: ReactNode;
  onStatusItemActivate?: ((item: StatusBarItemModel) => void) | undefined;
  overlays?: ReactNode;
  primarySidebar?: ReactNode;
  rootClassName?: string | undefined;
  shellPreset?: string | undefined;
  statusBarAriaLabel?: string | undefined;
  statusSections?: StatusBarSectionModel[] | undefined;
  theme?: string | undefined;
  themePreset?: string | undefined;
  titleBar?: ReactNode;
}

/** Lean product shell: Kit owns layout/chrome while the host owns every content surface. */
export function WorkbenchHostShell({
  activityBarAriaLabel = 'Primary activities',
  activityBarPosition,
  auxiliarySidebar,
  bottomPanel,
  compactStatus = true,
  editorArea,
  onStatusItemActivate,
  overlays,
  primarySidebar,
  rootClassName,
  shellPreset,
  statusBarAriaLabel = 'Status bar',
  statusSections = [],
  theme,
  themePreset,
  titleBar,
}: WorkbenchHostShellProps) {
  const { contextKeyService, executeCommand, extensionRegistry, layoutService } = useWorkbench();
  const contextKeyRevision = useContextKeyRevision(contextKeyService);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);
  const rerender = useCallback(() => forceRender(), []);
  const contextKeySnapshot = useMemo(
    () => contextKeyService.createSnapshot(),
    [contextKeyRevision, contextKeyService],
  );
  const layout = layoutService.getState();
  const activities = useMemo(
    () =>
      filterActivitiesByWhenClause(
        extensionRegistry.activities.getActivities(),
        contextKeySnapshot,
      ),
    [contextKeySnapshot, extensionRegistry],
  );
  const activityItems = filterActivityBarItems(
    sortActivityBarItems(
      createWorkbenchShellActivityItems({
        activeViewContainerId: layout.sideBar.activeViewContainer,
        activities,
        viewContainers: extensionRegistry.views.getViewContainers('activitybar'),
        views: extensionRegistry.views.getViews(),
      }),
      layout.activityBar.itemOrder,
    ),
    layout.activityBar.hiddenItemIds,
  );

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(rerender);
    return () => disposable.dispose();
  }, [layoutService, rerender]);

  useEffect(() => {
    if (activityItems.length === 0) {
      return;
    }
    const activeId = layout.sideBar.activeViewContainer;
    if (activeId !== undefined && !activityItems.some((item) => item.id === activeId)) {
      layoutService.setActiveViewContainer(activityItems[0]?.id);
    }
  }, [activityItems, layout.sideBar.activeViewContainer, layoutService]);

  return (
    <ReactWorkbenchShell
      activityBar={{
        'aria-label': activityBarAriaLabel,
        items: activityItems,
        reorderable: true,
        visible: layout.activityBar.visible,
        onItemActivate: (item) => layoutService.focusSideBarViewContainer(item.id),
        onItemsReorder: (itemIds) => {
          const preserved =
            layout.activityBar.itemOrder?.filter((itemId) => !itemIds.includes(itemId)) ?? [];
          layoutService.setActivityBarItemOrder([...itemIds, ...preserved]);
        },
      }}
      activityBarPosition={activityBarPosition}
      auxiliarySidebar={
        auxiliarySidebar === undefined
          ? undefined
          : { isVisible: layout.auxiliaryBar.visible, node: auxiliarySidebar }
      }
      bottomPanel={
        bottomPanel === undefined
          ? undefined
          : {
              isVisible: layout.panel.visible,
              node: bottomPanel,
              sizePercent: layout.panel.sizePercent,
              onSizePercentChange: (sizePercent) => layoutService.setPanelSizePercent(sizePercent),
            }
      }
      compactStatus={compactStatus}
      onStatusItemActivate={(item) => {
        const contributed = extensionRegistry.statusBar.getStatusBarItem(item.id);
        if (contributed?.command) {
          void executeCommand(contributed.command).catch(() => undefined);
          return;
        }
        onStatusItemActivate?.(item);
      }}
      overlays={overlays}
      primarySidebar={
        primarySidebar === undefined
          ? undefined
          : {
              isVisible: layout.sideBar.visible,
              maxPrimarySizePx: WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX,
              minPrimarySizePx: WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX,
              node: primarySidebar,
              primarySizePx: workbenchHostPrimarySidebarSizePxFromPercent(
                layout.sideBar.sizePercent,
              ),
              onSizePxChange: (sizePx) =>
                layoutService.setSideBarSizePercent(
                  workbenchHostPrimarySidebarSizePercentFromPx(sizePx),
                ),
            }
      }
      rootClassName={rootClassName}
      secondaryArea={editorArea}
      shellPreset={shellPreset}
      statusBarAriaLabel={statusBarAriaLabel}
      statusSections={statusSections}
      theme={theme}
      themePreset={themePreset}
      titleBar={titleBar}
    />
  );
}
