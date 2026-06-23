import { useMemo } from 'react';
import { useResolvedWorkbenchTheme } from './theme';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { cxCodicon } from '../utils/codicon';
import type { StatusBarItemModel, StatusBarSectionModel } from './StatusBar';
import type { WorkbenchShellProps } from './WorkbenchShell';
import { WorkbenchShell } from './WorkbenchShell';
import type { WorkbenchShellCommandContext } from './commands';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT, useWorkbenchShellState } from './shellState';
import type {
  WorkbenchActivityChangeEvent,
  WorkbenchActivityDescriptor,
  WorkbenchStandaloneBootstrap,
  WorkbenchStandaloneBootstrapEvent,
  WorkbenchTheme,
} from './standalone';
import { WorkspaceDraftsProvider } from './workspace/WorkspaceDraftsContext';

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
  primarySidebarSizePercent: number;
  theme: TTheme;
  showActivity: (activityId: TActivityId) => void;
  activateActivity: (activityId: TActivityId) => void;
  setTheme: (theme: TTheme) => void;
  setPrimarySidebarSizePercent: (sizePercent: number) => void;
  setPrimarySidebarVisible: (isVisible: boolean) => void;
  togglePrimarySidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsCategoryId: (settingsCategoryId: string) => void;
  setSettingsScopeId: (settingsScopeId: string) => void;
  setSettingsSearchValue: (settingsSearchValue: string) => void;
}

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
  includeSettings?: boolean;
  maxPrimarySidebarSizePercent?: number;
  minPrimarySidebarSizePercent?: number;
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
  onStatusItemActivate?: (
    item: StatusBarItemModel,
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => void;
  onEvent?: (event: WorkbenchStandaloneBootstrapEvent<TActivityId>) => void;
  renderPrimarySidebar: (
    context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  ) => ReactNode;
  renderOverlays?: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  renderSecondaryArea: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  renderTitleBar?: (context: WorkbenchStandaloneShellContext<TActivityId, TTheme>) => ReactNode;
  rootClassName?: string;
  rootStyle?: CSSProperties;
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
  includeSettings = true,
  maxPrimarySidebarSizePercent,
  minPrimarySidebarSizePercent,
  onActivityActivate,
  onActivityBarContextMenu,
  onActivityBarItemActivate,
  onStatusItemActivate,
  onEvent,
  renderPrimarySidebar,
  renderOverlays,
  renderSecondaryArea,
  renderTitleBar,
  rootClassName,
  rootStyle,
  settingsItemIcon,
  settingsItemId = 'settings',
  settingsItemLabel = 'Settings',
  primarySidebarClassName,
  primarySidebarStyle,
  getStatusSections,
  documentThemePreset,
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
    primarySidebarSizePercent:
      initialState?.primarySidebarSizePercent ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT,
    settingsCategoryId: initialState?.settingsCategoryId ?? '',
    settingsScopeId: initialState?.settingsScopeId ?? '',
    settingsSearchValue: initialState?.settingsSearchValue ?? '',
    theme: (initialState?.theme ?? contract.initialTheme ?? DEFAULT_THEME) as TTheme,
  });
  const {
    isPrimarySidebarVisible,
    isSettingsOpen,
    primarySidebarSizePercent,
    theme,
    activeActivityId,
  } = shell.state;
  const resolvedTheme = useResolvedWorkbenchTheme(theme as WorkbenchTheme | 'system');

  const emitEvent = (event: WorkbenchStandaloneBootstrapEvent<TActivityId>) => {
    onEvent?.(event);
  };
  const showActivity = (activityId: TActivityId) => {
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
      showActivity: shell.showActivity,
      togglePrimarySidebar: shell.togglePrimarySidebar,
    },
    isPrimarySidebarVisible,
    isSettingsOpen,
    primarySidebarSizePercent,
    theme,
    showActivity,
    activateActivity,
    setTheme: shell.setTheme,
    setPrimarySidebarSizePercent: shell.setPrimarySidebarSizePercent,
    setPrimarySidebarVisible: shell.setPrimarySidebarVisible,
    togglePrimarySidebar: shell.togglePrimarySidebar,
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
      primarySidebarSizePercent,
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

  const hasSettingsSection = includeSettings && settingsItemId !== '';

  const primarySidebarNode = renderPrimarySidebar(context);
  const secondaryArea = renderSecondaryArea(context);
  const overlays = renderOverlays?.(context);
  const titleBar = renderTitleBar?.(context);

  return (
    <WorkspaceDraftsProvider>
      <WorkbenchShell
        activityBar={{
          ...activityBar,
          items: activityBarItems,
          secondaryItems: hasSettingsSection
            ? [
                {
                  id: settingsItemId,
                  icon: settingsItemIcon ?? <i className="codicon codicon-settings-gear" />,
                  label: settingsItemLabel,
                  active: isSettingsOpen,
                },
              ]
            : [],
          onContextMenu: (event) => onActivityBarContextMenu?.(event, context),
          onItemActivate: (item) => {
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
          maxPrimarySizePercent: maxPrimarySidebarSizePercent,
          minPrimarySizePercent: minPrimarySidebarSizePercent,
          onSizePercentChange: shell.setPrimarySidebarSizePercent,
          primarySizePercent: primarySidebarSizePercent,
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
        titleBar={titleBar}
        overlays={overlays}
      />
    </WorkspaceDraftsProvider>
  );
}
