import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.settings' as const;

export const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(OPEN_SETTINGS_COMMAND_ID, () => ({
    opened: true,
    presentation: 'modal',
  }));
}
