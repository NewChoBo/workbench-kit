import { describe, expect, it } from 'vitest';

import {
  areWorkbenchViewRouteSnapshotsEqual,
  buildWorkbenchViewRouteSearch,
  closeWorkbenchViewRoute,
  openWorkbenchViewRoute,
  resolveWorkbenchViewRouteSnapshot,
  switchWorkbenchViewRoute,
} from './workbench-view-route';

type TestViewId = 'help' | 'launchpad' | 'library' | 'settings';

const defaultViewId: TestViewId = 'library';

function isTestViewId(value: string | null): value is TestViewId {
  return value === 'help' || value === 'launchpad' || value === 'library' || value === 'settings';
}

describe('workbench view route helpers', () => {
  it('defaults to the configured view when no route is present', () => {
    expect(
      resolveWorkbenchViewRouteSnapshot({
        defaultViewId,
        isViewId: isTestViewId,
        search: '?windowKind=content-hub',
      }),
    ).toEqual({
      activeViewId: 'library',
      openViewIds: ['library'],
    });
  });

  it('hydrates active view and open editor tabs from route params', () => {
    expect(
      resolveWorkbenchViewRouteSnapshot({
        defaultViewId,
        isViewId: isTestViewId,
        search: '?windowKind=content-hub&view=launchpad&tabs=library,launchpad',
      }),
    ).toEqual({
      activeViewId: 'launchpad',
      openViewIds: ['library', 'launchpad'],
    });
  });

  it('filters unknown tabs and keeps the active view open', () => {
    expect(
      resolveWorkbenchViewRouteSnapshot({
        defaultViewId,
        isViewId: isTestViewId,
        search: '?windowKind=content-hub&view=settings&tabs=unknown,library,assets,assets',
      }),
    ).toEqual({
      activeViewId: 'settings',
      openViewIds: ['library', 'settings'],
    });
  });

  it('preserves surrounding query params while replacing view params', () => {
    expect(
      buildWorkbenchViewRouteSearch(
        '?windowKind=content-hub&view=library&sidebar=launchpad',
        {
          activeViewId: 'settings',
          openViewIds: ['library', 'settings'],
        },
        { discardedParams: ['sidebar'] },
      ),
    ).toBe('?windowKind=content-hub&view=settings&tabs=library%2Csettings');
  });

  it('opens a view once and closes active views with next-tab fallback', () => {
    expect(openWorkbenchViewRoute<TestViewId>(['library'], 'settings')).toEqual([
      'library',
      'settings',
    ]);
    expect(openWorkbenchViewRoute<TestViewId>(['library', 'settings'], 'settings')).toEqual([
      'library',
      'settings',
    ]);

    expect(
      closeWorkbenchViewRoute({
        defaultViewId,
        snapshot: {
          activeViewId: 'launchpad',
          openViewIds: ['library', 'launchpad', 'settings'],
        },
        viewId: 'launchpad',
      }),
    ).toEqual({
      activeViewId: 'settings',
      openViewIds: ['library', 'settings'],
    });
  });

  it('compares route snapshots by active view and ordered open views', () => {
    expect(
      areWorkbenchViewRouteSnapshotsEqual(
        { activeViewId: 'library', openViewIds: ['library', 'settings'] },
        { activeViewId: 'library', openViewIds: ['library', 'settings'] },
      ),
    ).toBe(true);
    expect(
      areWorkbenchViewRouteSnapshotsEqual(
        { activeViewId: 'library', openViewIds: ['settings', 'library'] },
        { activeViewId: 'library', openViewIds: ['library', 'settings'] },
      ),
    ).toBe(false);
  });

  it('switches active view without mutating open view tabs', () => {
    expect(
      switchWorkbenchViewRoute(
        { activeViewId: 'library', openViewIds: ['library', 'launchpad'] },
        'help',
      ),
    ).toEqual({
      activeViewId: 'help',
      openViewIds: ['library', 'launchpad'],
    });
  });
});
