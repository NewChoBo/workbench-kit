import {
  createCommandRegistryFromContributions,
  findCommandDefinitionConflicts,
  mergeCommandContributions,
  type CommandContributionInput,
  type CommandConflictPolicy,
  type CommandMenuEntry,
} from '@workbench-kit/platform';
import {
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceCreateMenuEntries,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  type WorkbenchShellCommandContext,
  type WorkbenchWorkspaceCommandContext,
} from '../commands';
import {
  integratedShellCommandActivities,
  type IntegratedShellActivityId,
} from './integratedShellActivities';

export interface IntegratedShellCommandContext
  extends
    WorkbenchShellCommandContext<IntegratedShellActivityId>,
    WorkbenchWorkspaceCommandContext {}

const integratedShellWorkbenchCommands = createWorkbenchShellCommands<IntegratedShellActivityId>({
  activities: integratedShellCommandActivities,
});

const integratedShellCommandContributions: CommandContributionInput<IntegratedShellCommandContext>[] =
  [
    { commands: integratedShellWorkbenchCommands },
    { commands: createWorkbenchWorkspaceCommands<IntegratedShellCommandContext>() },
  ];

const integratedShellMergedCommands = mergeCommandContributions<IntegratedShellCommandContext>(
  ...integratedShellCommandContributions,
).commands;

const integratedShellCommandConflicts =
  findCommandDefinitionConflicts<IntegratedShellCommandContext>(integratedShellMergedCommands);

export const integratedShellCommandPolicy: CommandConflictPolicy =
  integratedShellCommandConflicts.length === 0 ? 'hard-fail' : 'last-write-wins';

export const integratedShellCommandRegistry =
  createCommandRegistryFromContributions<IntegratedShellCommandContext>(
    integratedShellCommandContributions,
    { conflictPolicy: integratedShellCommandPolicy },
  );

export const integratedShellShellCommandRegistry = createCommandRegistryFromContributions<
  WorkbenchShellCommandContext<IntegratedShellActivityId>
>([{ commands: integratedShellWorkbenchCommands }]);

export const integratedShellMenuEntries: CommandMenuEntry<IntegratedShellCommandContext>[] =
  createWorkbenchShellMenuEntries({ activities: integratedShellCommandActivities });

export const integratedShellWorkspaceCreateMenuEntries =
  createWorkbenchWorkspaceCreateMenuEntries<IntegratedShellCommandContext>();

export const integratedShellWorkspaceTargetMenuEntries =
  createWorkbenchWorkspaceTargetMenuEntries<IntegratedShellCommandContext>();

export const integratedShellWorkspaceFolderMenuEntries =
  createWorkbenchWorkspaceFolderMenuEntries<IntegratedShellCommandContext>();

export { integratedShellCommandContributions, integratedShellWorkbenchCommands };
