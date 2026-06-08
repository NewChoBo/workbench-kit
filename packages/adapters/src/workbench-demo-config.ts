import type { RuntimeStatus } from '@workbench-kit/runtime';

export type IntegratedShellActivityId = 'explorer' | 'search' | 'chat';

export const integratedShellActivityOrder: IntegratedShellActivityId[] = [
  'explorer',
  'search',
  'chat',
];

export const integratedShellActivityLabels: Record<IntegratedShellActivityId, string> = {
  explorer: 'Explorer',
  search: 'Search',
  chat: 'Chat',
};

const integratedShellActivityIcons: Record<IntegratedShellActivityId, string> = {
  explorer: 'codicon-files',
  search: 'codicon-search',
  chat: 'codicon-comment-discussion',
};

export const integratedShellCommandActivities = integratedShellActivityOrder.map((id) => ({
  id,
  label: integratedShellActivityLabels[id],
  icon: integratedShellActivityIcons[id],
}));

export function isIntegratedShellActivityId(id: string): id is IntegratedShellActivityId {
  return id === 'explorer' || id === 'search' || id === 'chat';
}

export interface IntegratedShellBootstrapInitialState {
  activeActivityId: IntegratedShellActivityId;
  isPrimarySidebarVisible: boolean;
  primarySidebarSizePercent: number;
  primarySidebarMinPercent: number;
  primarySidebarMaxPercent: number;
  settingsCategoryId: string;
  settingsScopeId: string;
  theme: 'dark' | 'light';
}

export function createIntegratedShellBootstrapInitialState(
  overrides: Partial<IntegratedShellBootstrapInitialState> = {},
): IntegratedShellBootstrapInitialState {
  return {
    activeActivityId: 'explorer',
    isPrimarySidebarVisible: true,
    primarySidebarSizePercent: 24,
    primarySidebarMinPercent: 16,
    primarySidebarMaxPercent: 40,
    settingsCategoryId: 'appearance',
    settingsScopeId: 'user',
    theme: 'dark',
    ...overrides,
  };
}

export function runtimeStatusLabel(status: RuntimeStatus): string {
  if (status === 'running') return 'Runtime running';
  if (status === 'cancelled') return 'Runtime stopped';
  if (status === 'error') return 'Runtime error';
  return 'Runtime idle';
}
