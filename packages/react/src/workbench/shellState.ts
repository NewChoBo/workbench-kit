import { useReducer } from 'react';

export interface WorkbenchShellInitialState<
  TActivityId extends string = string,
  TTheme extends string = string,
> {
  activeActivityId: TActivityId;
  isPrimarySidebarVisible?: boolean;
  isSettingsOpen?: boolean;
  primarySidebarSizePercent?: number;
  settingsCategoryId?: string;
  settingsScopeId?: string;
  settingsSearchValue?: string;
  theme: TTheme;
}

export interface WorkbenchShellState<
  TActivityId extends string = string,
  TTheme extends string = string,
> {
  activeActivityId: TActivityId;
  isPrimarySidebarVisible: boolean;
  isSettingsOpen: boolean;
  primarySidebarSizePercent: number;
  settingsCategoryId: string;
  settingsScopeId: string;
  settingsSearchValue: string;
  theme: TTheme;
}

export type WorkbenchShellAction<
  TActivityId extends string = string,
  TTheme extends string = string,
> =
  | { activityId: TActivityId; type: 'activate-activity' }
  | { activityId: TActivityId; type: 'show-activity' }
  | { isOpen: boolean; type: 'set-settings-open' }
  | { percent: number; type: 'set-primary-sidebar-size' }
  | { settingsCategoryId: string; type: 'set-settings-category' }
  | { settingsScopeId: string; type: 'set-settings-scope' }
  | { settingsSearchValue: string; type: 'set-settings-search' }
  | { theme: TTheme; type: 'set-theme' }
  | { type: 'close-settings' }
  | { type: 'open-settings' }
  | { type: 'toggle-primary-sidebar' }
  | { isVisible: boolean; type: 'set-primary-sidebar-visible' };

export interface UseWorkbenchShellStateResult<
  TActivityId extends string = string,
  TTheme extends string = string,
> {
  activateActivity: (activityId: TActivityId) => void;
  closeSettings: () => void;
  dispatch: (action: WorkbenchShellAction<TActivityId, TTheme>) => void;
  openSettings: () => void;
  setPrimarySidebarSizePercent: (percent: number) => void;
  setPrimarySidebarVisible: (isVisible: boolean) => void;
  setSettingsCategoryId: (settingsCategoryId: string) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setSettingsScopeId: (settingsScopeId: string) => void;
  setSettingsSearchValue: (settingsSearchValue: string) => void;
  setTheme: (theme: TTheme) => void;
  showActivity: (activityId: TActivityId) => void;
  state: WorkbenchShellState<TActivityId, TTheme>;
  togglePrimarySidebar: () => void;
}

const DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT = 24;
const MIN_PRIMARY_SIDEBAR_SIZE_PERCENT = 10;
const MAX_PRIMARY_SIDEBAR_SIZE_PERCENT = 90;

function clampPrimarySidebarSizePercent(percent: number, fallback: number) {
  if (!Number.isFinite(percent)) return fallback;
  return Math.min(
    MAX_PRIMARY_SIDEBAR_SIZE_PERCENT,
    Math.max(MIN_PRIMARY_SIDEBAR_SIZE_PERCENT, percent),
  );
}

export function initializeWorkbenchShellState<TActivityId extends string, TTheme extends string>({
  activeActivityId,
  isPrimarySidebarVisible = true,
  isSettingsOpen = false,
  primarySidebarSizePercent = DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT,
  settingsCategoryId = '',
  settingsScopeId = '',
  settingsSearchValue = '',
  theme,
}: WorkbenchShellInitialState<TActivityId, TTheme>): WorkbenchShellState<TActivityId, TTheme> {
  return {
    activeActivityId,
    isPrimarySidebarVisible,
    isSettingsOpen,
    primarySidebarSizePercent: clampPrimarySidebarSizePercent(
      primarySidebarSizePercent,
      DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT,
    ),
    settingsCategoryId,
    settingsScopeId,
    settingsSearchValue,
    theme,
  };
}

export function workbenchShellStateReducer<TActivityId extends string, TTheme extends string>(
  state: WorkbenchShellState<TActivityId, TTheme>,
  action: WorkbenchShellAction<TActivityId, TTheme>,
): WorkbenchShellState<TActivityId, TTheme> {
  if (action.type === 'activate-activity') {
    const shouldHideSidebar =
      action.activityId === state.activeActivityId && state.isPrimarySidebarVisible;

    return {
      ...state,
      activeActivityId: action.activityId,
      isPrimarySidebarVisible: !shouldHideSidebar,
    };
  }

  if (action.type === 'show-activity') {
    return {
      ...state,
      activeActivityId: action.activityId,
      isPrimarySidebarVisible: true,
    };
  }

  if (action.type === 'set-primary-sidebar-visible') {
    return { ...state, isPrimarySidebarVisible: action.isVisible };
  }

  if (action.type === 'toggle-primary-sidebar') {
    return { ...state, isPrimarySidebarVisible: !state.isPrimarySidebarVisible };
  }

  if (action.type === 'set-primary-sidebar-size') {
    return {
      ...state,
      primarySidebarSizePercent: clampPrimarySidebarSizePercent(
        action.percent,
        state.primarySidebarSizePercent,
      ),
    };
  }

  if (action.type === 'set-theme') {
    return { ...state, theme: action.theme };
  }

  if (action.type === 'open-settings') {
    return { ...state, isSettingsOpen: true };
  }

  if (action.type === 'close-settings') {
    return { ...state, isSettingsOpen: false };
  }

  if (action.type === 'set-settings-open') {
    return { ...state, isSettingsOpen: action.isOpen };
  }

  if (action.type === 'set-settings-category') {
    return { ...state, settingsCategoryId: action.settingsCategoryId };
  }

  if (action.type === 'set-settings-scope') {
    return { ...state, settingsScopeId: action.settingsScopeId };
  }

  return { ...state, settingsSearchValue: action.settingsSearchValue };
}

export function useWorkbenchShellState<TActivityId extends string, TTheme extends string>(
  initialState: WorkbenchShellInitialState<TActivityId, TTheme>,
): UseWorkbenchShellStateResult<TActivityId, TTheme> {
  const [state, dispatch] = useReducer(
    workbenchShellStateReducer<TActivityId, TTheme>,
    initialState,
    initializeWorkbenchShellState,
  );

  return {
    activateActivity: (activityId) => dispatch({ activityId, type: 'activate-activity' }),
    closeSettings: () => dispatch({ type: 'close-settings' }),
    dispatch,
    openSettings: () => dispatch({ type: 'open-settings' }),
    setPrimarySidebarSizePercent: (percent) =>
      dispatch({ percent, type: 'set-primary-sidebar-size' }),
    setPrimarySidebarVisible: (isVisible) =>
      dispatch({ isVisible, type: 'set-primary-sidebar-visible' }),
    setSettingsCategoryId: (settingsCategoryId) =>
      dispatch({ settingsCategoryId, type: 'set-settings-category' }),
    setSettingsOpen: (isOpen) => dispatch({ isOpen, type: 'set-settings-open' }),
    setSettingsScopeId: (settingsScopeId) =>
      dispatch({ settingsScopeId, type: 'set-settings-scope' }),
    setSettingsSearchValue: (settingsSearchValue) =>
      dispatch({ settingsSearchValue, type: 'set-settings-search' }),
    setTheme: (theme) => dispatch({ theme, type: 'set-theme' }),
    showActivity: (activityId) => dispatch({ activityId, type: 'show-activity' }),
    state,
    togglePrimarySidebar: () => dispatch({ type: 'toggle-primary-sidebar' }),
  };
}
