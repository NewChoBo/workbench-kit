import { describe, expect, it } from 'vitest';
import {
  initializeWorkbenchShellState,
  workbenchShellStateReducer,
  type WorkbenchShellAction,
  type WorkbenchShellInitialState,
} from './shellState';

type TestActivityId = 'chat' | 'explorer' | 'search';
type TestTheme = 'dark' | 'light';

function reduceShellState(
  initialState: WorkbenchShellInitialState<TestActivityId, TestTheme>,
  actions: WorkbenchShellAction<TestActivityId, TestTheme>[],
) {
  return actions.reduce(
    (state, action) => workbenchShellStateReducer(state, action),
    initializeWorkbenchShellState(initialState),
  );
}

describe('workbench shell state', () => {
  it('initializes layout, settings, and theme state with clamped sidebar size', () => {
    const state = initializeWorkbenchShellState<TestActivityId, TestTheme>({
      activeActivityId: 'explorer',
      primarySidebarSizePercent: 120,
      settingsCategoryId: 'appearance',
      settingsScopeId: 'user',
      settingsSearchValue: 'theme',
      theme: 'dark',
    });

    expect(state).toEqual({
      activeActivityId: 'explorer',
      isPrimarySidebarVisible: true,
      isSettingsOpen: false,
      primarySidebarSizePercent: 90,
      settingsCategoryId: 'appearance',
      settingsScopeId: 'user',
      settingsSearchValue: 'theme',
      theme: 'dark',
    });
  });

  it('toggles the primary sidebar for the active activity and shows it for another activity', () => {
    const initialState = initializeWorkbenchShellState<TestActivityId, TestTheme>({
      activeActivityId: 'explorer',
      theme: 'dark',
    });
    const hiddenState = workbenchShellStateReducer(initialState, {
      activityId: 'explorer',
      type: 'activate-activity',
    });
    const state = workbenchShellStateReducer(hiddenState, {
      activityId: 'search',
      type: 'activate-activity',
    });

    expect(hiddenState.activeActivityId).toBe('explorer');
    expect(hiddenState.isPrimarySidebarVisible).toBe(false);
    expect(state.activeActivityId).toBe('search');
    expect(state.isPrimarySidebarVisible).toBe(true);
  });

  it('updates settings state, theme, and sidebar size through reducer actions', () => {
    const state = reduceShellState(
      {
        activeActivityId: 'explorer',
        theme: 'dark',
      },
      [
        { type: 'open-settings' },
        { settingsCategoryId: 'workspace', type: 'set-settings-category' },
        { settingsScopeId: 'workspace', type: 'set-settings-scope' },
        { settingsSearchValue: 'search', type: 'set-settings-search' },
        { percent: Number.NaN, type: 'set-primary-sidebar-size' },
        { percent: 32, type: 'set-primary-sidebar-size' },
        { theme: 'light', type: 'set-theme' },
        { type: 'toggle-primary-sidebar' },
      ],
    );

    expect(state).toEqual({
      activeActivityId: 'explorer',
      isPrimarySidebarVisible: false,
      isSettingsOpen: true,
      primarySidebarSizePercent: 32,
      settingsCategoryId: 'workspace',
      settingsScopeId: 'workspace',
      settingsSearchValue: 'search',
      theme: 'light',
    });
  });
});
