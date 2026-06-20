import type {
  WorkspaceExplorerControllerPort,
  WorkspaceExplorerMutationResult,
  WorkspaceExplorerWorkspaceSnapshot,
} from '@workbench-kit/react/workbench/workspace';
import type { VirtualWorkspaceState } from '@workbench-kit/workspace';

import { BUILTIN_EXPLORER_MOVE_COMMAND_ID } from './explorer-view-data.js';

const WORKBENCH_WORKSPACE_DELETE_COMMAND_ID = 'workspace.delete' as const;
const WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID = 'workspace.newFile' as const;
const WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID = 'workspace.newFolder' as const;
const WORKBENCH_WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;
const WORKBENCH_WORKSPACE_RENAME_COMMAND_ID = 'workspace.rename' as const;

interface WorkspaceCommandResult {
  readonly path?: string | undefined;
  readonly paths?: readonly string[] | undefined;
}

export function createCommandWorkspaceExplorerPort({
  executeCommand,
  workspaceState,
}: {
  executeCommand(commandId: string, payload?: unknown): Promise<unknown>;
  workspaceState: VirtualWorkspaceState | undefined;
}): WorkspaceExplorerControllerPort {
  const snapshot: WorkspaceExplorerWorkspaceSnapshot = {
    files: workspaceState?.files ?? [],
    folders: workspaceState?.folders ?? [],
  };

  return {
    snapshot,
    createFile(input) {
      return runWorkspaceCommand(executeCommand, WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID, input);
    },
    createFolder(input) {
      return runWorkspaceCommand(executeCommand, WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID, input);
    },
    deleteEntries({ kind, paths }) {
      void executeCommand(WORKBENCH_WORKSPACE_DELETE_COMMAND_ID, {
        kind,
        paths,
      });
    },
    moveEntries(input) {
      return runWorkspaceCommand(executeCommand, BUILTIN_EXPLORER_MOVE_COMMAND_ID, {
        sourcePaths: input.sourcePaths,
        targetFolderPath: input.targetFolderPath,
      });
    },
    openFile(path) {
      void executeCommand(WORKBENCH_WORKSPACE_OPEN_COMMAND_ID, {
        kind: 'file',
        path,
        paths: [path],
      });
    },
    renameEntry(input) {
      return runWorkspaceCommand(executeCommand, WORKBENCH_WORKSPACE_RENAME_COMMAND_ID, input);
    },
  };
}

async function runWorkspaceCommand(
  executeCommand: (commandId: string, payload?: unknown) => Promise<unknown>,
  commandId: string,
  payload: unknown,
): Promise<WorkspaceExplorerMutationResult | undefined> {
  const result = await executeCommand(commandId, payload);
  return isWorkspaceCommandResult(result) ? result : undefined;
}

function isWorkspaceCommandResult(value: unknown): value is WorkspaceCommandResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as WorkspaceCommandResult;
  return (
    (result.path === undefined || typeof result.path === 'string') &&
    (result.paths === undefined ||
      (Array.isArray(result.paths) && result.paths.every((path) => typeof path === 'string')))
  );
}
