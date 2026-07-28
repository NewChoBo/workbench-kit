import { isValidElement, useEffect, useMemo, useRef, type FocusEvent, type ReactNode } from 'react';
import type {
  ExtensionCatalogTrustPolicy,
  ExtensionRegistry,
  ViewHost,
  ViewHostFactoryRegistry,
  ViewProvider,
} from '@workbench-kit/workbench-core';

import { BuiltinChatView } from '../chat/view.js';
import { isBuiltinChatViewRenderData } from '../chat/view-data.js';
import { BuiltinCommandsView } from '../commands/view.js';
import { isBuiltinCommandsViewRenderData } from '../commands/view-data.js';
import { BuiltinExplorerView } from '../explorer/view.js';
import { isBuiltinExplorerViewRenderData } from '../explorer/view-data.js';
import { BuiltinExtensionsView } from '../extensions/view.js';
import { isBuiltinExtensionsViewRenderData } from '../extensions/view-data.js';
import { SampleJdwLabView } from '../jdw/lab-view.js';
import { isSampleJdwLabViewRenderData } from '../jdw/lab-view-data.js';
import { SampleFieldRemapView } from '../field-remap/view.js';
import { isSampleFieldRemapViewRenderData } from '../field-remap/view-data.js';
import { BuiltinSearchView } from '../explorer/search-view.js';
import { isBuiltinSearchViewRenderData } from '../explorer/search-view-data.js';

export function renderDefaultPrimarySidebar(
  extensionRegistry: Pick<ExtensionRegistry, 'viewHostFactories' | 'views'>,
  activeViewContainerId: string | undefined,
  catalogUrl?: string | undefined,
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined,
) {
  const views = activeViewContainerId
    ? extensionRegistry.views.getViews(activeViewContainerId)
    : extensionRegistry.views.getViews();
  if (views.length === 0) {
    return <aside aria-label="Primary sidebar" />;
  }

  return (
    <aside
      aria-label="Primary sidebar"
      className="workbench-primary-side-bar shell-react-primary-sidebar"
    >
      {views.map((view) => (
        <section key={view.id} data-view-id={view.id}>
          <WorkbenchViewHost
            catalogTrustPolicy={catalogTrustPolicy}
            catalogUrl={catalogUrl}
            fallback={view.name}
            provider={extensionRegistry.views.getViewProvider(view.id)}
            viewHostFactories={extensionRegistry.viewHostFactories}
            viewId={view.id}
          />
        </section>
      ))}
    </aside>
  );
}

export function renderDefaultBottomPanel(
  extensionRegistry: Pick<ExtensionRegistry, 'viewHostFactories' | 'views'>,
  activeViewContainerId: string | undefined,
  options: {
    catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
    catalogUrl?: string | undefined;
    onActiveViewContainerChange?: ((viewContainerId: string) => void) | undefined;
  } = {},
) {
  const containers = extensionRegistry.views.getViewContainers('panel');
  if (containers.length === 0) {
    return (
      <section aria-label="Panel" className="workbench-bottom-panel">
        <div className="workbench-bottom-panel__empty">No panel views contributed.</div>
      </section>
    );
  }

  const resolvedActiveViewContainerId =
    activeViewContainerId !== undefined &&
    containers.some((container) => container.id === activeViewContainerId)
      ? activeViewContainerId
      : containers[0]?.id;
  const views = resolvedActiveViewContainerId
    ? extensionRegistry.views.getViews(resolvedActiveViewContainerId)
    : [];

  return (
    <section aria-label="Panel" className="workbench-bottom-panel">
      <div className="workbench-bottom-panel__header" role="tablist" aria-label="Panel views">
        {containers.map((container) => {
          const isActive = container.id === resolvedActiveViewContainerId;
          return (
            <button
              key={container.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? 'workbench-bottom-panel__tab workbench-bottom-panel__tab--active'
                  : 'workbench-bottom-panel__tab'
              }
              data-panel-view-container-id={container.id}
              onClick={() => options.onActiveViewContainerChange?.(container.id)}
            >
              {container.title}
            </button>
          );
        })}
      </div>
      <div className="workbench-bottom-panel__body">
        {views.length === 0 ? (
          <div className="workbench-bottom-panel__empty">No views in this panel container.</div>
        ) : (
          views.map((view) => (
            <section key={view.id} data-view-id={view.id} className="workbench-bottom-panel__view">
              <WorkbenchViewHost
                catalogTrustPolicy={options.catalogTrustPolicy}
                catalogUrl={options.catalogUrl}
                fallback={view.name}
                provider={extensionRegistry.views.getViewProvider(view.id)}
                viewHostFactories={extensionRegistry.viewHostFactories}
                viewId={view.id}
              />
            </section>
          ))
        )}
      </div>
    </section>
  );
}

export function WorkbenchViewHost({
  catalogTrustPolicy,
  catalogUrl,
  fallback,
  provider,
  viewHostFactories,
  viewId,
}: {
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
  fallback: ReactNode;
  provider: ViewProvider | undefined;
  viewHostFactories: ViewHostFactoryRegistry;
  viewId: string;
}) {
  const hostFrameRef = useRef<HTMLDivElement>(null);
  const host = useMemo(() => {
    if (!provider) {
      return undefined;
    }

    return viewHostFactories.createViewHost({ viewId, provider });
  }, [provider, viewHostFactories, viewId]);

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
      {toWorkbenchViewHostReactNode(host.render(), fallback, { catalogTrustPolicy, catalogUrl })}
    </div>
  );
}

export function notifyViewHostFocus(host: ViewHost, event: FocusEvent<HTMLDivElement>): void {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    host.onDidFocus?.();
  }
}

export function notifyViewHostBlur(host: ViewHost, event: FocusEvent<HTMLDivElement>): void {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    host.onDidBlur?.();
  }
}

export function toReactNode(value: unknown, fallback: ReactNode): ReactNode {
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

export function toWorkbenchViewHostReactNode(
  value: unknown,
  fallback: ReactNode,
  options: {
    catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
    catalogUrl?: string | undefined;
  } = {},
): ReactNode {
  if (isBuiltinExplorerViewRenderData(value)) {
    return <BuiltinExplorerView />;
  }

  if (isBuiltinChatViewRenderData(value)) {
    return <BuiltinChatView mode={value.mode} />;
  }

  if (isBuiltinSearchViewRenderData(value)) {
    return <BuiltinSearchView />;
  }

  if (isBuiltinCommandsViewRenderData(value)) {
    return <BuiltinCommandsView />;
  }

  if (isBuiltinExtensionsViewRenderData(value)) {
    return (
      <BuiltinExtensionsView
        catalogTrustPolicy={options.catalogTrustPolicy}
        catalogUrl={options.catalogUrl}
      />
    );
  }

  if (isSampleJdwLabViewRenderData(value)) {
    return (
      <SampleJdwLabView
        templateJdwPath={value.templateJdwPath}
        widgetTreePath={value.widgetTreePath}
      />
    );
  }

  if (isSampleFieldRemapViewRenderData(value)) {
    return <SampleFieldRemapView />;
  }

  return toReactNode(value, fallback);
}
