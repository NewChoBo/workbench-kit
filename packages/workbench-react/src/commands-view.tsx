import { CommandManagementSidebar } from '@workbench-kit/react/workbench/management';

import {
  BUILTIN_COMMANDS_VIEW_RENDER_KIND,
  isBuiltinCommandsViewRenderData,
  type BuiltinCommandsViewRenderData,
} from './commands-view-data.js';
import { useCommandManagementModel } from './use-command-management.js';

export type { BuiltinCommandsViewRenderData };
export { BUILTIN_COMMANDS_VIEW_RENDER_KIND, isBuiltinCommandsViewRenderData };

export function BuiltinCommandsView() {
  const { groups, lastRun, refreshRegistry, runCommand } = useCommandManagementModel();

  return (
    <section aria-label="Command Registry" className="workbench-commands-view">
      <CommandManagementSidebar
        groups={groups}
        lastRun={lastRun}
        onRefresh={refreshRegistry}
        onRunCommand={runCommand}
      />
    </section>
  );
}
