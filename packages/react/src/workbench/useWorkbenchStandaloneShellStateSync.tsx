import { useEffect, useRef } from 'react';

import type { WorkbenchStandaloneShellContext } from './WorkbenchStandaloneShell';
import {
  createWorkbenchStandaloneShellStateSnapshot,
  type WorkbenchStandaloneShellStateChange,
  type WorkbenchStandaloneShellStateSnapshot,
} from './workbenchStandaloneShellReactContext';

function resolveChangeKind(
  change: Omit<WorkbenchStandaloneShellStateChange<string, string>, 'kind' | 'previous' | 'next'>,
): WorkbenchStandaloneShellStateChange<string, string>['kind'] {
  if (change.activityChanged) {
    return 'activity';
  }

  if (change.primarySidebarVisibilityChanged) {
    return 'sidebar-visibility';
  }

  if (change.primarySidebarSizeChanged) {
    return 'sidebar-size';
  }

  if (change.settingsOpenChanged) {
    return 'settings';
  }

  if (change.themeChanged) {
    return 'theme';
  }

  return 'initial';
}

function createStateChange<TActivityId extends string, TTheme extends string>(
  previous: WorkbenchStandaloneShellStateSnapshot<TActivityId, TTheme> | null,
  next: WorkbenchStandaloneShellStateSnapshot<TActivityId, TTheme>,
  isInitial: boolean,
): WorkbenchStandaloneShellStateChange<TActivityId, TTheme> {
  const activityChanged = previous?.activityId !== next.activityId;
  const primarySidebarVisibilityChanged =
    previous?.isPrimarySidebarVisible !== next.isPrimarySidebarVisible;
  const primarySidebarSizeChanged = previous?.primarySidebarSizePx !== next.primarySidebarSizePx;
  const settingsOpenChanged = previous?.isSettingsOpen !== next.isSettingsOpen;
  const themeChanged = previous?.theme !== next.theme;

  const flags = {
    activityChanged,
    primarySidebarVisibilityChanged,
    primarySidebarSizeChanged,
    settingsOpenChanged,
    themeChanged,
  };

  return {
    ...flags,
    kind: isInitial ? 'initial' : resolveChangeKind(flags),
    previous,
    next,
  };
}

export function useWorkbenchStandaloneShellStateSync<
  TActivityId extends string,
  TTheme extends string,
>(
  context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
  onShellStateChange?: (change: WorkbenchStandaloneShellStateChange<TActivityId, TTheme>) => void,
): void {
  const previousSnapshotRef = useRef<WorkbenchStandaloneShellStateSnapshot<
    TActivityId,
    TTheme
  > | null>(null);
  const onShellStateChangeRef = useRef(onShellStateChange);

  useEffect(() => {
    onShellStateChangeRef.current = onShellStateChange;
  }, [onShellStateChange]);

  useEffect(() => {
    const callback = onShellStateChangeRef.current;
    if (!callback) {
      return;
    }

    const nextSnapshot = createWorkbenchStandaloneShellStateSnapshot(context);
    const previousSnapshot = previousSnapshotRef.current;
    const isInitial = previousSnapshot === null;
    const change = createStateChange(previousSnapshot, nextSnapshot, isInitial);

    if (
      isInitial ||
      change.activityChanged ||
      change.primarySidebarVisibilityChanged ||
      change.primarySidebarSizeChanged ||
      change.settingsOpenChanged ||
      change.themeChanged
    ) {
      callback(change);
    }

    previousSnapshotRef.current = nextSnapshot;
  }, [
    context,
    context.activityId,
    context.isPrimarySidebarVisible,
    context.isSettingsOpen,
    context.primarySidebarSizePx,
    context.theme,
  ]);
}
