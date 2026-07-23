import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

import type { WorkbenchStandaloneShellContext } from './WorkbenchStandaloneShell';

const WorkbenchStandaloneShellReactContext = createContext<unknown>(null);

export interface WorkbenchStandaloneShellStateSnapshot<
  TActivityId extends string = string,
  TTheme extends string = string,
> {
  activityId: TActivityId;
  isPrimarySidebarVisible: boolean;
  isSettingsOpen: boolean;
  primarySidebarSizePx: number;
  theme: TTheme;
}

export type WorkbenchStandaloneShellStateChangeKind =
  'initial' | 'activity' | 'sidebar-visibility' | 'sidebar-size' | 'settings' | 'theme';

export interface WorkbenchStandaloneShellStateChange<
  TActivityId extends string = string,
  TTheme extends string = string,
> {
  kind: WorkbenchStandaloneShellStateChangeKind;
  previous: WorkbenchStandaloneShellStateSnapshot<TActivityId, TTheme> | null;
  next: WorkbenchStandaloneShellStateSnapshot<TActivityId, TTheme>;
  activityChanged: boolean;
  primarySidebarVisibilityChanged: boolean;
  primarySidebarSizeChanged: boolean;
  settingsOpenChanged: boolean;
  themeChanged: boolean;
}

export function createWorkbenchStandaloneShellStateSnapshot<
  TActivityId extends string,
  TTheme extends string,
>(
  context: WorkbenchStandaloneShellContext<TActivityId, TTheme>,
): WorkbenchStandaloneShellStateSnapshot<TActivityId, TTheme> {
  return {
    activityId: context.activityId,
    isPrimarySidebarVisible: context.isPrimarySidebarVisible,
    isSettingsOpen: context.isSettingsOpen,
    primarySidebarSizePx: context.primarySidebarSizePx,
    theme: context.theme,
  };
}

export function WorkbenchStandaloneShellReactContextProvider<
  TActivityId extends string,
  TTheme extends string,
>({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkbenchStandaloneShellContext<TActivityId, TTheme>;
}): ReactElement {
  return (
    <WorkbenchStandaloneShellReactContext.Provider value={value}>
      {children}
    </WorkbenchStandaloneShellReactContext.Provider>
  );
}

export function useWorkbenchStandaloneShellContext<
  TActivityId extends string = string,
  TTheme extends string = string,
>(): WorkbenchStandaloneShellContext<TActivityId, TTheme> {
  const context = useContext(WorkbenchStandaloneShellReactContext);

  if (!context) {
    throw new Error(
      'useWorkbenchStandaloneShellContext must be used within WorkbenchStandaloneShell.',
    );
  }

  return context as WorkbenchStandaloneShellContext<TActivityId, TTheme>;
}
