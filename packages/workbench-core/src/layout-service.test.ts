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

    expect(service.getState()).toEqual({
      activityBar: {
        visible: true,
      },
      panel: {
        visible: false,
      },
      sideBar: {
        activeViewContainer: 'search',
        visible: false,
      },
    });
    expect(changes).toEqual(['false:explorer', 'false:search']);
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
