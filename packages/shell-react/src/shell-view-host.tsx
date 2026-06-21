import { isValidElement, useEffect, useMemo, useRef, type FocusEvent, type ReactNode } from 'react';
import type {
  ExtensionRegistry,
  ViewHost,
  ViewHostFactoryRegistry,
  ViewProvider,
} from '@workbench-kit/workbench-core';

import { BuiltinChatView } from './chat-view.js';
import { isBuiltinChatViewRenderData } from './chat-view-data.js';
import { BuiltinCommandsView } from './commands-view.js';
import { isBuiltinCommandsViewRenderData } from './commands-view-data.js';
import { BuiltinExplorerView } from './explorer-view.js';
import { isBuiltinExplorerViewRenderData } from './explorer-view-data.js';
import { BuiltinExtensionsView } from './extensions-view.js';
import { isBuiltinExtensionsViewRenderData } from './extensions-view-data.js';
import { BuiltinSearchView } from './search-view.js';
import { isBuiltinSearchViewRenderData } from './search-view-data.js';

export function renderDefaultPrimarySidebar(
  extensionRegistry: Pick<ExtensionRegistry, 'viewHostFactories' | 'views'>,
  activeViewContainerId: string | undefined,
  catalogUrl?: string | undefined,
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

export function WorkbenchViewHost({
  catalogUrl,
  fallback,
  provider,
  viewHostFactories,
  viewId,
}: {
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
      {toWorkbenchViewHostReactNode(host.render(), fallback, { catalogUrl })}
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
  options: { catalogUrl?: string | undefined } = {},
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
    return <BuiltinExtensionsView catalogUrl={options.catalogUrl} />;
  }

  return toReactNode(value, fallback);
}
