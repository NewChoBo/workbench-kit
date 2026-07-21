import {
  CommandManagementSidebar,
  buildCommandInspectorUri,
  findCommandManagementEntry,
} from '@workbench-kit/react/workbench/management';

import {
  BUILTIN_COMMANDS_VIEW_RENDER_KIND,
  isBuiltinCommandsViewRenderData,
  type BuiltinCommandsViewRenderData,
} from './commands-view-data.js';
import { useCommandManagementModel } from './use-command-management.js';
import { useEditorService } from './use-editor.js';

export type { BuiltinCommandsViewRenderData };
export { BUILTIN_COMMANDS_VIEW_RENDER_KIND, isBuiltinCommandsViewRenderData };

export function BuiltinCommandsView() {
  const editorService = useEditorService();
  const { groups, lastRun, refreshRegistry, runCommand } = useCommandManagementModel();

  const inspectCommand = (commandId: string) => {
    const entry = findCommandManagementEntry(groups, commandId);
    editorService.openEditor({
      icon: 'codicon-terminal',
      pinned: true,
      preview: false,
      resourceUri: buildCommandInspectorUri(commandId),
      title: entry?.label ?? commandId,
    });
  };

  return (
    <CommandManagementSidebar
      className="workbench-commands-view"
      groups={groups}
      lastRun={lastRun}
      onInspectCommand={inspectCommand}
      onRefresh={refreshRegistry}
      onRunCommand={runCommand}
    />
  );
}
