import { useMemo, useRef } from 'react';
import { useResolvedWorkbenchTheme } from '../theme/theme';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useWorkbenchStandaloneShellStateSync } from './useWorkbenchStandaloneShellStateSync';
import {
  WorkbenchStandaloneShellReactContextProvider,
  type WorkbenchStandaloneShellStateChange,
} from './workbenchStandaloneShellReactContext';
import { cxCodicon } from '../../utils/codicon';
import type { StatusBarItemModel, StatusBarSectionModel } from './StatusBar';
import type { WorkbenchShellProps } from './WorkbenchShell';
import { WorkbenchShell } from './WorkbenchShell';
import type { WorkbenchShellCommandContext } from '../commands/commands';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PX, useWorkbenchShellState } from './shellState';
import type {
  WorkbenchActivityChangeEvent,
  WorkbenchActivityDescriptor,
  WorkbenchStandaloneBootstrap,
  WorkbenchStandaloneBootstrapEvent,
  WorkbenchTheme,
} from './standalone';
import { WorkspaceDraftsProvider } from '../workspace/WorkspaceDraftsContext';

const DEFAULT_THEME: WorkbenchTheme = 'dark';
const DEFAULT_ACTIVITY_ID = 'explorer';

/**
 * Stable host context passed to `WorkbenchStandaloneShell` render and event callbacks.
 * See `docs/workbench/standalone-host.md` for the public contract.
 */
export interface WorkbenchStandaloneShellContext<
  TActivityId extends string = string,
  TTheme extends WorkbenchTheme = WorkbenchTheme,
> {
  activityId: TActivityId;
  commandContext: WorkbenchShellCommandContext<TActivityId>;
  isPrimarySidebarVisible: boolean;
  isSettingsOpen: boolean;
  primarySidebarLifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId>;
  primarySidebarSizePx: number;
  theme: TTheme;
  showActivity: (activityId: TActivityId) => void;
  activateActivity: (activityId: TActivityId) => void;
  setTheme: (theme: TTheme) => void;
  setPrimarySidebarSizePx: (sizePx: number) => void;
  setPrimarySidebarVisible: (isVisible: boolean) => void;
  togglePrimarySidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsCategoryId: (settingsCategoryId: string) => void;
  setSettingsScopeId: (settingsScopeId: string) => void;
  setSettingsSearchValue: (settingsSearchValue: string) => void;
}

export type WorkbenchPrimarySidebarLifecycleReason =
  'activity-switch' | 'initial' | 'sidebar-hide' | 'sidebar-show';

export interface WorkbenchPrimarySidebarLifecycle<TActivityId extends string = string> {
  activityId: TActivityId;
  previousActivityId: TActivityId;
  isVisible: boolean;
  wasVisible: boolean;
  reason: WorkbenchPrimarySidebarLifecycleReason;
}

export interface WorkbenchPrimarySidebarLifecycleCallbacks<TActivityId extends string = string> {
  onDidChange?: (event: WorkbenchPrimarySidebarLifecycle<TActivityId>) => void;
  onDidHide?: (event: WorkbenchPrimarySidebarLifecycle<TActivityId>) => void;
  onDidShow?: (event: WorkbenchPrimarySidebarLifecycle<TActivityId>) => void;
  onDidSwitchActivity?: (event: WorkbenchPrimarySidebarLifecycle<TActivityId>) => void;
}

export interface WorkbenchActivityLifecycleEvent<TActivityId extends string = string> {
  activityId: TActivityId;
  activeActivityId: TActivityId;
  previousActivityId: TActivityId;
  isVisible: boolean;
  wasVisible: boolean;
  reason: WorkbenchPrimarySidebarLifecycleReason;
  primarySidebarLifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId>;
}

export interface WorkbenchActivityLifecycleCallbacks<TActivityId extends string = string> {
  onDidActivate?: (event: WorkbenchActivityLifecycleEvent<TActivityId>) => void;
  onDidDeactivate?: (event: WorkbenchActivityLifecycleEvent<TActivityId>) => void;
  onDidHide?: (event: WorkbenchActivityLifecycleEvent<TActivityId>) => void;
  onDidShow?: (event: WorkbenchActivityLifecycleEvent<TActivityId>) => void;
}

export type WorkbenchActivityLifecycleCallbackMap<TActivityId extends string = string> = Partial<
  Record<TActivityId, WorkbenchActivityLifecycleCallbacks<TActivityId>>
>;

/**
 * Props for the standalone workbench chrome host. Supply `bootstrap` plus render
 * callbacks; the shell manages activity, theme, sidebar, and settings visibility.
 */
export interface WorkbenchStandaloneShellProps<
  TActivityId extends string = string,
  TTheme extends WorkbenchTheme = WorkbenchTheme,
> {
  bootstrap: WorkbenchStandaloneBootstrap<TActivityId>;
  activityBar?: Omit<
    WorkbenchShellProps['activityBar'],
    'items' | 'secondaryItems' | 'onContextMenu' | 'onItemActivate'
  >;
  compactStatus?: boolean;
  /**
   * When true, renders a Help utility item in the activity bar footer
   * immediately before Settings (legacy Content Hub pattern).
   */
  includeHelp?: boolean;
  includeSettings?: boolean;
  /** Host-controlled Help open state for footer item active styling. */
  isHelpOpen?: boolean;
  maxPrimarySidebarSizePx?: number;
  minPrimarySidebarSizePx?: number;
  activityLifecycleCallbacks?: WorkbenchActivityLifecycleCallbackMap<TActivityId>;
  primarySidebarLifecycleCallbacks?: WorkbenchPrimarySidebarLifecycleCallbacks<TActivityId>;
  onActivityActivate?: (
    event: WorkbenchActivityChangeEvent<TActivityId>,
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => void;
  onActivityBarContextMenu?: (
    event: MouseEvent<HTMLElement>,
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => void;
  onActivityBarItemActivate?: (
    itemId: TActivityId | string,
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => void;
  /** Fired when the footer Help utility item is activated. */
  onHelpActivate?: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => void;
  onStatusItemActivate?: (
    item: StatusBarItemModel,
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => void;
  onEvent?: (event: WorkbenchStandaloneBootstrapEvent<TActivityId>) => void;
  /**
   * Fired once on mount (`kind: 'initial'`) and when activity, sidebar visibility/size,
   * settings open state, or theme changes. Use for persistence and instrumentation instead
   * of duplicating effects in each render slot.
   */
  onShellStateChange?: (change: WorkbenchStandaloneShellStateChange<TActivityId, TTheme>) => void;
  /**
   * Optional wrapper around the workbench chrome tree. Receives the stable shell context and
   * the default shell element so hosts can add a single instrumentation or domain provider.
   */
  renderShellHost?: (
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
    shell: ReactNode,
  ) => ReactNode;
  renderPrimarySidebar: (
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => ReactNode;
  renderOverlays?: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  renderSecondaryArea: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  renderTitleBar?: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  rootClassName?: string;
  rootStyle?: CSSProperties;
  helpItemIcon?: ReactNode;
  helpItemId?: string;
  helpItemLabel?: string;
  settingsItemIcon?: ReactNode;
  settingsItemId?: string;
  settingsItemLabel?: string;
  primarySidebarClassName?: string;
  primarySidebarStyle?: CSSProperties;
  getStatusSections?: (
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => StatusBarSectionModel[];
  /** Active CSS preset for the resolved document theme (e.g. `skyblue`, `purple`). */
  documentThemePreset?: string;
  /** Shell density preset (e.g. `default`, `workbench`). */
  shellPreset?: string;
}

function toWorkbenchActivityItems<TActivityId extends string>(
  activities: WorkbenchActivityDescriptor<TActivityId>[],
): Array<{ icon: ReactNode; id: TActivityId; label: string }> {
  return activities.map((activity) => ({
    id: activity.id,
    label: activity.label,
    icon: activity.iconNode ?? (activity.icon ? <i className={cxCodicon(activity.icon)} /> : null),
  }));
}

export function WorkbenchStandaloneShell<
  TActivityId extends string = string,
  TTheme extends WorkbenchTheme = WorkbenchTheme,
>({
  bootstrap,
  activityBar,
  compactStatus = true,
  includeHelp = false,
  includeSettings = true,
  isHelpOpen = false,
  maxPrimarySidebarSizePx,
  minPrimarySidebarSizePx,
  activityLifecycleCallbacks,
  primarySidebarLifecycleCallbacks,
  onActivityActivate,
  onActivityBarContextMenu,
  onActivityBarItemActivate,
  onHelpActivate,
  onStatusItemActivate,
  onEvent,
  onShellStateChange,
  renderShellHost,
  renderPrimarySidebar,
  renderOverlays,
  renderSecondaryArea,
  renderTitleBar,
  rootClassName,
  rootStyle,
  helpItemIcon,
  helpItemId = 'help',
  helpItemLabel = 'Help',
  settingsItemIcon,
  settingsItemId = 'settings',
  settingsItemLabel = 'Settings',
  primarySidebarClassName,
  primarySidebarStyle,
  getStatusSections,
  documentThemePreset,
  shellPreset,
}: WorkbenchStandaloneShellProps<TActivityId, TTheme>) {
  const { contract, initialState } = bootstrap;
  const activityIds = useMemo(
    () => new Set(contract.activities.map((activity) => activity.id)),
    [contract.activities],
  );

  const shell = useWorkbenchShellState<TActivityId, TTheme>({
    activeActivityId:
      initialState?.activeActivityId ??
      contract.activities[0]?.id ??
      (DEFAULT_ACTIVITY_ID as TActivityId),
    isPrimarySidebarVisible: initialState?.isPrimarySidebarVisible ?? true,
    isSettingsOpen: initialState?.isSettingsOpen ?? false,
    primarySidebarSizePx: initialState?.primarySidebarSizePx ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PX,
    settingsCategoryId: initialState?.settingsCategoryId ?? '',
    settingsScopeId: initialState?.settingsScopeId ?? '',
    settingsSearchValue: initialState?.settingsSearchValue ?? '',
    theme: (initialState?.theme ?? contract.initialTheme ?? DEFAULT_THEME) as TTheme,
  });
  const { isPrimarySidebarVisible, isSettingsOpen, primarySidebarSizePx, theme, activeActivityId } =
    shell.state;
  const primarySidebarLifecycleRef = useRef<WorkbenchPrimarySidebarLifecycle<TActivityId>>({
    activityId: activeActivityId,
    previousActivityId: activeActivityId,
    isVisible: isPrimarySidebarVisible,
    wasVisible: isPrimarySidebarVisible,
    reason: 'initial',
  });
  const resolvedTheme = useResolvedWorkbenchTheme(theme as WorkbenchTheme | 'system');

  const emitEvent = (event: WorkbenchStandaloneBootstrapEvent<TActivityId>) => {
    onEvent?.(event);
  };
  const emitPrimarySidebarLifecycle = (
    lifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId>,
  ) => {
    primarySidebarLifecycleCallbacks?.onDidChange?.(lifecycle);

    if (lifecycle.reason === 'activity-switch') {
      primarySidebarLifecycleCallbacks?.onDidSwitchActivity?.(lifecycle);
    }

    if (!lifecycle.isVisible && lifecycle.wasVisible) {
      primarySidebarLifecycleCallbacks?.onDidHide?.(lifecycle);
    }

    if (lifecycle.isVisible && !lifecycle.wasVisible) {
      primarySidebarLifecycleCallbacks?.onDidShow?.(lifecycle);
    }
  };
  const createActivityLifecycleEvent = (
    lifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId>,
    activityId: TActivityId,
    isVisible: boolean,
    wasVisible: boolean,
  ): WorkbenchActivityLifecycleEvent<TActivityId> => ({
    activityId,
    activeActivityId: lifecycle.activityId,
    previousActivityId: lifecycle.previousActivityId,
    isVisible,
    wasVisible,
    reason: lifecycle.reason,
    primarySidebarLifecycle: lifecycle,
  });
  const emitActivityLifecycle = (lifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId>) => {
    if (lifecycle.reason === 'activity-switch') {
      const previousCallbacks = activityLifecycleCallbacks?.[lifecycle.previousActivityId];
      const nextCallbacks = activityLifecycleCallbacks?.[lifecycle.activityId];
      const previousEvent = createActivityLifecycleEvent(
        lifecycle,
        lifecycle.previousActivityId,
        false,
        lifecycle.wasVisible,
      );
      const nextEvent = createActivityLifecycleEvent(
        lifecycle,
        lifecycle.activityId,
        lifecycle.isVisible,
        false,
      );

      previousCallbacks?.onDidDeactivate?.(previousEvent);
      if (lifecycle.wasVisible) {
        previousCallbacks?.onDidHide?.(previousEvent);
      }

      nextCallbacks?.onDidActivate?.(nextEvent);
      if (lifecycle.isVisible) {
        nextCallbacks?.onDidShow?.(nextEvent);
      }
      return;
    }

    const callbacks = activityLifecycleCallbacks?.[lifecycle.activityId];
    if (!callbacks) return;

    const event = createActivityLifecycleEvent(
      lifecycle,
      lifecycle.activityId,
      lifecycle.isVisible,
      lifecycle.wasVisible,
    );

    if (!lifecycle.isVisible && lifecycle.wasVisible) {
      callbacks.onDidHide?.(event);
    }

    if (lifecycle.isVisible && !lifecycle.wasVisible) {
      callbacks.onDidShow?.(event);
    }
  };
  const setPrimarySidebarLifecycle = (
    activityId: TActivityId,
    isVisible: boolean,
    reason: WorkbenchPrimarySidebarLifecycleReason,
  ) => {
    const lifecycle: WorkbenchPrimarySidebarLifecycle<TActivityId> = {
      activityId,
      previousActivityId: activeActivityId,
      isVisible,
      wasVisible: isPrimarySidebarVisible,
      reason,
    };
    primarySidebarLifecycleRef.current = lifecycle;
    emitPrimarySidebarLifecycle(lifecycle);
    emitActivityLifecycle(lifecycle);
  };
  const showActivity = (activityId: TActivityId) => {
    setPrimarySidebarLifecycle(
      activityId,
      true,
      activityId === activeActivityId ? 'sidebar-show' : 'activity-switch',
    );
    shell.showActivity(activityId);
    emitEvent({ type: 'activity-change', payload: { nextActivityId: activityId } });
    onActivityActivate?.(
      { nextActivityId: activityId },
      createContext({
        activityId,
        shell,
      }),
    );
  };
  const activateActivity = (activityId: TActivityId) => {
    const isCurrentActivity = activityId === activeActivityId;
    const nextSidebarVisible = !(isCurrentActivity && isPrimarySidebarVisible);

    setPrimarySidebarLifecycle(
      activityId,
      nextSidebarVisible,
      nextSidebarVisible
        ? isCurrentActivity
          ? 'sidebar-show'
          : 'activity-switch'
        : 'sidebar-hide',
    );
    shell.activateActivity(activityId);
    emitEvent({ type: 'activity-change', payload: { nextActivityId: activityId } });
    onActivityActivate?.(
      { nextActivityId: activityId },
      createContext({
        activityId,
        shell,
      }),
    );
  };
  const togglePrimarySidebar = () => {
    const nextSidebarVisible = !isPrimarySidebarVisible;
    setPrimarySidebarLifecycle(
      activeActivityId,
      nextSidebarVisible,
      nextSidebarVisible ? 'sidebar-show' : 'sidebar-hide',
    );
    shell.togglePrimarySidebar();
  };
  const createContext = ({
    activityId,
    shell,
  }: {
    activityId: TActivityId;
    shell: ReturnType<typeof useWorkbenchShellState<TActivityId, TTheme>>;
  }): WorkbenchStandaloneShellContext<TActivityId, TTheme> => ({
    activityId,
    commandContext: {
      isPrimarySidebarVisible,
      openSettings: shell.openSettings,
      showActivity,
      togglePrimarySidebar,
    },
    isPrimarySidebarVisible,
    isSettingsOpen,
    primarySidebarLifecycle: primarySidebarLifecycleRef.current,
    primarySidebarSizePx,
    theme,
    showActivity,
    activateActivity,
    setTheme: shell.setTheme,
    setPrimarySidebarSizePx: shell.setPrimarySidebarSizePx,
    setPrimarySidebarVisible: (isVisible) => {
      setPrimarySidebarLifecycle(
        activeActivityId,
        isVisible,
        isVisible ? 'sidebar-show' : 'sidebar-hide',
      );
      shell.setPrimarySidebarVisible(isVisible);
    },
    togglePrimarySidebar,
    openSettings: shell.openSettings,
    closeSettings: shell.closeSettings,
    setSettingsCategoryId: shell.setSettingsCategoryId,
    setSettingsScopeId: shell.setSettingsScopeId,
    setSettingsSearchValue: shell.setSettingsSearchValue,
  });

  const context = useMemo(
    () => createContext({ activityId: activeActivityId, shell }),
    [
      shell,
      activeActivityId,
      isPrimarySidebarVisible,
      isSettingsOpen,
      primarySidebarSizePx,
      activityLifecycleCallbacks,
      primarySidebarLifecycleCallbacks,
      theme,
    ],
  );

  const statusSections = useMemo(
    () =>
      getStatusSections?.(context) ??
      contract.statusSections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item })),
      })),
    [contract.statusSections, context, getStatusSections],
  );

  const activityItems = useMemo(
    () => toWorkbenchActivityItems(contract.activities),
    [contract.activities],
  );
  const activityBarItems = useMemo(
    () =>
      activityItems.map((item) => ({
        ...item,
        active: item.id === activeActivityId,
      })),
    [activityItems, activeActivityId],
  );

  const hasHelpSection = includeHelp && helpItemId !== '';
  const hasSettingsSection = includeSettings && settingsItemId !== '';
  const secondaryItems = [
    ...(hasHelpSection
      ? [
          {
            id: helpItemId,
            icon: helpItemIcon ?? <i className="codicon codicon-question" />,
            label: helpItemLabel,
            active: isHelpOpen,
          },
        ]
      : []),
    ...(hasSettingsSection
      ? [
          {
            id: settingsItemId,
            icon: settingsItemIcon ?? <i className="codicon codicon-settings-gear" />,
            label: settingsItemLabel,
            active: isSettingsOpen,
          },
        ]
      : []),
  ];

  const primarySidebarNode = renderPrimarySidebar(context);
  const secondaryArea = renderSecondaryArea(context);
  const overlays = renderOverlays?.(context);
  const titleBar = renderTitleBar?.(context);

  const workbenchShell = (
    <>
      <WorkbenchStandaloneShellStateHost
        context={context}
        onShellStateChange={onShellStateChange}
      />
      <WorkbenchShell
        activityBar={{
          ...activityBar,
          items: activityBarItems,
          secondaryItems,
          onContextMenu: (event) => onActivityBarContextMenu?.(event, context),
          onItemActivate: (item) => {
            if (hasHelpSection && item.id === helpItemId) {
              onHelpActivate?.(context);
              onActivityBarItemActivate?.(item.id, context);
              emitEvent({
                type: 'status-message',
                message: 'Help activated',
              });
              return;
            }

            if (item.id === settingsItemId) {
              shell.openSettings();
              emitEvent({
                type: 'status-message',
                message: `Settings ${isSettingsOpen ? 'opened' : 'closed'}`,
              });
              return;
            }

            if (activityIds.has(item.id as TActivityId)) {
              activateActivity(item.id as TActivityId);
              onActivityBarItemActivate?.(item.id, context);
              return;
            }

            onActivityBarItemActivate?.(item.id, context);
          },
        }}
        compactStatus={compactStatus}
        onStatusItemActivate={(item) => onStatusItemActivate?.(item, context)}
        primarySidebar={{
          className: primarySidebarClassName,
          isVisible: isPrimarySidebarVisible,
          maxPrimarySizePx: maxPrimarySidebarSizePx,
          minPrimarySizePx: minPrimarySidebarSizePx,
          onSizePxChange: shell.setPrimarySidebarSizePx,
          primarySizePx: primarySidebarSizePx,
          node: primarySidebarNode,
          style: primarySidebarStyle,
        }}
        rootClassName={rootClassName}
        rootStyle={rootStyle}
        secondaryArea={secondaryArea}
        statusSections={statusSections}
        theme={resolvedTheme}
        themePreference={theme}
        themePreset={documentThemePreset}
        shellPreset={shellPreset}
        titleBar={titleBar}
        overlays={overlays}
      />
    </>
  );

  return (
    <WorkspaceDraftsProvider>
      <WorkbenchStandaloneShellReactContextProvider value={context}>
        {renderShellHost ? renderShellHost(context, workbenchShell) : workbenchShell}
      </WorkbenchStandaloneShellReactContextProvider>
    </WorkspaceDraftsProvider>
  );
}

function WorkbenchStandaloneShellStateHost<
  TActivityId extends string,
  TTheme extends WorkbenchTheme,
>({
  context,
  onShellStateChange,
}: {
  context: WorkbenchStandaloneShellContext<TActivityId, TTheme>;
  onShellStateChange?: (change: WorkbenchStandaloneShellStateChange<TActivityId, TTheme>) => void;
}) {
  useWorkbenchStandaloneShellStateSync(context, onShellStateChange);
  return null;
}
