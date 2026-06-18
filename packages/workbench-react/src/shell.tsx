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
import { Modal } from '@workbench-kit/react/modal';
import { Badge, Button, Field, Select } from '@workbench-kit/react/primitives';
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
import { WORKBENCH_SETTINGS_CAPABILITY_ID } from '@workbench-kit/workbench-core';
import type {
  ViewHost,
  ViewHostFactoryRegistry,
  ViewProvider,
  WorkbenchSettingsCapability,
} from '@workbench-kit/workbench-core';

import { EditorArea } from './editor-area.js';
import { BuiltinChatView, isBuiltinChatViewRenderData } from './chat-view.js';
import { BuiltinExplorerView, isBuiltinExplorerViewRenderData } from './explorer-view.js';
import { BuiltinSearchView } from './search-view.js';
import { isBuiltinSearchViewRenderData } from './search-view-data.js';
import { sortActivityBarItems } from '@workbench-kit/react/workbench/activityBarOrder';
import { useWorkbench } from './provider.js';

export interface WorkbenchShellProps {
  compactStatus?: boolean;
  editorArea?: ReactNode;
  helpContent?: ReactNode;
  helpTitle?: ReactNode;
  onThemeChange?: ((theme: string) => void) | undefined;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  primarySidebar?: ReactNode;
  rootClassName?: string;
  statusSections?: StatusBarSectionModel[];
  theme?: string;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
  title?: ReactNode;
  titleBar?: ReactNode;
  titleBarActions?: ReactNode;
  titleMeta?: ReactNode;
}

export interface WorkbenchThemeOption {
  description?: ReactNode;
  id: string;
  label: string;
}

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';
const APPEARANCE_SETTINGS_CATEGORY_ID = 'workbench.appearance';
const SETTINGS_EXTENSION_ID = 'workbench-kit.builtin.settings';
const SETTINGS_ACTIVITY_ITEM_ID = 'workbench-kit.shell.settings';

export function WorkbenchShell({
  compactStatus = true,
  editorArea,
  helpContent,
  helpTitle = 'Workbench Help',
  onThemeChange,
  onStatusItemActivate,
  primarySidebar,
  rootClassName,
  statusSections,
  theme,
  themeOptions,
  title = 'Workbench',
  titleBar,
  titleBarActions,
  titleMeta,
}: WorkbenchShellProps) {
  const resolvedEditorArea = editorArea ?? <EditorArea />;
  const { executeCommand, extensionRegistry, layoutService, missingExtensionIds } = useWorkbench();
  const forceRender = useForceRender();
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsSearchValue, setSettingsSearchValue] = useState('');
  const showSettingsModal = useCallback(() => {
    setHelpOpen(false);
    setSettingsOpen(true);
  }, []);
  const settingsCapability = useMemo<WorkbenchSettingsCapability>(
    () => ({
      openSettings: showSettingsModal,
    }),
    [showSettingsModal],
  );
  const layout = layoutService.getState();
  const resolvedStatusSections =
    statusSections ?? createDefaultStatusSections(extensionRegistry, missingExtensionIds);
  const activeViewContainerId = layout.sideBar.activeViewContainer;
  const activityItems = sortActivityBarItems(
    createActivityItems(extensionRegistry, activeViewContainerId),
    layout.activityBar.itemOrder,
  );
  const settingsCategories = useMemo(
    () =>
      createSettingsCategories(extensionRegistry, {
        onThemeChange,
        theme,
        themeOptions,
      }),
    [extensionRegistry, onThemeChange, theme, themeOptions],
  );
  const defaultSettingsCategoryId =
    settingsCategories.find((category) => category.id === SETTINGS_EXTENSION_ID)?.id ??
    settingsCategories[0]?.id;
  const settingsContributionCount = extensionRegistry.configurations.getConfigurations().length;
  const showHelpModal = useCallback(() => {
    setSettingsOpen(false);
    setHelpOpen(true);
  }, []);
  const resolvedTitleBar =
    titleBar === undefined ? (
      <WorkbenchShellTitleBar
        helpContent={helpContent}
        title={title}
        titleBarActions={titleBarActions}
        titleMeta={titleMeta}
        onHelpOpen={showHelpModal}
      />
    ) : (
      titleBar
    );

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

  useEffect(() => {
    if (extensionRegistry.capabilityRegistry.has(WORKBENCH_SETTINGS_CAPABILITY_ID)) {
      return undefined;
    }

    const disposable = extensionRegistry.capabilityRegistry.register({
      id: WORKBENCH_SETTINGS_CAPABILITY_ID,
      get: () => settingsCapability,
    });

    return () => {
      disposable.dispose();
    };
  }, [extensionRegistry, settingsCapability]);

  const openSettings = () => {
    showSettingsModal();
    if (extensionRegistry.commands.hasCommand(OPEN_SETTINGS_COMMAND_ID)) {
      void executeCommand(OPEN_SETTINGS_COMMAND_ID).catch(() => undefined);
    }
  };

  return (
    <ReactWorkbenchShell
      activityBar={{
        items: activityItems,
        reorderable: true,
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
        onItemsReorder: (itemIds) => {
          layoutService.setActivityBarItemOrder(itemIds);
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
      titleBar={resolvedTitleBar}
      theme={theme}
      overlays={
        <>
          {isSettingsOpen ? (
            <WorkbenchSettingsModal
              categories={settingsCategories}
              defaultActiveCategoryId={defaultSettingsCategoryId}
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
          ) : null}
          {isHelpOpen && helpContent ? (
            <Modal
              bodyClassName="workbench-help-modal__body"
              className="workbench-help-modal"
              closeLabel="Close help"
              footer={<Button onClick={() => setHelpOpen(false)}>Close</Button>}
              title={helpTitle}
              onClose={() => setHelpOpen(false)}
            >
              {helpContent}
            </Modal>
          ) : null}
        </>
      }
    />
  );
}

function WorkbenchShellTitleBar({
  helpContent,
  title,
  titleBarActions,
  titleMeta,
  onHelpOpen,
}: {
  helpContent: ReactNode | undefined;
  title: ReactNode;
  titleBarActions: ReactNode | undefined;
  titleMeta: ReactNode | undefined;
  onHelpOpen: () => void;
}) {
  return (
    <>
      <div className="workbench-shell-titlebar__identity">
        <i aria-hidden className="codicon codicon-layout" />
        <span className="workbench-shell-titlebar__title">{title}</span>
        {titleMeta ? <span className="workbench-shell-titlebar__meta">{titleMeta}</span> : null}
      </div>
      <div className="workbench-shell-titlebar__actions">
        {titleBarActions}
        {helpContent ? (
          <button
            aria-label="Help"
            className="ui-icon-button ui-icon-button--compact workbench-shell-titlebar__action"
            title="Help"
            type="button"
            onClick={onHelpOpen}
          >
            <i aria-hidden className="codicon codicon-question" />
          </button>
        ) : null}
      </div>
    </>
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
    return activities
      .map<ActivityBarItem & { order?: number }>((activity) => ({
        active: activity.viewContainerId === activeViewContainerId,
        icon: resolveIcon(activity.icon),
        id: activity.viewContainerId,
        label: activity.title,
        order: activity.order,
      }))
      .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
      .map(({ order: _order, ...item }) => item);
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
  appearanceSettings: WorkbenchAppearanceSettingsInput,
): WorkbenchSettingsCategory[] {
  const configurations = extensionRegistry.configurations.getConfigurations();
  const appearanceCategory = createAppearanceSettingsCategory(appearanceSettings);

  if (configurations.length === 0) {
    const fallbackCategory = {
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
    } satisfies WorkbenchSettingsCategory;

    return appearanceCategory ? [appearanceCategory, fallbackCategory] : [fallbackCategory];
  }

  const contributedCategories = configurations.map(({ extensionId, configuration }) => {
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
    } satisfies WorkbenchSettingsCategory;
  });

  return appearanceCategory
    ? [appearanceCategory, ...contributedCategories]
    : contributedCategories;
}

interface WorkbenchAppearanceSettingsInput {
  onThemeChange: ((theme: string) => void) | undefined;
  theme: string | undefined;
  themeOptions: readonly WorkbenchThemeOption[] | undefined;
}

function createAppearanceSettingsCategory({
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput): WorkbenchSettingsCategory | undefined {
  if (!themeOptions?.length) {
    return undefined;
  }

  return {
    content: (
      <AppearanceSettingsSection
        theme={theme}
        themeOptions={themeOptions}
        onThemeChange={onThemeChange}
      />
    ),
    id: APPEARANCE_SETTINGS_CATEGORY_ID,
    label: 'Appearance',
  };
}

function AppearanceSettingsSection({
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  themeOptions: readonly WorkbenchThemeOption[];
}) {
  const selectedTheme = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];
  const selectedThemeId = selectedTheme?.id ?? '';

  return (
    <WorkbenchSettingsSection
      id="workbench-settings-appearance"
      title="Appearance"
      description="Configure how the workbench is presented."
    >
      <div className="workbench-appearance-settings">
        <Field
          className="workbench-appearance-settings__field"
          label="Color theme"
          description="Select the active workbench color theme."
        >
          <Select
            aria-label="Color theme"
            controlWidth="full"
            disabled={!onThemeChange}
            value={selectedThemeId}
            onValueChange={(nextTheme) => onThemeChange?.(nextTheme)}
          >
            {themeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          {selectedTheme?.description ? (
            <p className="workbench-appearance-settings__description">
              {selectedTheme.description}
            </p>
          ) : null}
        </Field>
      </div>
    </WorkbenchSettingsSection>
  );
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
    <aside aria-label="Primary sidebar" className="workbench-react-primary-sidebar">
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

  if (isBuiltinChatViewRenderData(value)) {
    return <BuiltinChatView mode={value.mode} />;
  }

  if (isBuiltinSearchViewRenderData(value)) {
    return <BuiltinSearchView />;
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
