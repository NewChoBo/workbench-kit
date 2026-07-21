import { ScrollArea } from '@workbench-kit/react/primitives';
import {
  CommandInspectorPanel,
  findCommandManagementEntry,
} from '@workbench-kit/react/workbench/management';

import { useCommandManagementModel } from './use-command-management.js';

export interface CommandInspectorSurfaceProps {
  commandId: string;
  resourceUri: string;
  tabId: string;
}

export function CommandInspectorSurface({
  commandId,
  resourceUri,
  tabId,
}: CommandInspectorSurfaceProps) {
  const { groups, lastRun, runCommand } = useCommandManagementModel();
  const entry = findCommandManagementEntry(groups, commandId);

  if (!entry) {
    return (
      <section
        aria-label="Command inspector"
        className="workbench-command-inspector-surface"
        data-editor-host-id={tabId}
        data-resource-uri={resourceUri}
      >
        <div className="workbench-command-inspector-surface__missing" role="alert">
          <p className="workbench-command-inspector-surface__missing-title">Command not found</p>
          <p className="workbench-command-inspector-surface__missing-message">
            No registry entry matches <code>{commandId}</code>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <ScrollArea className="workbench-command-inspector-surface" orientation="vertical">
      <CommandInspectorPanel entry={entry} lastRun={lastRun} onRunCommand={runCommand} />
    </ScrollArea>
  );
}
