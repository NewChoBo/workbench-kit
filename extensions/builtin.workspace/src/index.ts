import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.workspace' as const;

export const SHOW_WORKSPACE_INFO_COMMAND_ID = 'workbench-kit.builtin.workspace.showInfo' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(SHOW_WORKSPACE_INFO_COMMAND_ID, () => ({
    extensionId: context.extensionId,
    workspaceCapabilityAvailable: context.getCapability('workbench.workspace') !== undefined,
  }));
}
