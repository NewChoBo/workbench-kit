import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.accounts' as const;

export const MANAGE_ACCOUNTS_COMMAND_ID = 'workbench-kit.builtin.accounts.manage' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(MANAGE_ACCOUNTS_COMMAND_ID, () => ({
    accountCapabilityAvailable: context.getCapability('workbench.accounts') !== undefined,
  }));
}
