import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { Badge, Button, Field } from '@workbench-kit/react/primitives';
import {
  WorkbenchSettingsModal,
  WorkbenchSettingsSection,
  type WorkbenchSettingsCategory,
} from '@workbench-kit/react/workbench/settings';
import {
  WorkbenchShell as ReactWorkbenchShell,
  type ActivityBarItem,
  type StatusBarItemModel,
  type StatusBarSectionModel,
} from '@workbench-kit/react/workbench/shell';
import type {
  ViewHost,
  ViewHostFactoryRegistry,
  ViewProvider,
} from '@workbench-kit/workbench-core';

import { EditorArea } from './editor-area.js';
import { BuiltinExplorerView, isBuiltinExplorerViewRenderData } from './explorer-view.js';
import { useWorkbench } from './provider.js';

export interface WorkbenchShellProps {
  compactStatus?: boolean;
  editorArea?: ReactNode;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  primarySidebar?: ReactNode;
  rootClassName?: string;
  statusSections?: StatusBarSectionModel[];
  theme?: string;
}

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';
const SETTINGS_ACTIVITY_ITEM_ID = 'workbench-kit.shell.settings';

export function WorkbenchShell({
  compactStatus = true,
  editorArea,
  onStatusItemActivate,
  primarySidebar,
  rootClassName,
  statusSections,
  theme,
}: WorkbenchShellProps) {
  const resolvedEditorArea = editorArea ?? <EditorArea />;
  const { executeCommand, extensionRegistry, layoutService, missingExtensionIds } = useWorkbench();
  const forceRender = useForceRender();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsSearchValue, setSettingsSearchValue] = useState('');
  const layout = layoutService.getState();
  const resolvedStatusSections =
    statusSections ?? createDefaultStatusSections(extensionRegistry, missingExtensionIds);
  const activeViewContainerId = layout.sideBar.activeViewContainer;
  const activityItems = createActivityItems(extensionRegistry, activeViewContainerId);
  const settingsCategories = useMemo(
    () => createSettingsCategories(extensionRegistry),
    [extensionRegistry],
  );
  const settingsContributionCount = extensionRegistry.configurations.getConfigurations().length;

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

  const openSettings = () => {
    setSettingsOpen(true);
    if (extensionRegistry.commands.hasCommand(OPEN_SETTINGS_COMMAND_ID)) {
      void executeCommand(OPEN_SETTINGS_COMMAND_ID).catch(() => undefined);
    }
  };

  return (
    <ReactWorkbenchShell
      activityBar={{
        items: activityItems,
        secondaryItems: [
          {
            active: isSettingsOpen,
            icon: <i aria-hidden="true" className="codicon codicon-settings-gear" />,
            id: SETTINGS_ACTIVITY_ITEM_ID,
            label: 'Settings',
          },
        ],
        onItemActivate: (item) => {
          if (item.id === SETTINGS_ACTIVITY_ITEM_ID) {
            openSettings();
            return;
          }

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
      secondaryArea={resolvedEditorArea}
      statusSections={resolvedStatusSections}
      theme={theme}
      overlays={
        isSettingsOpen ? (
          <WorkbenchSettingsModal
            categories={settingsCategories}
            defaultActiveCategoryId={settingsCategories[0]?.id}
            footer={<Button onClick={() => setSettingsOpen(false)}>Close</Button>}
            scopes={[
              { id: 'user', label: 'User' },
              { id: 'workspace', label: 'Workspace' },
            ]}
            searchValue={settingsSearchValue}
            title="Settings"
            titleSuffix={
              <Badge variant="muted">
                {settingsContributionCount === 1
                  ? '1 contribution'
                  : `${settingsContributionCount} contributions`}
              </Badge>
            }
            onClose={() => setSettingsOpen(false)}
            onSearchValueChange={setSettingsSearchValue}
          />
        ) : null
      }
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
  activeViewContainerId: string | undefined,
) {
  const activities = extensionRegistry.activities.getActivities();
  if (activities.length > 0) {
    return activities.map<ActivityBarItem>((activity) => ({
      active: activity.viewContainerId === activeViewContainerId,
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
      active: containerId === activeViewContainerId,
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

function createSettingsCategories(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
): WorkbenchSettingsCategory[] {
  const configurations = extensionRegistry.configurations.getConfigurations();

  if (configurations.length === 0) {
    return [
      {
        content: (
          <WorkbenchSettingsSection
            id="workbench-settings-empty"
            title="Workbench"
            description="No extension settings are currently registered."
          >
            <p className="workbench-settings-empty">Enable extensions to contribute settings.</p>
          </WorkbenchSettingsSection>
        ),
        id: 'workbench',
        label: 'Workbench',
      },
    ];
  }

  return configurations.map(({ extensionId, configuration }) => {
    const extension = extensionRegistry.getExtension(extensionId);
    const displayName = extension?.manifest.displayName ?? titleFromExtensionId(extensionId);
    const properties = Object.entries(configuration.properties ?? {});

    return {
      content: (
        <WorkbenchSettingsSection
          id={`workbench-settings-${slugId(extensionId)}`}
          title={displayName}
          description={`${properties.length} ${
            properties.length === 1 ? 'setting is' : 'settings are'
          } contributed by ${extensionId}.`}
        >
          {properties.length ? (
            <div className="workbench-settings-contribution-list">
              {properties.map(([key, value]) => (
                <SettingContributionField key={key} propertyKey={key} propertyValue={value} />
              ))}
            </div>
          ) : (
            <p className="workbench-settings-empty">
              This extension registered a configuration section without properties.
            </p>
          )}
        </WorkbenchSettingsSection>
      ),
      id: extensionId,
      label: displayName,
      title: extensionId,
    };
  });
}

function SettingContributionField({
  propertyKey,
  propertyValue,
}: {
  propertyKey: string;
  propertyValue: unknown;
}) {
  const property = isRecord(propertyValue) ? propertyValue : {};
  const description = typeof property.description === 'string' ? property.description : undefined;
  const scope = typeof property.scope === 'string' ? property.scope : undefined;
  const type = formatSettingType(property.type);
  const hasDefault = Object.prototype.hasOwnProperty.call(property, 'default');

  return (
    <Field
      className="workbench-settings-contribution-field"
      label={<code>{propertyKey}</code>}
      description={description}
    >
      <div className="workbench-settings-contribution-meta">
        {type ? <Badge variant="muted">{type}</Badge> : null}
        {scope ? <Badge variant="muted">{scope}</Badge> : null}
      </div>
      {hasDefault ? (
        <code className="workbench-settings-contribution-default">
          default: {formatSettingDefault(property.default)}
        </code>
      ) : null}
    </Field>
  );
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
            viewHostFactories={extensionRegistry.viewHostFactories}
            viewId={view.id}
          />
        </section>
      ))}
    </aside>
  );
}

function WorkbenchViewHost({
  fallback,
  provider,
  viewHostFactories,
  viewId,
}: {
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
      {toViewHostReactNode(host.render(), fallback)}
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

function toViewHostReactNode(value: unknown, fallback: ReactNode): ReactNode {
  if (isBuiltinExplorerViewRenderData(value)) {
    return <BuiltinExplorerView />;
  }

  return toReactNode(value, fallback);
}

function formatSettingType(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value.join(' | ');
  }

  return undefined;
}

function formatSettingDefault(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function titleFromExtensionId(extensionId: string): string {
  const parts = extensionId.split('.').filter(Boolean);
  const lastPart = parts[parts.length - 1];

  return (
    lastPart?.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) ??
    extensionId
  );
}

function slugId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
