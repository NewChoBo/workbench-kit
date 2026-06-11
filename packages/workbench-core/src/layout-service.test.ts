import { describe, expect, it } from 'vitest';

import { createWorkbenchLayoutState, LayoutService } from './index.js';

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
});
