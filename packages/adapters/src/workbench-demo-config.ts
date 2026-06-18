import type { RuntimeStatus } from '@workbench-kit/runtime';

export type IntegratedShellActivityId = 'explorer' | 'search' | 'chatting' | 'aiChat';

export const integratedShellActivityOrder: IntegratedShellActivityId[] = [
  'explorer',
  'search',
  'chatting',
  'aiChat',
];

export const integratedShellActivityLabels: Record<IntegratedShellActivityId, string> = {
  explorer: 'Explorer',
  search: 'Search',
  chatting: 'Chat',
  aiChat: 'AI Chat',
};

const integratedShellActivityIcons: Record<IntegratedShellActivityId, string> = {
  explorer: 'codicon-files',
  search: 'codicon-search',
  chatting: 'codicon-comment-discussion',
  aiChat: 'codicon-sparkle',
};

export const integratedShellCommandActivities = integratedShellActivityOrder.map((id) => ({
  id,
  label: integratedShellActivityLabels[id],
  icon: integratedShellActivityIcons[id],
}));

export function isIntegratedShellActivityId(id: string): id is IntegratedShellActivityId {
  return id === 'explorer' || id === 'search' || id === 'chatting' || id === 'aiChat';
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
    primarySidebarSizePercent: 20,
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
