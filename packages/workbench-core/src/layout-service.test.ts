import { describe, expect, it } from 'vitest';

import {
  createWorkbenchLayoutState,
  DEFAULT_WORKBENCH_LAYOUT_STATE,
  LayoutService,
} from './index.js';

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
    service.setSideBarSizePercent(32);

    expect(service.getState()).toEqual({
      activityBar: {
        itemOrder: ['search', 'explorer', 'chatting', 'aiChat'],
        visible: true,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: 'search',
        sizePercent: 32,
        visible: false,
      },
    });
    expect(changes).toEqual(['false:explorer', 'false:search', 'false:search', 'false:search']);
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

  it('exports the default public layout contract', () => {
    expect(DEFAULT_WORKBENCH_LAYOUT_STATE).toEqual({
      activityBar: {
        visible: true,
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
