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
import {
  Badge,
  Button,
  Checkbox,
  Field,
  IconButton,
  Select,
} from '@workbench-kit/react/primitives';
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
import {
  WORKBENCH_SETTINGS_CAPABILITY_ID,
  applyThemeTokenOverrides,
} from '@workbench-kit/workbench-core';
import type {
  PreferenceService,
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
import { WorkbenchProfileModal, type WorkbenchProfileInput } from './workbench-profile-modal.js';

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

export interface WorkbenchThemeOption {
  description?: ReactNode;
  id: string;
  label: string;
}

const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';
const APPEARANCE_SETTINGS_CATEGORY_ID = 'workbench.appearance';
const SETTINGS_EXTENSION_ID = 'workbench-kit.builtin.settings';
const WORKBENCH_PREFERENCE_SCOPES = [
  { id: 'default', label: 'Default' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'local', label: 'Local' },
] as const satisfies ReadonlyArray<{ id: PreferenceScope; label: string }>;

function formatPreferenceScopeLabel(scope: PreferenceScope): string {
  return WORKBENCH_PREFERENCE_SCOPES.find((candidate) => candidate.id === scope)?.label ?? scope;
}

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
      createDefaultStatusSections(extensionRegistry, missingExtensionIds, profile),
    [extensionRegistry, missingExtensionIds, profile, statusSections],
  );
  const activeViewContainerId = layout.sideBar.activeViewContainer;
  const activityItems = sortActivityBarItems(
    createActivityItems(extensionRegistry, activeViewContainerId),
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
      .sort(
        (left, right) =>
          (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
      )
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
  profile: WorkbenchProfileInput | undefined,
): StatusBarSectionModel[] {
  const dependencyDiagnostics = extensionRegistry.getDependencyDiagnostics();
  const errorDependencyDiagnostics = dependencyDiagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

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

function createSettingsCategories(
  extensionRegistry: ReturnType<typeof useWorkbench>['extensionRegistry'],
  {
    activeScope,
    locale,
    onLocaleChange,
    onThemeChange,
    preferenceService,
    theme,
    themeOptions,
  }: WorkbenchAppearanceSettingsInput & {
    activeScope: PreferenceScope;
    preferenceService: PreferenceService;
  },
): WorkbenchSettingsCategory[] {
  const configurations = extensionRegistry.configurations.getConfigurations();
  const mergedThemeOptions = mergeThemeOptions(themeOptions, extensionRegistry.themes.getThemes());
  const localeOptions = buildLocaleOptions(extensionRegistry.localizations.getLocalizations());
  const appearanceCategory = createAppearanceSettingsCategory({
    locale,
    localeOptions,
    onLocaleChange,
    onThemeChange,
    theme,
    themeOptions: mergedThemeOptions,
  });

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
                <SettingContributionField
                  key={key}
                  activeScope={activeScope}
                  preferenceService={preferenceService}
                  propertyKey={key}
                  propertyValue={value}
                />
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
  locale?: string | undefined;
  localeOptions?: readonly WorkbenchLocaleOption[] | undefined;
  onLocaleChange?: ((locale: string) => void) | undefined;
  onThemeChange?: ((theme: string) => void) | undefined;
  theme?: string | undefined;
  themeOptions?: readonly WorkbenchThemeOption[] | undefined;
}

export interface WorkbenchLocaleOption {
  id: string;
  label: string;
}

function mergeThemeOptions(
  baseOptions: readonly WorkbenchThemeOption[] | undefined,
  contributedThemes: readonly {
    id: string;
    label: string;
    tokenOverrides?: Record<string, string> | undefined;
  }[],
): readonly WorkbenchThemeOption[] {
  const merged = new Map<string, WorkbenchThemeOption>();

  for (const option of baseOptions ?? []) {
    merged.set(option.id, option);
  }

  for (const theme of contributedThemes) {
    merged.set(theme.id, {
      description: theme.tokenOverrides
        ? 'Contributed theme with token overrides.'
        : 'Contributed theme.',
      id: theme.id,
      label: theme.label,
    });
  }

  return [...merged.values()];
}

function buildLocaleOptions(
  localizations: readonly { locale: string; label: string }[],
): readonly WorkbenchLocaleOption[] {
  const options: WorkbenchLocaleOption[] = [{ id: 'en', label: 'English' }];

  for (const localization of localizations) {
    options.push({ id: localization.locale, label: localization.label });
  }

  return options;
}

function createAppearanceSettingsCategory({
  locale,
  localeOptions,
  onLocaleChange,
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput): WorkbenchSettingsCategory | undefined {
  if (!themeOptions?.length && !localeOptions?.length) {
    return undefined;
  }

  return {
    content: (
      <AppearanceSettingsSection
        locale={locale}
        localeOptions={localeOptions ?? []}
        theme={theme}
        themeOptions={themeOptions ?? []}
        onLocaleChange={onLocaleChange}
        onThemeChange={onThemeChange}
      />
    ),
    id: APPEARANCE_SETTINGS_CATEGORY_ID,
    label: 'Appearance',
  };
}

function AppearanceSettingsSection({
  locale,
  localeOptions,
  onLocaleChange,
  onThemeChange,
  theme,
  themeOptions,
}: WorkbenchAppearanceSettingsInput & {
  localeOptions: readonly WorkbenchLocaleOption[];
  themeOptions: readonly WorkbenchThemeOption[];
}) {
  const { extensionRegistry } = useWorkbench();
  const previousThemeOverridesRef = useRef<Readonly<Record<string, string>> | undefined>(undefined);
  const selectedTheme = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];
  const selectedThemeId = selectedTheme?.id ?? '';
  const selectedLocale = localeOptions.find((option) => option.id === locale) ?? localeOptions[0];
  const selectedLocaleId = selectedLocale?.id ?? 'en';

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const contributedTheme = extensionRegistry.themes.getTheme(selectedThemeId);
    applyThemeTokenOverrides(
      document.documentElement,
      contributedTheme?.tokenOverrides,
      previousThemeOverridesRef.current,
    );
    previousThemeOverridesRef.current = contributedTheme?.tokenOverrides;
  }, [extensionRegistry.themes, selectedThemeId]);

  return (
    <WorkbenchSettingsSection
      id="workbench-settings-appearance"
      title="Appearance"
      description="Configure how the workbench is presented."
    >
      <div className="workbench-appearance-settings">
        {themeOptions.length ? (
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
        ) : null}
        {localeOptions.length > 1 ? (
          <Field
            className="workbench-appearance-settings__field"
            label="Display language"
            description="Select the active workbench display language."
          >
            <Select
              aria-label="Display language"
              controlWidth="full"
              disabled={!onLocaleChange}
              value={selectedLocaleId}
              onValueChange={(nextLocale) => onLocaleChange?.(nextLocale)}
            >
              {localeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
    </WorkbenchSettingsSection>
  );
}

function SettingContributionField({
  activeScope,
  preferenceService,
  propertyKey,
  propertyValue,
}: {
  activeScope: PreferenceScope;
  preferenceService: PreferenceService;
  propertyKey: string;
  propertyValue: unknown;
}) {
  const property = isRecord(propertyValue) ? propertyValue : {};
  const description = typeof property.description === 'string' ? property.description : undefined;
  const scope = typeof property.scope === 'string' ? property.scope : undefined;
  const type = formatSettingType(property.type);
  const hasDefault = Object.prototype.hasOwnProperty.call(property, 'default');
  const inspection = preferenceService.inspect(propertyKey);
  const scopedValue = preferenceService.getScopedValue(propertyKey, activeScope);
  const editableValue =
    scopedValue !== undefined ? scopedValue : (inspection.effectiveValue ?? property.default);

  return (
    <Field
      className="workbench-settings-contribution-field"
      label={<code>{propertyKey}</code>}
      description={description}
    >
      <div className="workbench-settings-contribution-meta">
        {type ? <Badge variant="muted">{type}</Badge> : null}
        {scope ? <Badge variant="muted">{scope}</Badge> : null}
        <Badge variant="muted">effective: {formatSettingDefault(inspection.effectiveValue)}</Badge>
      </div>
      {property.type === 'boolean' ? (
        <Checkbox
          checked={editableValue === true}
          label={`${formatPreferenceScopeLabel(activeScope)} value`}
          onCheckedChange={(checked) => {
            preferenceService.setScopedValue(propertyKey, activeScope, checked);
          }}
        />
      ) : hasDefault ? (
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
