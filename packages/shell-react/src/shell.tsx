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
import { TilepaperAppIcon } from '@workbench-kit/react';
import { Badge, Button, IconButton } from '@workbench-kit/react/primitives';
import {
  WorkbenchSettingsModal,
  type WorkbenchSettingsCategory,
} from '@workbench-kit/react/workbench/settings';
import {
  WorkbenchShell as ReactWorkbenchShell,
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
import { isPreferenceScope, type PreferenceScope } from '@workbench-kit/workbench-config';

import { EditorArea } from './editor-area.js';
import { BuiltinChatView } from './chat-view.js';
import { isBuiltinChatViewRenderData } from './chat-view-data.js';
import { BuiltinExplorerView } from './explorer-view.js';
import { isBuiltinExplorerViewRenderData } from './explorer-view-data.js';
import { BuiltinSearchView } from './search-view.js';
import { isBuiltinSearchViewRenderData } from './search-view-data.js';
import { BuiltinCommandsView } from './commands-view.js';
import {
  BUILTIN_COMMANDS_VIEW_CONTAINER_ID,
  isBuiltinCommandsViewRenderData,
} from './commands-view-data.js';
import { BuiltinExtensionsView } from './extensions-view.js';
import {
  BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID,
  isBuiltinExtensionsViewRenderData,
} from './extensions-view-data.js';
import {
  filterActivityBarItems,
  sortActivityBarItems,
} from '@workbench-kit/react/workbench/activityBarOrder';
import { useWorkbench } from './provider.js';
import { WorkbenchCommandHost, type WorkbenchCommandHostProps } from './workbench-command-host.js';
import {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_EXTENSIONS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
  WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
  WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
  WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
  WorkbenchAccountManagementSettings,
  WorkbenchCommandManagementSettings,
  WorkbenchKeybindingManagementSettings,
  createWorkbenchManagementPaletteCommands,
  type WorkbenchAccountManagementInput,
} from './management-settings.js';
import { mergeWorkbenchCommandDescriptors } from './workbench-command-palette.js';
import {
  createWorkbenchSecondaryActivityItems,
  getWorkbenchSecondaryActivityRoute,
} from './shell-secondary-actions.js';
import {
  SETTINGS_EXTENSION_ID,
  WORKBENCH_PREFERENCE_SCOPES,
  createSettingsCategories,
  type WorkbenchThemeOption,
} from './shell-settings.js';
import {
  createDefaultWorkbenchStatusSections,
  createWorkbenchShellActivityItems,
} from './shell-model.js';
import { WorkbenchProfileModal, type WorkbenchProfileInput } from './workbench-profile-modal.js';
export type { WorkbenchLocaleOption, WorkbenchThemeOption } from './shell-settings.js';

export interface WorkbenchShellProps {
  accountManagement?: WorkbenchAccountManagementInput | undefined;
  catalogUrl?: string | undefined;
  commandHost?: false | Omit<WorkbenchCommandHostProps, 'onOpenSettings'>;
  compactStatus?: boolean;
  editorArea?: ReactNode;
  helpContent?: ReactNode;
  helpTitle?: ReactNode;
  onThemeChange?: ((theme: string) => void) | undefined;
  onLocaleChange?: ((locale: string) => void) | undefined;
  locale?: string | undefined;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  primarySidebar?: ReactNode;
  profile?: WorkbenchProfileInput | undefined;
  rootClassName?: string;
  statusSections?: StatusBarSectionModel[];
  theme?: string;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
  title?: ReactNode;
  titleBar?: ReactNode;
  titleBarActions?: ReactNode;
  titleMeta?: ReactNode;
}

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';

export function WorkbenchShell({
  accountManagement,
  catalogUrl = '/extension-catalog.json',
  commandHost,
  compactStatus = true,
  editorArea,
  helpContent,
  helpTitle = 'Workbench Help',
  locale = 'en',
  onLocaleChange,
  onThemeChange,
  onStatusItemActivate,
  primarySidebar,
  profile,
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
  const {
    executeCommand,
    extensionRegistry,
    layoutService,
    missingExtensionIds,
    preferenceService,
  } = useWorkbench();
  const forceRender = useForceRender();
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsSearchValue, setSettingsSearchValue] = useState('');
  const [settingsCategoryId, setSettingsCategoryId] = useState<string | undefined>();
  const [settingsScopeId, setSettingsScopeId] = useState<PreferenceScope>('workspace');
  const showSettingsModal = useCallback((categoryId?: string) => {
    setHelpOpen(false);
    setProfileOpen(false);
    setSettingsCategoryId(categoryId);
    setSettingsOpen(true);
  }, []);
  const settingsCapability = useMemo<WorkbenchSettingsCapability>(
    () => ({
      openSettings: showSettingsModal,
    }),
    [showSettingsModal],
  );
  const layout = layoutService.getState();
  const resolvedStatusSections = useMemo(
    () =>
      statusSections ??
      createDefaultWorkbenchStatusSections({
        dependencyDiagnostics: extensionRegistry.getDependencyDiagnostics(),
        extensionCount: extensionRegistry.getExtensions().length,
        missingExtensionIds,
        profile,
      }),
    [extensionRegistry, missingExtensionIds, profile, statusSections],
  );
  const activeViewContainerId = layout.sideBar.activeViewContainer;
  const activityItems = sortActivityBarItems(
    createWorkbenchShellActivityItems({
      activeViewContainerId,
      activities: extensionRegistry.activities.getActivities(),
      viewContainers: extensionRegistry.views.getViewContainers(),
      views: extensionRegistry.views.getViews(),
    }),
    layout.activityBar.itemOrder,
  );
  const visibleActivityItems = filterActivityBarItems(
    activityItems,
    layout.activityBar.hiddenItemIds,
  );
  const secondaryActivityItems = createWorkbenchSecondaryActivityItems({
    hasProfile: profile !== undefined,
    isProfileOpen,
    isSettingsOpen,
  });
  const settingsCategories = useMemo(() => {
    const managementCategories: WorkbenchSettingsCategory[] = [];

    if (commandHost !== false) {
      managementCategories.push({
        content: <WorkbenchCommandManagementSettings />,
        id: WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
        label: 'Commands',
        title: 'Command management',
      });
      managementCategories.push({
        content: <WorkbenchKeybindingManagementSettings />,
        id: WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
        label: 'Keyboard Shortcuts',
        title: 'Keyboard shortcut management',
      });
    }

    if (accountManagement) {
      managementCategories.push({
        content: <WorkbenchAccountManagementSettings accountManagement={accountManagement} />,
        id: WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
        label: 'Linked Accounts',
        title: 'Linked account management',
      });
    }

    return [
      ...managementCategories,
      ...createSettingsCategories(extensionRegistry, {
        activeScope: settingsScopeId,
        locale,
        onLocaleChange,
        onThemeChange,
        preferenceService,
        theme,
        themeOptions,
      }),
    ];
  }, [
    accountManagement,
    commandHost,
    extensionRegistry,
    locale,
    onLocaleChange,
    onThemeChange,
    preferenceService,
    settingsScopeId,
    theme,
    themeOptions,
  ]);
  const defaultSettingsCategoryId =
    settingsCategories.find((category) => category.id === SETTINGS_EXTENSION_ID)?.id ??
    settingsCategories[0]?.id;
  const settingsContributionCount = extensionRegistry.configurations.getConfigurations().length;
  const showHelpModal = useCallback(() => {
    setSettingsOpen(false);
    setProfileOpen(false);
    setHelpOpen(true);
  }, []);
  const showProfileModal = useCallback(() => {
    setSettingsOpen(false);
    setHelpOpen(false);
    setProfileOpen(true);
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
    const preferenceDisposable = preferenceService.onDidChangePreference(forceRender);

    return () => {
      layoutDisposable.dispose();
      viewProviderDisposable.dispose();
      preferenceDisposable.dispose();
    };
  }, [extensionRegistry, forceRender, layoutService, preferenceService]);

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

  const openSettings = (categoryId?: string) => {
    showSettingsModal(categoryId);
    if (
      categoryId === undefined &&
      extensionRegistry.commands.hasCommand(OPEN_SETTINGS_COMMAND_ID)
    ) {
      void executeCommand(OPEN_SETTINGS_COMMAND_ID).catch(() => undefined);
    }
  };

  const resolvedCommandHost = useMemo(():
    | false
    | Omit<WorkbenchCommandHostProps, 'onOpenSettings'> => {
    if (commandHost === false) {
      return false;
    }

    const hostProps = commandHost ?? {};
    const additionalCommands = mergeWorkbenchCommandDescriptors(
      [...createWorkbenchManagementPaletteCommands()],
      [...(hostProps.additionalCommands ?? [])],
    );

    return {
      ...hostProps,
      additionalCommands,
      onRunCommand: (command, context) => {
        if (command.id === MANAGE_COMMANDS_COMMAND_ID) {
          layoutService.setActiveViewContainer(BUILTIN_COMMANDS_VIEW_CONTAINER_ID);
          layoutService.setSideBarVisible(true);
          return true;
        }

        if (command.id === MANAGE_KEYBINDINGS_COMMAND_ID) {
          openSettings(WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID);
          return true;
        }

        if (command.id === MANAGE_EXTENSIONS_COMMAND_ID) {
          layoutService.setActiveViewContainer(BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID);
          layoutService.setSideBarVisible(true);
          return true;
        }

        if (command.id === MANAGE_ACCOUNTS_COMMAND_ID) {
          openSettings(WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID);
          return true;
        }

        return hostProps.onRunCommand?.(command, context) ?? false;
      },
    };
  }, [commandHost, layoutService]);

  const handleStatusItemActivate = useCallback(
    (item: StatusBarItemModel) => {
      if (item.id === 'workbench.account') {
        if (profile) {
          showProfileModal();
          return;
        }

        if (accountManagement) {
          openSettings(WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID);
          return;
        }

        return;
      }

      onStatusItemActivate?.(item);
    },
    [accountManagement, onStatusItemActivate, profile, showProfileModal],
  );

  return (
    <ReactWorkbenchShell
      activityBar={{
        items: visibleActivityItems,
        reorderable: true,
        secondaryItems: secondaryActivityItems,
        onItemActivate: (item) => {
          const secondaryActivityRoute = getWorkbenchSecondaryActivityRoute(item.id);
          if (secondaryActivityRoute === 'profile') {
            showProfileModal();
            return;
          }

          if (secondaryActivityRoute === 'settings') {
            openSettings();
            return;
          }

          layoutService.focusSideBarViewContainer(item.id);
        },
        onItemsReorder: (itemIds) => {
          const preservedItemIds =
            layout.activityBar.itemOrder?.filter((itemId) => !itemIds.includes(itemId)) ?? [];
          layoutService.setActivityBarItemOrder([...itemIds, ...preservedItemIds]);
        },
      }}
      compactStatus={compactStatus}
      onStatusItemActivate={handleStatusItemActivate}
      primarySidebar={{
        isVisible: layout.sideBar.visible,
        maxPrimarySizePercent: 40,
        minPrimarySizePercent: 16,
        node:
          primarySidebar ??
          renderDefaultPrimarySidebar(extensionRegistry, activeViewContainerId, catalogUrl),
        onSizePercentChange: (sizePercent) => {
          layoutService.setSideBarSizePercent(sizePercent);
        },
        primarySizePercent: layout.sideBar.sizePercent ?? 20,
      }}
      rootClassName={rootClassName}
      secondaryArea={resolvedEditorArea}
      statusSections={resolvedStatusSections}
      titleBar={resolvedTitleBar}
      theme={theme}
      overlays={
        <>
          {commandHost !== false ? (
            <WorkbenchCommandHost
              {...(resolvedCommandHost === false ? {} : resolvedCommandHost)}
              onOpenSettings={() => openSettings()}
            />
          ) : null}
          {isSettingsOpen ? (
            <WorkbenchSettingsModal
              activeCategoryId={settingsCategoryId}
              activeScopeId={settingsScopeId}
              categories={settingsCategories}
              defaultActiveCategoryId={defaultSettingsCategoryId}
              defaultActiveScopeId="workspace"
              footer={<Button onClick={() => setSettingsOpen(false)}>Close</Button>}
              scopes={[...WORKBENCH_PREFERENCE_SCOPES]}
              searchValue={settingsSearchValue}
              title="Settings"
              titleSuffix={
                <Badge variant="muted">
                  {settingsContributionCount === 1
                    ? '1 contribution'
                    : `${settingsContributionCount} contributions`}
                </Badge>
              }
              onActiveCategoryIdChange={setSettingsCategoryId}
              onClose={() => setSettingsOpen(false)}
              onScopeChange={(scopeId) => {
                if (isPreferenceScope(scopeId)) {
                  setSettingsScopeId(scopeId);
                }
              }}
              onSearchValueChange={setSettingsSearchValue}
            />
          ) : null}
          {isProfileOpen && profile ? (
            <WorkbenchProfileModal profile={profile} onClose={() => setProfileOpen(false)} />
          ) : null}
          {isHelpOpen && helpContent ? (
            <Modal
              bodyPadding="lg"
              bodyScroll="auto"
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
        <span aria-hidden className="workbench-shell-titlebar__app-icon">
          <TilepaperAppIcon />
        </span>
        <span className="workbench-shell-titlebar__title">{title}</span>
        {titleMeta ? <span className="workbench-shell-titlebar__meta">{titleMeta}</span> : null}
      </div>
      <div className="workbench-shell-titlebar__actions">
        {titleBarActions}
        {helpContent ? (
          <IconButton
            className="workbench-shell-titlebar__action"
            compact
            icon="question"
            label="Help"
            onClick={onHelpOpen}
          />
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

function renderDefaultPrimarySidebar(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
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

function WorkbenchViewHost({
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
      {toViewHostReactNode(host.render(), fallback, { catalogUrl })}
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

function toViewHostReactNode(
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
