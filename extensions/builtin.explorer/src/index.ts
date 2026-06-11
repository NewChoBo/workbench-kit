import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.explorer' as const;

export const EXPLORER_VIEW_ID = 'workbench-kit.builtin.explorer.tree' as const;
export const REFRESH_COMMAND_ID = 'workbench-kit.builtin.explorer.refresh' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(REFRESH_COMMAND_ID, () => ({
    refreshed: true,
    viewId: EXPLORER_VIEW_ID,
  }));

  context.views.registerViewProvider({
    viewId: EXPLORER_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: () => 'Explorer\nNo workspace folders are open.',
    }),
  });
}
