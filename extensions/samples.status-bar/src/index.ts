import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.status-bar' as const;
export const SAMPLE_PROBLEMS_VIEW_ID = 'workbench-kit.samples.status-bar.problems' as const;
export const SAMPLE_STATUS_BAR_PING_COMMAND = 'workbench-kit.samples.status-bar.ping' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand(SAMPLE_STATUS_BAR_PING_COMMAND, () => {
    return 'Status bar sample ping';
  });

  context.views.registerViewProvider({
    viewId: SAMPLE_PROBLEMS_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: () => 'Sample Problems — contributes.panels alias demo.',
      title: 'Problems',
    }),
  });
}
