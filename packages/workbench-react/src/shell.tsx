import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type FocusEvent,
  type ReactNode,
} from 'react';
import {
  WorkbenchShell as ReactWorkbenchShell,
  type ActivityBarItem,
  type StatusBarItemModel,
  type StatusBarSectionModel,
} from '@workbench-kit/react/workbench/shell';
import type { ViewHost, ViewProvider } from '@workbench-kit/workbench-core';

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
  const forceRender = useForceRender();
  const layout = layoutService.getState();
  const activityItems = createActivityItems(extensionRegistry);
  const resolvedStatusSections =
    statusSections ?? createDefaultStatusSections(extensionRegistry, missingExtensionIds);
  const activeViewContainerId = layout.sideBar.activeViewContainer;

  useEffect(() => {
    const layoutDisposable = layoutService.onDidChangeLayout(forceRender);
    const viewProviderDisposable = extensionRegistry.views.onDidRegisterViewProvider(forceRender);

    return () => {
      layoutDisposable.dispose();
      viewProviderDisposable.dispose();
    };
  }, [extensionRegistry, forceRender, layoutService]);

  useEffect(() => {
    if (!activeViewContainerId) {
      return;
    }

    for (const view of extensionRegistry.views.getViews(activeViewContainerId)) {
      void extensionRegistry.activateView(view.id).then(forceRender);
    }
  }, [activeViewContainerId, extensionRegistry, forceRender]);

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
        node:
          primarySidebar ?? renderDefaultPrimarySidebar(extensionRegistry, activeViewContainerId),
      }}
      rootClassName={rootClassName}
      secondaryArea={editorArea}
      statusSections={resolvedStatusSections}
      theme={theme}
    />
  );
}

function useForceRender() {
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  return useCallback(() => {
    forceRender();
  }, []);
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
  activeViewContainerId: string | undefined,
) {
  const views = activeViewContainerId
    ? extensionRegistry.views.getViews(activeViewContainerId)
    : extensionRegistry.views.getViews();
  if (views.length === 0) {
    return <aside aria-label="Primary sidebar" />;
  }

  return (
    <aside aria-label="Primary sidebar">
      {views.map((view) => (
        <section key={view.id} data-view-id={view.id}>
          <WorkbenchViewHost
            fallback={view.name}
            provider={extensionRegistry.views.getViewProvider(view.id)}
          />
        </section>
      ))}
    </aside>
  );
}

function WorkbenchViewHost({
  fallback,
  provider,
}: {
  fallback: ReactNode;
  provider: ViewProvider | undefined;
}) {
  const hostFrameRef = useRef<HTMLDivElement>(null);
  const host = useMemo(() => provider?.resolveViewHost(), [provider]);

  useEffect(() => {
    if (!host) {
      return undefined;
    }

    host.onDidShow?.();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && host.onDidResize
        ? new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            host.onDidResize?.({
              height: entry.contentRect.height,
              width: entry.contentRect.width,
            });
          })
        : undefined;

    if (resizeObserver && hostFrameRef.current) {
      resizeObserver.observe(hostFrameRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      host.onDidHide?.();
      host.dispose();
    };
  }, [host]);

  if (!host) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={hostFrameRef}
      aria-label={host.title}
      data-view-host-id={host.id ?? provider?.viewId}
      onBlur={(event) => notifyViewHostBlur(host, event)}
      onFocus={(event) => notifyViewHostFocus(host, event)}
    >
      {toReactNode(host.render(), fallback)}
    </div>
  );
}

function notifyViewHostFocus(host: ViewHost, event: FocusEvent<HTMLDivElement>): void {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    host.onDidFocus?.();
  }
}

function notifyViewHostBlur(host: ViewHost, event: FocusEvent<HTMLDivElement>): void {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    host.onDidBlur?.();
  }
}

function toReactNode(value: unknown, fallback: ReactNode): ReactNode {
  if (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'symbol' ||
    typeof value === 'function'
  ) {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number' || isValidElement(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value as ReactNode;
  }

  return fallback;
}

function resolveIcon(icon: ReactNode | string | undefined): ReactNode {
  if (icon === undefined) {
    return <span aria-hidden="true">W</span>;
  }

  if (typeof icon !== 'string') {
    return icon;
  }

  const className = getCodiconClassName(icon);
  if (className) {
    return <i aria-hidden="true" className={`codicon ${className}`} />;
  }

  return <span aria-hidden="true">W</span>;
}

function getCodiconClassName(icon: string): string | undefined {
  const token = icon.trim();
  if (!token) return undefined;

  return token.startsWith('codicon-') ? token : `codicon-${token}`;
}
