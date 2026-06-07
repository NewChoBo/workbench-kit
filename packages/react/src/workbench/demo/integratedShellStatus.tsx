import { runtimeStatusLabel } from '@workbench-kit/adapters/workbench-demo-config';
import type { RuntimeStatus } from '@workbench-kit/runtime';
import type { StatusBarSectionModel } from '../StatusBar';
import type { WorkspaceEditorTheme } from '../workspace';

export function getIntegratedStatusSections({
  colorTheme,
  isPrimarySideBarVisible,
  lastCommandLabel,
  runtimeStatus,
}: {
  colorTheme: WorkspaceEditorTheme;
  isPrimarySideBarVisible: boolean;
  lastCommandLabel: string;
  runtimeStatus: RuntimeStatus;
}): StatusBarSectionModel[] {
  return [
    {
      id: 'main',
      items: [
        {
          id: 'last-command',
          icon: <span className="workbench-status-dot" />,
          label: lastCommandLabel,
        },
      ],
    },
    {
      align: 'end',
      id: 'actions',
      items: [
        {
          id: 'runtime-status',
          icon: <i className="codicon codicon-debug-start" />,
          label: runtimeStatusLabel(runtimeStatus),
        },
        {
          id: 'theme',
          icon: <i className="codicon codicon-color-mode" />,
          label: colorTheme === 'dark' ? 'Dark' : 'Light',
        },
        {
          id: 'primary-sidebar',
          icon: <i className="codicon codicon-layout-sidebar-left" />,
          label: isPrimarySideBarVisible ? 'Hide sidebar' : 'Show sidebar',
        },
      ],
    },
  ];
}
