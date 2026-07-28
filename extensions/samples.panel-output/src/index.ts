import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.panel-output' as const;
export const PANEL_OUTPUT_VIEW_ID = 'workbench-kit.samples.panel-output.view' as const;
export const PANEL_OUTPUT_VIEW_CONTAINER_ID = 'panelOutput' as const;

export function activate(context: ExtensionContext): void {
  context.views.registerViewProvider({
    viewId: PANEL_OUTPUT_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: () => 'Sample Output — bottom panel contribution host demo.',
      title: 'Output',
    }),
  });
}
