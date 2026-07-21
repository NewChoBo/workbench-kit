/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import {
  useWorkbenchViewRouteState,
  type WorkbenchViewRouteState,
} from './workbenchViewRouteState';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

type TestViewId = 'launchpad' | 'library' | 'settings';

function isTestViewId(value: string | null): value is TestViewId {
  return value === 'launchpad' || value === 'library' || value === 'settings';
}

describe('useWorkbenchViewRouteState', () => {
  it('hydrates route state and commits open and close changes through browser history', async () => {
    window.history.replaceState(
      null,
      '',
      '/content?windowKind=content-hub&view=launchpad&tabs=library,launchpad&sidebar=old#slot',
    );

    let routeState: WorkbenchViewRouteState<TestViewId> | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function Probe() {
      routeState = useWorkbenchViewRouteState<TestViewId>({
        defaultViewId: 'library',
        discardedParams: ['sidebar'],
        isViewId: isTestViewId,
      });

      return (
        <output data-active-view={routeState.activeViewId}>
          {routeState.openViewIds.join(',')}
        </output>
      );
    }

    try {
      await act(async () => {
        root.render(<Probe />);
      });

      expect(routeState?.activeViewId).toBe('launchpad');
      expect(routeState?.openViewIds).toEqual(['library', 'launchpad']);

      await act(async () => {
        routeState?.openView('settings');
      });

      expect(routeState?.activeViewId).toBe('settings');
      expect(routeState?.openViewIds).toEqual(['library', 'launchpad', 'settings']);
      expect(window.location.search).toBe(
        '?windowKind=content-hub&view=settings&tabs=library%2Claunchpad%2Csettings',
      );
      expect(window.location.hash).toBe('#slot');

      await act(async () => {
        routeState?.closeView('launchpad');
      });

      expect(routeState?.openViewIds).toEqual(['library', 'settings']);
      expect(window.location.search).toBe(
        '?windowKind=content-hub&view=settings&tabs=library%2Csettings',
      );
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('refreshes the route snapshot on popstate', async () => {
    window.history.replaceState(null, '', '/content?view=library&tabs=library');

    let routeState: WorkbenchViewRouteState<TestViewId> | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function Probe() {
      routeState = useWorkbenchViewRouteState<TestViewId>({
        defaultViewId: 'library',
        isViewId: isTestViewId,
      });

      return <output data-active-view={routeState.activeViewId} />;
    }

    try {
      await act(async () => {
        root.render(<Probe />);
      });

      window.history.pushState(null, '', '/content?view=settings&tabs=library,settings');

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(routeState?.activeViewId).toBe('settings');
      expect(routeState?.openViewIds).toEqual(['library', 'settings']);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
