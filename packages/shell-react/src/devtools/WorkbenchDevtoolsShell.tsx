import type { ReactNode } from 'react';

import { WorkbenchDevtoolsPanel } from './WorkbenchDevtoolsPanel.js';
import './workbench-devtools.css';

export interface WorkbenchDevtoolsShellProps {
  readonly children: ReactNode;
}

export function WorkbenchDevtoolsShell({ children }: WorkbenchDevtoolsShellProps) {
  return (
    <div className="workbench-devtools-shell" data-testid="workbench-devtools-shell">
      <div className="workbench-devtools-shell__main">{children}</div>
      <WorkbenchDevtoolsPanel />
    </div>
  );
}
