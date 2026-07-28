import type { ReactNode } from 'react';
import type {
  ActivityBarItem,
  StatusBarItemModel,
  StatusBarSectionModel,
} from '@workbench-kit/react/workbench/shell';
import type {
  ExtensionDependencyDiagnosticSeverity,
  WorkbenchActivityContribution,
  WorkbenchStatusBarContribution,
  WorkbenchViewContainerContribution,
  WorkbenchViewContribution,
} from '@workbench-kit/workbench-core';

export interface WorkbenchShellActivityItemsInput {
  readonly activeViewContainerId?: string | undefined;
  readonly activities: readonly WorkbenchActivityContribution[];
  readonly viewContainers: readonly WorkbenchViewContainerContribution[];
  readonly views: readonly WorkbenchViewContribution[];
}

export interface WorkbenchShellStatusSectionsInput {
  readonly dependencyDiagnostics: readonly {
    readonly severity: ExtensionDependencyDiagnosticSeverity;
  }[];
  readonly extensionCount: number;
  readonly missingExtensionIds: readonly string[];
  readonly profile?: { readonly displayName: string } | undefined;
}

export function createWorkbenchShellActivityItems({
  activeViewContainerId,
  activities,
  viewContainers,
  views,
}: WorkbenchShellActivityItemsInput): ActivityBarItem[] {
  if (activities.length > 0) {
    return activities
      .map<ActivityBarItem & { order?: number }>((activity) => ({
        active: activity.viewContainerId === activeViewContainerId,
        icon: resolveWorkbenchShellIcon(activity.icon),
        id: activity.viewContainerId,
        label: activity.title,
        order: activity.order,
      }))
      .sort(
        (left, right) =>
          (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
      )
      .map(({ order: _order, ...item }) => item);
  }

  const containersById = new Map(viewContainers.map((container) => [container.id, container]));
  const firstViewsByContainerId = new Map<string, WorkbenchViewContribution>();
  views.forEach((view) => {
    if (!firstViewsByContainerId.has(view.containerId)) {
      firstViewsByContainerId.set(view.containerId, view);
    }
  });

  return [...firstViewsByContainerId.entries()].map<ActivityBarItem>(([containerId, firstView]) => {
    const container = containersById.get(containerId);

    return {
      active: containerId === activeViewContainerId,
      icon: resolveWorkbenchShellIcon(container?.icon ?? firstView.name ?? containerId),
      id: containerId,
      label: container?.title ?? firstView.name ?? containerId,
    };
  });
}

function compareStatusBarPriority(
  left: WorkbenchStatusBarContribution,
  right: WorkbenchStatusBarContribution,
): number {
  const leftPriority = left.priority ?? 0;
  const rightPriority = right.priority ?? 0;
  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  return left.id.localeCompare(right.id);
}

function toStatusBarItemModel(item: WorkbenchStatusBarContribution): StatusBarItemModel {
  return {
    id: item.id,
    label: item.text,
    order: item.priority,
    title: item.text,
  };
}

/** Map extension `contributes.statusBar` items into shell status sections. */
export function createContributedWorkbenchStatusSections(
  items: readonly WorkbenchStatusBarContribution[],
): StatusBarSectionModel[] {
  const leftItems = items
    .filter((item) => item.alignment === 'left')
    .sort(compareStatusBarPriority)
    .map(toStatusBarItemModel);
  const rightItems = items
    .filter((item) => item.alignment === 'right')
    .sort(compareStatusBarPriority)
    .map(toStatusBarItemModel);

  return [
    ...(leftItems.length > 0
      ? [
          {
            align: 'start' as const,
            id: 'extension-status-left',
            items: leftItems,
          },
        ]
      : []),
    ...(rightItems.length > 0
      ? [
          {
            align: 'end' as const,
            id: 'extension-status-right',
            items: rightItems,
          },
        ]
      : []),
  ];
}

export function createDefaultWorkbenchStatusSections({
  dependencyDiagnostics,
  extensionCount,
  missingExtensionIds,
  profile,
}: WorkbenchShellStatusSectionsInput): StatusBarSectionModel[] {
  const errorDependencyDiagnostics = dependencyDiagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

  return [
    {
      id: 'workbench',
      items: [
        {
          id: 'extensions',
          label: `extensions: ${extensionCount}`,
        },
        {
          hidden: missingExtensionIds.length === 0,
          id: 'missing-extensions',
          label: `missing: ${missingExtensionIds.length}`,
          status: 'waiting',
        },
        {
          hidden: dependencyDiagnostics.length === 0,
          id: 'extension-dependencies',
          label: `deps: ${dependencyDiagnostics.length}`,
          status: errorDependencyDiagnostics.length > 0 ? 'failed' : 'waiting',
          title:
            errorDependencyDiagnostics.length > 0
              ? `${errorDependencyDiagnostics.length} extension dependency error${
                  errorDependencyDiagnostics.length === 1 ? '' : 's'
                }`
              : `${dependencyDiagnostics.length} extension dependency warning${
                  dependencyDiagnostics.length === 1 ? '' : 's'
                }`,
        },
      ],
    },
    {
      align: 'end',
      id: 'workbench-meta',
      items: [
        ...(profile
          ? [
              {
                icon: 'account' as const,
                id: 'workbench.account',
                label: profile.displayName,
                title: 'Open profile',
              },
            ]
          : []),
      ],
    },
  ];
}

export function resolveWorkbenchShellIcon(icon: ReactNode | string | undefined): ReactNode {
  if (icon === undefined) {
    return <span aria-hidden="true">W</span>;
  }

  if (typeof icon !== 'string') {
    return icon;
  }

  const className = getWorkbenchShellCodiconClassName(icon);
  if (className) {
    return <i aria-hidden="true" className={`codicon ${className}`} />;
  }

  return <span aria-hidden="true">W</span>;
}

export function getWorkbenchShellCodiconClassName(icon: string): string | undefined {
  const token = icon.trim();
  if (!token) return undefined;

  return token.startsWith('codicon-') ? token : `codicon-${token}`;
}
