import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.commands' as const;
export const COMMANDS_VIEW_ID = 'workbench-kit.builtin.commands.panel' as const;
export const COMMANDS_VIEW_RENDER_KIND = 'workbench-kit.builtin.commands.view' as const;
export const FOCUS_COMMAND_ID = 'workbench-kit.builtin.commands.focus' as const;
export const REFRESH_COMMAND_ID = 'workbench-kit.builtin.commands.refresh' as const;

export interface BuiltinCommandsViewRenderData {
  readonly kind: typeof COMMANDS_VIEW_RENDER_KIND;
}

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(FOCUS_COMMAND_ID, () => ({
    focused: true,
    viewId: COMMANDS_VIEW_ID,
  }));

  context.commands.registerCommand(REFRESH_COMMAND_ID, () => ({
    refreshed: true,
    viewId: COMMANDS_VIEW_ID,
  }));

  context.views.registerViewProvider({
    viewId: COMMANDS_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinCommandsViewRenderData => ({
        kind: COMMANDS_VIEW_RENDER_KIND,
      }),
      title: 'Commands',
    }),
  });
}
