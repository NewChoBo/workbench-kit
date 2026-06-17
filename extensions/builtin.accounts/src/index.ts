import { WORKBENCH_AUTH_CAPABILITY_ID, type WorkbenchAuthProvider } from '@workbench-kit/platform';
import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.accounts' as const;

export const MANAGE_ACCOUNTS_COMMAND_ID = 'workbench-kit.builtin.accounts.manage' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(MANAGE_ACCOUNTS_COMMAND_ID, () => ({
    authCapabilityAvailable:
      context.getCapability<WorkbenchAuthProvider>(WORKBENCH_AUTH_CAPABILITY_ID) !== undefined,
  }));
}
