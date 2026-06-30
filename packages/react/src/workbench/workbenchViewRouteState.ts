import { useCallback, useEffect, useState } from 'react';
import {
  areWorkbenchViewRouteSnapshotsEqual,
  buildWorkbenchViewRouteSearch,
  closeWorkbenchViewRoute,
  openWorkbenchViewRoute,
  resolveWorkbenchViewRouteSnapshot,
  type WorkbenchViewRouteSnapshot,
} from '@workbench-kit/platform';

export type WorkbenchViewRouteCommitMode = 'push' | 'replace';

export interface WorkbenchViewRouteBrowserWindow {
  readonly history: Pick<Window['history'], 'pushState' | 'replaceState'>;
  readonly location: Pick<Window['location'], 'hash' | 'pathname' | 'search'>;
  addEventListener(type: 'popstate', listener: (event: PopStateEvent) => void): void;
  removeEventListener(type: 'popstate', listener: (event: PopStateEvent) => void): void;
}

export interface UseWorkbenchViewRouteStateOptions<TViewId extends string> {
  readonly defaultViewId: TViewId;
  readonly discardedParams?: ReadonlyArray<string> | undefined;
  readonly isViewId: (value: string | null) => value is TViewId;
  readonly routeWindow?: WorkbenchViewRouteBrowserWindow | undefined;
  readonly tabsParam?: string | undefined;
  readonly viewParam?: string | undefined;
}

export interface WorkbenchViewRouteState<
  TViewId extends string,
> extends WorkbenchViewRouteSnapshot<TViewId> {
  readonly closeView: (viewId: TViewId) => void;
  readonly openView: (viewId: TViewId) => void;
}

export function useWorkbenchViewRouteState<TViewId extends string>({
  defaultViewId,
  discardedParams,
  isViewId,
  routeWindow,
  tabsParam,
  viewParam,
}: UseWorkbenchViewRouteStateOptions<TViewId>): WorkbenchViewRouteState<TViewId> {
  const resolvedWindow = routeWindow ?? resolveWorkbenchViewRouteBrowserWindow();
  const resolveRouteSnapshot = useCallback(
    () =>
      resolveWorkbenchViewRouteSnapshot({
        defaultViewId,
        isViewId,
        search: resolvedWindow.location.search,
        tabsParam,
        viewParam,
      }),
    [defaultViewId, isViewId, resolvedWindow, tabsParam, viewParam],
  );
  const [snapshot, setSnapshot] = useState(resolveRouteSnapshot);

  useEffect(() => {
    const handlePopState = (): void => {
      setSnapshot(resolveRouteSnapshot());
    };

    resolvedWindow.addEventListener('popstate', handlePopState);
    return () => {
      resolvedWindow.removeEventListener('popstate', handlePopState);
    };
  }, [resolveRouteSnapshot, resolvedWindow]);

  const commitSnapshot = useCallback(
    (nextSnapshot: WorkbenchViewRouteSnapshot<TViewId>, mode: WorkbenchViewRouteCommitMode) => {
      if (areWorkbenchViewRouteSnapshotsEqual(snapshot, nextSnapshot)) {
        return;
      }

      const nextSearch = buildWorkbenchViewRouteSearch(
        resolvedWindow.location.search,
        nextSnapshot,
        {
          discardedParams,
          tabsParam,
          viewParam,
        },
      );

      if (nextSearch !== resolvedWindow.location.search) {
        const nextUrl = `${resolvedWindow.location.pathname}${nextSearch}${resolvedWindow.location.hash}`;

        if (mode === 'replace') {
          resolvedWindow.history.replaceState(null, '', nextUrl);
        } else {
          resolvedWindow.history.pushState(null, '', nextUrl);
        }
      }

      setSnapshot(nextSnapshot);
    },
    [discardedParams, resolvedWindow, snapshot, tabsParam, viewParam],
  );

  const openView = useCallback(
    (viewId: TViewId): void => {
      commitSnapshot(
        {
          activeViewId: viewId,
          openViewIds: openWorkbenchViewRoute(snapshot.openViewIds, viewId),
        },
        'push',
      );
    },
    [commitSnapshot, snapshot.openViewIds],
  );

  const closeView = useCallback(
    (viewId: TViewId): void => {
      commitSnapshot(
        closeWorkbenchViewRoute({
          defaultViewId,
          snapshot,
          viewId,
        }),
        'replace',
      );
    },
    [commitSnapshot, defaultViewId, snapshot],
  );

  return {
    activeViewId: snapshot.activeViewId,
    closeView,
    openView,
    openViewIds: snapshot.openViewIds,
  };
}

function resolveWorkbenchViewRouteBrowserWindow(): WorkbenchViewRouteBrowserWindow {
  if (typeof window === 'undefined') {
    throw new Error('useWorkbenchViewRouteState requires a browser window.');
  }

  return window;
}
