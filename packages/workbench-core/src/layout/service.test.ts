import { describe, expect, it } from 'vitest';

import {
  createWorkbenchLayoutState,
  DEFAULT_WORKBENCH_LAYOUT_STATE,
  LayoutService,
} from '../index.js';

describe('LayoutService', () => {
  it('creates layout state from shareable defaults', () => {
    expect(
      createWorkbenchLayoutState({
        activityBar: {
          visible: true,
        },
        panel: {
          visible: false,
        },
        sideBar: {
          activeViewContainer: 'explorer',
          visible: true,
        },
      }),
    ).toEqual({
      activityBar: {
        visible: true,
      },
      auxiliaryBar: {
        visible: false,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: 'explorer',
        visible: true,
      },
    });
  });

  it('updates layout state and emits changes', () => {
    const service = new LayoutService({
      sideBar: {
        activeViewContainer: 'explorer',
      },
    });
    const changes: string[] = [];
    service.onDidChangeLayout(({ state }) => {
      changes.push(`${state.sideBar.visible}:${state.sideBar.activeViewContainer ?? 'none'}`);
    });

    service.setSideBarVisible(false);
    service.setActiveViewContainer('search');
    service.setActivityBarItemOrder(['search', 'explorer', 'chatting', 'aiChat']);
    service.setActivityBarHiddenItemIds(['aiChat', 'chatting', 'aiChat']);
    service.setSideBarSizePercent(32);
    service.setPanelVisible(true);
    service.setPanelSizePercent(28);
    service.setActivePanelViewContainer('panelOutput');

    expect(service.getState()).toEqual({
      activityBar: {
        hiddenItemIds: ['aiChat', 'chatting'],
        itemOrder: ['search', 'explorer', 'chatting', 'aiChat'],
        visible: true,
      },
      auxiliaryBar: {
        visible: false,
      },
      panel: {
        activeViewContainer: 'panelOutput',
        sizePercent: 28,
        visible: true,
      },
      sideBar: {
        activeViewContainer: 'search',
        sizePercent: 32,
        visible: false,
      },
    });
    expect(changes).toEqual([
      'false:explorer',
      'false:search',
      'false:search',
      'false:search',
      'false:search',
      'false:search',
      'false:search',
      'false:search',
    ]);
  });

  it('hides the sidebar when the active view container is focused again', () => {
    const service = new LayoutService({
      sideBar: {
        activeViewContainer: 'explorer',
        visible: true,
      },
    });

    service.focusSideBarViewContainer('explorer');

    expect(service.getState().sideBar).toEqual({
      activeViewContainer: 'explorer',
      visible: false,
    });

    service.focusSideBarViewContainer('explorer');

    expect(service.getState().sideBar).toEqual({
      activeViewContainer: 'explorer',
      visible: true,
    });
  });

  it('restores the first layout snapshot after idempotent focus mode transitions', () => {
    const service = new LayoutService({
      activityBar: {
        hiddenItemIds: ['search'],
        itemOrder: ['explorer', 'search'],
        visible: true,
      },
      auxiliaryBar: { visible: true },
      panel: {
        activeViewContainer: 'output',
        sizePercent: 36,
        visible: true,
      },
      sideBar: {
        activeViewContainer: 'explorer',
        sizePercent: 28,
        visible: true,
      },
    });
    const initialState = service.getState();
    const changes: Array<{ readonly transient: boolean }> = [];
    service.onDidChangeLayout((event) => {
      changes.push({ transient: event.transient });
    });

    service.setFocusModeActive(true);
    service.setFocusModeActive(true);

    expect(service.isFocusModeActive()).toBe(true);
    expect(service.getState()).toEqual({
      ...initialState,
      activityBar: { ...initialState.activityBar, visible: false },
      auxiliaryBar: { visible: false },
      panel: { ...initialState.panel, visible: false },
      sideBar: { ...initialState.sideBar, visible: false },
    });
    expect(changes).toEqual([{ transient: true }]);

    service.setActivityBarHiddenItemIds(['explorer']);
    service.setActiveViewContainer('search');
    service.setSideBarSizePercent(44);
    service.setActivePanelViewContainer('problems');
    service.setPanelSizePercent(24);
    service.setAuxiliaryBarVisible(true);

    expect(changes.every(({ transient }) => transient)).toBe(true);

    service.setFocusModeActive(false);

    expect(service.isFocusModeActive()).toBe(false);
    expect(service.getState()).toEqual(initialState);
    expect(changes.at(-1)).toEqual({ transient: false });

    const changeCount = changes.length;
    service.setFocusModeActive(false);
    expect(changes).toHaveLength(changeCount);
  });

  it('exports the default public layout contract', () => {
    expect(DEFAULT_WORKBENCH_LAYOUT_STATE).toEqual({
      activityBar: {
        visible: true,
      },
      auxiliaryBar: {
        visible: false,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: undefined,
        visible: true,
      },
    });
  });

  it('does not preserve empty active view container IDs', () => {
    expect(
      createWorkbenchLayoutState(
        {
          sideBar: {
            activeViewContainer: '',
          },
        },
        {
          activityBar: {
            visible: true,
          },
          auxiliaryBar: {
            visible: false,
          },
          panel: {
            visible: false,
          },
          sideBar: {
            activeViewContainer: 'explorer',
            visible: true,
          },
        },
      ).sideBar.activeViewContainer,
    ).toBe('explorer');
  });
});
