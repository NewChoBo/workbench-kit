import {
  createCommandRegistryFromContributions,
  type CommandContributionInput,
  type CommandMenuEntry,
} from '@workbench-kit/core';
import { preflightCommandContributionConflict } from '@workbench-kit/vscode-extension';
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
  extends WorkbenchShellCommandContext<IntegratedShellActivityId>,
    WorkbenchWorkspaceCommandContext {}

const integratedShellWorkbenchCommands =
  createWorkbenchShellCommands<IntegratedShellActivityId>({
    activities: integratedShellCommandActivities,
  });

const integratedShellCommandContributions: CommandContributionInput<IntegratedShellCommandContext>[] =
  [
    { commands: integratedShellWorkbenchCommands },
    { commands: createWorkbenchWorkspaceCommands<IntegratedShellCommandContext>() },
  ];

const integratedShellCommandPreflight =
  preflightCommandContributionConflict<IntegratedShellCommandContext>(
    integratedShellCommandContributions,
  );

export const integratedShellCommandRegistry = integratedShellCommandPreflight.commandRegistry;

export const integratedShellCommandPolicy =
  integratedShellCommandPreflight.commandConflicts.length === 0
    ? 'hard-fail'
    : ('last-write-wins' as const);

export const integratedShellShellCommandRegistry =
  createCommandRegistryFromContributions<WorkbenchShellCommandContext<IntegratedShellActivityId>>([
    { commands: integratedShellWorkbenchCommands },
  ]);

export const integratedShellMenuEntries: CommandMenuEntry<IntegratedShellCommandContext>[] =
  createWorkbenchShellMenuEntries({ activities: integratedShellCommandActivities });

export const integratedShellWorkspaceCreateMenuEntries =
  createWorkbenchWorkspaceCreateMenuEntries<IntegratedShellCommandContext>();

export const integratedShellWorkspaceTargetMenuEntries =
  createWorkbenchWorkspaceTargetMenuEntries<IntegratedShellCommandContext>();

export const integratedShellWorkspaceFolderMenuEntries =
  createWorkbenchWorkspaceFolderMenuEntries<IntegratedShellCommandContext>();

export { integratedShellCommandContributions, integratedShellWorkbenchCommands };
