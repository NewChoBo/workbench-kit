import type { IntegratedShellActivityId } from '@workbench-kit/adapters/workbench-demo-config';

export interface IntegratedShellContextKeySnapshot {
  'workbench.activeActivity': IntegratedShellActivityId;
  'workbench.primarySidebarVisible': boolean;
  'workspace.hasSelection': boolean;
  'workspace.multiSelection': boolean;
}

export function createIntegratedShellContextKeys({
  activeActivityId,
  isPrimarySidebarVisible,
  selectionCount,
}: {
  activeActivityId: IntegratedShellActivityId;
  isPrimarySidebarVisible: boolean;
  selectionCount: number;
}): IntegratedShellContextKeySnapshot {
  return {
    'workbench.activeActivity': activeActivityId,
    'workbench.primarySidebarVisible': isPrimarySidebarVisible,
    'workspace.hasSelection': selectionCount > 0,
    'workspace.multiSelection': selectionCount > 1,
  };
}
