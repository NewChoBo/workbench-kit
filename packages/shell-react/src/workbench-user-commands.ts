import type {
  WorkbenchUserCommandAction,
  WorkbenchUserCommandDefinition,
} from '@workbench-kit/workbench-config';
import type { ExtensionRegistry } from '@workbench-kit/workbench-core';

export async function executeWorkbenchUserCommandAction(
  action: WorkbenchUserCommandAction,
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<unknown>,
): Promise<unknown> {
  if (action.type === 'executeCommand') {
    return executeCommand(action.command, ...(action.args !== undefined ? [action.args] : []));
  }

  let lastResult: unknown;
  for (const step of action.steps) {
    lastResult = await executeWorkbenchUserCommandAction(step, executeCommand);
  }

  return lastResult;
}

export function registerWorkbenchUserCommands(
  extensionRegistry: ExtensionRegistry,
  userCommands: readonly WorkbenchUserCommandDefinition[],
): { dispose(): void } {
  const disposables = userCommands.map((userCommand) =>
    extensionRegistry.commands.registerCommand({
      category: userCommand.category,
      handler: () =>
        executeWorkbenchUserCommandAction(userCommand.action, (commandId, ...args) =>
          extensionRegistry.executeCommand(commandId, ...args),
        ),
      id: userCommand.command,
      title: userCommand.title,
    }),
  );

  return {
    dispose() {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    },
  };
}
