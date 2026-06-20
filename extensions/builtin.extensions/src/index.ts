import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.extensions' as const;
export const EXTENSIONS_VIEW_ID = 'workbench-kit.builtin.extensions.panel' as const;
export const EXTENSIONS_VIEW_RENDER_KIND = 'workbench-kit.builtin.extensions.view' as const;
export const FOCUS_EXTENSIONS_COMMAND_ID = 'workbench-kit.builtin.extensions.focus' as const;

export interface BuiltinExtensionsViewRenderData {
  readonly kind: typeof EXTENSIONS_VIEW_RENDER_KIND;
}

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(FOCUS_EXTENSIONS_COMMAND_ID, () => ({
    focused: true,
    viewId: EXTENSIONS_VIEW_ID,
  }));

  context.views.registerViewProvider({
    viewId: EXTENSIONS_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinExtensionsViewRenderData => ({
        kind: EXTENSIONS_VIEW_RENDER_KIND,
      }),
      title: 'Extensions',
    }),
  });
}
