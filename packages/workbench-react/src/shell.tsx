import type { ReactNode } from 'react';
import {
  WorkbenchShell as ReactWorkbenchShell,
  type ActivityBarItem,
  type StatusBarItemModel,
  type StatusBarSectionModel,
} from '@workbench-kit/react/workbench/shell';

import { useWorkbench } from './provider.js';

export interface WorkbenchShellProps {
  compactStatus?: boolean;
  editorArea: ReactNode;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  primarySidebar?: ReactNode;
  rootClassName?: string;
  statusSections?: StatusBarSectionModel[];
  theme?: string;
}

export function WorkbenchShell({
  compactStatus = true,
  editorArea,
  onStatusItemActivate,
  primarySidebar,
  rootClassName,
  statusSections,
  theme,
}: WorkbenchShellProps) {
  const { extensionRegistry, layoutService, missingExtensionIds } = useWorkbench();
  const layout = layoutService.getState();
  const activityItems = createActivityItems(extensionRegistry);
  const resolvedStatusSections =
    statusSections ?? createDefaultStatusSections(extensionRegistry, missingExtensionIds);

  return (
    <ReactWorkbenchShell
      activityBar={{
        items: activityItems,
        onItemActivate: (item) => {
          layoutService.setActiveViewContainer(item.id);
          layoutService.setSideBarVisible(true);
        },
      }}
      compactStatus={compactStatus}
      onStatusItemActivate={onStatusItemActivate}
      primarySidebar={{
        isVisible: layout.sideBar.visible,
        node: primarySidebar ?? renderDefaultPrimarySidebar(extensionRegistry),
      }}
      rootClassName={rootClassName}
      secondaryArea={editorArea}
      statusSections={resolvedStatusSections}
      theme={theme}
    />
  );
}

function createActivityItems(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
) {
  const activities = extensionRegistry.activities.getActivities();
  if (activities.length > 0) {
    return activities.map<ActivityBarItem>((activity) => ({
      icon: resolveIcon(activity.icon),
      id: activity.viewContainerId,
      label: activity.title,
    }));
  }

  const viewContainerIds = new Set(
    extensionRegistry.views.getViews().map((view) => view.containerId),
  );

  return [...viewContainerIds].map<ActivityBarItem>((containerId) => {
    const container = extensionRegistry.views.getViewContainer(containerId);
    const firstView = extensionRegistry.views.getViews(containerId)[0];

    return {
      icon: resolveIcon(container?.icon ?? firstView?.name ?? containerId),
      id: containerId,
      label: container?.title ?? firstView?.name ?? containerId,
    };
  });
}

function createDefaultStatusSections(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
  missingExtensionIds: readonly string[],
): StatusBarSectionModel[] {
  return [
    {
      id: 'workbench',
      items: [
        {
          id: 'extensions',
          label: `extensions: ${extensionRegistry.getExtensions().length}`,
        },
        {
          hidden: missingExtensionIds.length === 0,
          id: 'missing-extensions',
          label: `missing: ${missingExtensionIds.length}`,
          status: 'waiting',
        },
      ],
    },
  ];
}

function renderDefaultPrimarySidebar(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
) {
  const views = extensionRegistry.views.getViews();
  if (views.length === 0) {
    return <aside aria-label="Primary sidebar" />;
  }

  return (
    <aside aria-label="Primary sidebar">
      {views.map((view) => (
        <section key={view.id} data-view-id={view.id}>
          {view.name}
        </section>
      ))}
    </aside>
  );
}

function resolveIcon(icon: ReactNode | string | undefined): ReactNode {
  if (icon === undefined) {
    return <span aria-hidden="true">W</span>;
  }

  if (typeof icon !== 'string') {
    return icon;
  }

  return <span aria-hidden="true">{icon.slice(0, 1).toUpperCase()}</span>;
}
