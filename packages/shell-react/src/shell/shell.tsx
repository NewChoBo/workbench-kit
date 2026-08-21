import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { Modal } from '@workbench-kit/react/modal';
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
import { filterActivitiesByWhenClause } from '@workbench-kit/workbench-core';
import type {
  ExtensionCatalogTrustPolicy,
  WorkbenchSettingsCapability,
} from '@workbench-kit/workbench-core';
import { WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS } from '@workbench-kit/platform';
import { isPreferenceScope, type PreferenceScope } from '@workbench-kit/workbench-config';
import {
  resolveActiveThemePreset,
  DEFAULT_SHELL_PRESET,
  useResolvedWorkbenchTheme,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
} from '@workbench-kit/react/workbench';

import { BUILTIN_COMMANDS_VIEW_CONTAINER_ID } from '../commands/view-data.js';
import { useExtensionEnablementController } from '../extensions/extension-enablement-context.js';
import { BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID } from '../extensions/view-data.js';
import {
  filterActivityBarItems,
  sortActivityBarItems,
} from '@workbench-kit/react/workbench/activityBarOrder';
import { useWorkbench } from './provider.js';
import {
  resolveWorkbenchShellChromeLabels,
  type WorkbenchShellChromeLabels,
  type WorkbenchTranslate,
} from './chrome-labels.js';
import { WorkbenchCommandHost, type WorkbenchCommandHostProps } from '../workbench/command-host.js';
import {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_EXTENSIONS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
  WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
  WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
  WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
} from '../management/settings-ids.js';
import { createWorkbenchManagementPaletteCommands } from '../management/palette-commands.js';
import {
  WorkbenchAccountManagementSettings,
  WorkbenchCommandManagementSettings,
  WorkbenchKeybindingManagementSettings,
  type WorkbenchAccountManagementInput,
} from '../management/settings.js';
import { mergeWorkbenchCommandDescriptors } from '../workbench/command-palette.js';
import {
  createWorkbenchSecondaryActivityItems,
  getWorkbenchSecondaryActivityRoute,
} from './secondary-actions.js';
import { SETTINGS_EXTENSION_ID, WORKBENCH_PREFERENCE_SCOPES } from './settings-constants.js';
import { createSettingsCategories, type WorkbenchThemeOption } from './settings.js';
import {
  createContributedWorkbenchStatusSections,
  createDefaultWorkbenchStatusSections,
  createWorkbenchShellActivityItems,
} from './model.js';
import { mergeWorkbenchStatusSections } from '../workbench/status-sections.js';
import {
  getVisibleWorkbenchViews,
  renderDefaultAuxiliarySidebar,
  renderDefaultBottomPanel,
  renderDefaultPrimarySidebar,
} from './view-host.js';
import { WorkbenchShellTitleBarLayoutControls } from './titlebar-layout-controls.js';
import { WorkbenchProfileModal, type WorkbenchProfileInput } from '../workbench/profile-modal.js';
import { useContextKeyRevision } from '../commands/use-context-key-revision.js';
import {
  WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX,
  WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX,
  workbenchHostPrimarySidebarSizePercentFromPx,
  workbenchHostPrimarySidebarSizePxFromPercent,
} from './layout-metrics.js';
export type { WorkbenchLocaleOption, WorkbenchThemeOption } from './settings.js';

export interface WorkbenchShellCommandRunContext extends WorkbenchCommandRunContext {
  openSettings(categoryId?: string): void;
}

export interface WorkbenchShellCommandHostProps extends Omit<
  WorkbenchCommandHostProps,
  'onOpenSettings' | 'onRunCommand'
> {
  onRunCommand?: (
    command: WorkbenchCommandDescriptor,
    context: WorkbenchShellCommandRunContext,
  ) => boolean | void;
}

export interface WorkbenchShellProps {
  accountManagement?: WorkbenchAccountManagementInput | undefined;
  additionalSettingsCategories?: readonly WorkbenchSettingsCategory[] | undefined;
  /** Host-owned product mark shown by the default title bar. */
  appIcon?: ReactNode;
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
  commandHost?: false | WorkbenchShellCommandHostProps;
  compactStatus?: boolean;
  darkPreset?: string | undefined;
  editorArea?: ReactNode;
  helpContent?: ReactNode;
  helpTitle?: ReactNode;
  /**
   * Partial chrome label overrides for ActivityBar / StatusBar / secondary items /
   * command palette. Wins over `t` when both are set for the same key.
   */
  labels?: Partial<WorkbenchShellChromeLabels> | undefined;
  lightPreset?: string | undefined;
  onDarkPresetChange?: ((preset: string) => void) | undefined;
  onLightPresetChange?: ((preset: string) => void) | undefined;
  onShellPresetChange?: ((preset: string) => void) | undefined;
  onThemeChange?: ((theme: string) => void) | undefined;
  onLocaleChange?: ((locale: string) => void) | undefined;
  locale?: string | undefined;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  /** Host-owned dialogs and command surfaces rendered inside the shell overlay container. */
  overlays?: ReactNode;
  primarySidebar?: ReactNode;
  profile?: WorkbenchProfileInput | undefined;
  profileExtraContent?: ReactNode;
  rootClassName?: string;
  shellPreset?: string | undefined;
  statusSections?: StatusBarSectionModel[];
  /**
   * Optional `t(key, fallback)` injection for shell chrome strings.
   * Missing `t` keeps English defaults from `resolveWorkbenchShellChromeLabels`.
   */
  t?: WorkbenchTranslate | undefined;
  theme?: string;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
  title?: ReactNode;
  titleBar?: ReactNode;
  titleBarActions?: ReactNode;
  titleMeta?: ReactNode;
  /**
   * When using the default title bar, show the bottom-panel layout toggle.
   * Defaults to `true`. Pass `false` for primary-sidebar-only hosts.
   * Custom `titleBar` nodes are unaffected — omit panel callbacks there instead.
   */
  showPanelLayoutToggle?: boolean;
  /**
   * When using the default title bar, show the auxiliary sidebar layout toggle.
   * Defaults to `true`. Pass `false` for primary-sidebar-only hosts.
   */
  showAuxiliarySidebarLayoutToggle?: boolean;
}

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';

export function WorkbenchShell({
  accountManagement,
  additionalSettingsCategories,
  appIcon,
  catalogTrustPolicy,
  catalogUrl = '/extension-catalog.json',
  commandHost,
  compactStatus = true,
  darkPreset,
  editorArea,
  helpContent,
  helpTitle = 'Workbench Help',
  labels: labelOverrides,
  lightPreset,
  locale = 'en',
  onDarkPresetChange,
  onLightPresetChange,
  onLocaleChange,
  onShellPresetChange,
  onThemeChange,
  onStatusItemActivate,
  overlays,
  primarySidebar,
  profile,
  profileExtraContent,
  rootClassName,
  shellPreset = DEFAULT_SHELL_PRESET,
  statusSections,
  t,
  theme,
  themeOptions,
  title = 'Workbench',
  titleBar,
  titleBarActions,
  titleMeta,
  showPanelLayoutToggle = true,
  showAuxiliarySidebarLayoutToggle = true,
}: WorkbenchShellProps) {
  const resolvedEditorArea = editorArea ?? null;
  const resolvedWorkbenchTheme = useResolvedWorkbenchTheme(theme ?? 'system');
  const activeThemePreset =
    lightPreset !== undefined && darkPreset !== undefined
      ? resolveActiveThemePreset(resolvedWorkbenchTheme, { darkPreset, lightPreset })
      : undefined;
  const {
    activities,
    commands,
    configurations,
    contextKeyService,
    executeCommand,
    extensionActivation,
    extensionCatalog,
    layoutService,
    localizations,
    missingExtensionIds,
    preferenceService,
    settingsCapabilityPublisher,
    statusBar,
    themes,
    viewHostFactories,
    views,
  } = useWorkbench();
  const extensionEnablement = useExtensionEnablementController();
  const contextKeyRevision = useContextKeyRevision(contextKeyService);
  const contextKeySnapshot = useMemo(
    () => contextKeyService.createSnapshot(),
    [contextKeyRevision, contextKeyService],
  );
  const forceRender = useForceRender();
  const themeRevision = themes.getRevision();
  const [preferenceRevision, bumpPreferenceRevision] = useReducer((count: number) => count + 1, 0);
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
      mergeWorkbenchStatusSections(
        createDefaultWorkbenchStatusSections({
          dependencyDiagnostics: extensionCatalog.getDependencyDiagnostics(),
          extensionCount: extensionCatalog.getExtensions().length,
          missingExtensionIds,
          profile,
        }),
        createContributedWorkbenchStatusSections(statusBar.getStatusBarItems()),
      ),
    [extensionCatalog, missingExtensionIds, profile, statusBar, statusSections],
  );
  const activeViewContainerId = layout.sideBar.activeViewContainer;
  const activePanelViewContainerId = layout.panel.activeViewContainer;
  const panelViewContainers = views.getViewContainers('panel');
  const visibleActivities = useMemo(
    () => filterActivitiesByWhenClause(activities.getActivities(), contextKeySnapshot),
    [activities, contextKeySnapshot],
  );
  const activityItems = sortActivityBarItems(
    createWorkbenchShellActivityItems({
      activeViewContainerId,
      activities: visibleActivities,
      viewContainers: views.getViewContainers('activitybar'),
      views: views.getViews(),
    }),
    layout.activityBar.itemOrder,
  );
  const visibleActivityItems = filterActivityBarItems(
    activityItems,
    layout.activityBar.hiddenItemIds,
  );
  const canOpenSettingsValue = contextKeyService.get(
    WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS,
  );
  const chromeLabels = useMemo(
    () => resolveWorkbenchShellChromeLabels(labelOverrides, t),
    [labelOverrides, t],
  );
  const secondaryActivityItems = createWorkbenchSecondaryActivityItems({
    hasProfile: profile !== undefined,
    isProfileOpen,
    isSettingsOpen,
    showSettings: canOpenSettingsValue !== false,
    profileLabel: chromeLabels.profileLabel,
    profileTitle: chromeLabels.profileTitle,
    settingsLabel: chromeLabels.settingsLabel,
  });

  useEffect(() => {
    extensionEnablement.setProtectedThemeIds([theme, lightPreset, darkPreset]);
    return () => {
      extensionEnablement.setProtectedThemeIds(undefined);
    };
  }, [darkPreset, extensionEnablement, lightPreset, theme]);

  useEffect(() => {
    if (visibleActivityItems.length === 0) {
      return;
    }

    const visibleActivityIds = new Set(visibleActivityItems.map((item) => item.id));
    if (activeViewContainerId !== undefined && !visibleActivityIds.has(activeViewContainerId)) {
      layoutService.setActiveViewContainer(visibleActivityItems[0]?.id);
    }
  }, [activeViewContainerId, layoutService, visibleActivityItems]);

  useEffect(() => {
    if (panelViewContainers.length === 0) {
      return;
    }

    const panelContainerIds = new Set(panelViewContainers.map((container) => container.id));
    if (
      activePanelViewContainerId === undefined ||
      !panelContainerIds.has(activePanelViewContainerId)
    ) {
      layoutService.setActivePanelViewContainer(panelViewContainers[0]?.id);
    }
  }, [activePanelViewContainerId, layoutService, panelViewContainers]);
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
      ...(additionalSettingsCategories ?? []),
      ...createSettingsCategories(
        { configurations, extensionCatalog, localizations, themes },
        {
          activeScope: settingsScopeId,
          darkPreset,
          lightPreset,
          locale,
          onDarkPresetChange,
          onLightPresetChange,
          onLocaleChange,
          onShellPresetChange,
          onThemeChange,
          preferenceService,
          shellPreset,
          theme,
          themeOptions,
        },
      ),
    ];
  }, [
    accountManagement,
    additionalSettingsCategories,
    commandHost,
    darkPreset,
    configurations,
    extensionCatalog,
    lightPreset,
    locale,
    localizations,
    onDarkPresetChange,
    onLightPresetChange,
    onLocaleChange,
    onShellPresetChange,
    onThemeChange,
    preferenceService,
    preferenceRevision,
    settingsScopeId,
    shellPreset,
    theme,
    themeRevision,
    themes,
    themeOptions,
  ]);
  const defaultSettingsCategoryId =
    settingsCategories.find((category) => category.id === SETTINGS_EXTENSION_ID)?.id ??
    settingsCategories[0]?.id;
  const settingsContributionCount = configurations.getConfigurations().length;
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
        appIcon={appIcon}
        helpContent={helpContent}
        isAuxiliarySidebarVisible={layout.auxiliaryBar.visible}
        isPanelVisible={layout.panel.visible}
        isPrimarySidebarVisible={layout.sideBar.visible}
        showAuxiliarySidebarLayoutToggle={showAuxiliarySidebarLayoutToggle}
        showPanelLayoutToggle={showPanelLayoutToggle}
        title={title}
        titleBarActions={titleBarActions}
        titleMeta={titleMeta}
        onHelpOpen={showHelpModal}
        onToggleAuxiliarySidebar={() => {
          layoutService.setAuxiliaryBarVisible(!layout.auxiliaryBar.visible);
        }}
        onTogglePanel={() => {
          layoutService.setPanelVisible(!layout.panel.visible);
        }}
        onTogglePrimarySidebar={() => {
          layoutService.setSideBarVisible(!layout.sideBar.visible);
        }}
      />
    ) : (
      titleBar
    );

  useEffect(() => {
    const layoutDisposable = layoutService.onDidChangeLayout(forceRender);
    const viewProviderDisposable = views.onDidRegisterViewProvider(forceRender);
    const preferenceDisposable = preferenceService.onDidChangePreference(bumpPreferenceRevision);
    const themeDisposable = themes.onDidChangeThemes(forceRender);

    return () => {
      layoutDisposable.dispose();
      viewProviderDisposable.dispose();
      preferenceDisposable.dispose();
      themeDisposable.dispose();
    };
  }, [forceRender, layoutService, preferenceService, themes, views]);

  useEffect(() => {
    if (!activeViewContainerId) {
      return;
    }

    for (const view of getVisibleWorkbenchViews(
      { views },
      activeViewContainerId,
      contextKeySnapshot,
    )) {
      void extensionActivation.activateView(view.id).then(forceRender);
    }
  }, [activeViewContainerId, contextKeySnapshot, extensionActivation, forceRender, views]);

  useEffect(() => {
    if (!activePanelViewContainerId) {
      return;
    }

    for (const view of getVisibleWorkbenchViews(
      { views },
      activePanelViewContainerId,
      contextKeySnapshot,
    )) {
      void extensionActivation.activateView(view.id).then(forceRender);
    }
  }, [activePanelViewContainerId, contextKeySnapshot, extensionActivation, forceRender, views]);

  useEffect(() => {
    if (!layout.auxiliaryBar.visible) {
      return;
    }

    for (const container of views.getViewContainers('auxiliarybar')) {
      for (const view of getVisibleWorkbenchViews({ views }, container.id, contextKeySnapshot)) {
        void extensionActivation.activateView(view.id).then(forceRender);
      }
    }
  }, [contextKeySnapshot, extensionActivation, forceRender, layout.auxiliaryBar.visible, views]);

  useEffect(() => {
    const publication = settingsCapabilityPublisher.publishSettingsCapability(settingsCapability);
    if (publication.kind === 'already-registered') return undefined;

    return () => {
      publication.disposable.dispose();
    };
  }, [settingsCapability, settingsCapabilityPublisher]);

  const openSettings = useCallback(
    (categoryId?: string) => {
      showSettingsModal(categoryId);
      if (categoryId === undefined && commands.hasCommand(OPEN_SETTINGS_COMMAND_ID)) {
        void executeCommand(OPEN_SETTINGS_COMMAND_ID).catch(() => undefined);
      }
    },
    [commands, executeCommand, showSettingsModal],
  );

  const resolvedCommandHost = useMemo(():
    false | Omit<WorkbenchCommandHostProps, 'onOpenSettings'> => {
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
      commandPaletteCloseLabel:
        hostProps.commandPaletteCloseLabel ?? chromeLabels.commandPaletteCloseLabel,
      commandPaletteEmptyLabel:
        hostProps.commandPaletteEmptyLabel ?? chromeLabels.commandPaletteEmptyLabel,
      commandPalettePlaceholder:
        hostProps.commandPalettePlaceholder ?? chromeLabels.commandPalettePlaceholder,
      commandPaletteTitle: hostProps.commandPaletteTitle ?? chromeLabels.commandPaletteTitle,
      quickOpenCloseLabel: hostProps.quickOpenCloseLabel ?? chromeLabels.quickOpenCloseLabel,
      quickOpenEmptyLabel: hostProps.quickOpenEmptyLabel ?? chromeLabels.quickOpenEmptyLabel,
      quickOpenPlaceholder: hostProps.quickOpenPlaceholder ?? chromeLabels.quickOpenPlaceholder,
      quickOpenTitle: hostProps.quickOpenTitle ?? chromeLabels.quickOpenTitle,
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

        return hostProps.onRunCommand?.(command, { ...context, openSettings }) ?? false;
      },
    };
  }, [chromeLabels, commandHost, layoutService, openSettings]);

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

      const contributed = statusBar.getStatusBarItem(item.id);
      if (contributed?.command) {
        void executeCommand(contributed.command).catch(() => undefined);
        return;
      }

      onStatusItemActivate?.(item);
    },
    [
      accountManagement,
      executeCommand,
      onStatusItemActivate,
      openSettings,
      profile,
      showProfileModal,
      statusBar,
    ],
  );

  return (
    <ReactWorkbenchShell
      activityBar={{
        'aria-label': chromeLabels.activityBarAriaLabel,
        visible: layout.activityBar.visible,
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
      statusBarAriaLabel={chromeLabels.statusBarAriaLabel}
      onStatusItemActivate={handleStatusItemActivate}
      primarySidebar={{
        isVisible: layout.sideBar.visible,
        // Provider layout still stores sideBar.sizePercent; convert at the shell boundary
        // until workbench-core persists pixel widths directly.
        maxPrimarySizePx: WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX,
        minPrimarySizePx: WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX,
        node:
          primarySidebar ??
          renderDefaultPrimarySidebar(
            { viewHostFactories, views },
            activeViewContainerId,
            catalogUrl,
            catalogTrustPolicy,
            contextKeySnapshot,
          ),
        onSizePxChange: (sizePx) => {
          layoutService.setSideBarSizePercent(workbenchHostPrimarySidebarSizePercentFromPx(sizePx));
        },
        primarySizePx: workbenchHostPrimarySidebarSizePxFromPercent(layout.sideBar.sizePercent),
      }}
      auxiliarySidebar={{
        isVisible: layout.auxiliaryBar.visible,
        node: renderDefaultAuxiliarySidebar(
          { viewHostFactories, views },
          contextKeySnapshot,
          catalogUrl,
          catalogTrustPolicy,
        ),
      }}
      bottomPanel={{
        isVisible: layout.panel.visible,
        node: renderDefaultBottomPanel({ viewHostFactories, views }, activePanelViewContainerId, {
          catalogTrustPolicy,
          catalogUrl,
          contextKeys: contextKeySnapshot,
          onActiveViewContainerChange: (viewContainerId) => {
            layoutService.setActivePanelViewContainer(viewContainerId);
            if (!layout.panel.visible) {
              layoutService.setPanelVisible(true);
            }
          },
        }),
        onSizePercentChange: (sizePercent) => {
          layoutService.setPanelSizePercent(sizePercent);
        },
        sizePercent: layout.panel.sizePercent,
      }}
      rootClassName={rootClassName}
      secondaryArea={resolvedEditorArea}
      statusSections={resolvedStatusSections}
      titleBar={resolvedTitleBar}
      theme={resolvedWorkbenchTheme}
      themePreset={activeThemePreset}
      shellPreset={shellPreset}
      overlays={
        <>
          {overlays}
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
              title={chromeLabels.settingsLabel}
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
            <WorkbenchProfileModal
              extraContent={profileExtraContent}
              profile={profile}
              onClose={() => setProfileOpen(false)}
            />
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
  appIcon,
  helpContent,
  isAuxiliarySidebarVisible,
  isPanelVisible,
  isPrimarySidebarVisible,
  showAuxiliarySidebarLayoutToggle,
  showPanelLayoutToggle,
  title,
  titleBarActions,
  titleMeta,
  onHelpOpen,
  onToggleAuxiliarySidebar,
  onTogglePanel,
  onTogglePrimarySidebar,
}: {
  appIcon: ReactNode | undefined;
  helpContent: ReactNode | undefined;
  isAuxiliarySidebarVisible: boolean;
  isPanelVisible: boolean;
  isPrimarySidebarVisible: boolean;
  showAuxiliarySidebarLayoutToggle: boolean;
  showPanelLayoutToggle: boolean;
  title: ReactNode;
  titleBarActions: ReactNode | undefined;
  titleMeta: ReactNode | undefined;
  onHelpOpen: () => void;
  onToggleAuxiliarySidebar: () => void;
  onTogglePanel: () => void;
  onTogglePrimarySidebar: () => void;
}) {
  return (
    <>
      <div className="workbench-shell-titlebar__identity">
        {appIcon ? (
          <span aria-hidden className="workbench-shell-titlebar__app-icon">
            {appIcon}
          </span>
        ) : null}
        <span className="workbench-shell-titlebar__title">{title}</span>
        {titleMeta ? <span className="workbench-shell-titlebar__meta">{titleMeta}</span> : null}
      </div>
      <div className="workbench-shell-titlebar__actions">
        <WorkbenchShellTitleBarLayoutControls
          isAuxiliarySidebarVisible={isAuxiliarySidebarVisible}
          isPanelVisible={isPanelVisible}
          isPrimarySidebarVisible={isPrimarySidebarVisible}
          onToggleAuxiliarySidebar={
            showAuxiliarySidebarLayoutToggle ? onToggleAuxiliarySidebar : undefined
          }
          onTogglePanel={showPanelLayoutToggle ? onTogglePanel : undefined}
          onTogglePrimarySidebar={onTogglePrimarySidebar}
        />
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
