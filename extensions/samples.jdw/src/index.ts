import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.jdw' as const;
export const JDW_LAB_VIEW_ID = 'workbench-kit.samples.jdw.panel' as const;
export const JDW_LAB_VIEW_RENDER_KIND = 'workbench-kit.samples.jdw.view' as const;

export const JDW_LAB_WIDGET_TREE_PATH = 'jdw/showcase/example.jdw.json' as const;
export const JDW_LAB_TEMPLATE_PATH = 'jdw/templates/analytics-dashboard.jdw.json' as const;

export interface SampleJdwLabViewRenderData {
  readonly kind: typeof JDW_LAB_VIEW_RENDER_KIND;
  readonly templateJdwPath: typeof JDW_LAB_TEMPLATE_PATH;
  readonly widgetTreePath: typeof JDW_LAB_WIDGET_TREE_PATH;
}

export function activate(context: ExtensionContext): void {
  context.views.registerViewProvider({
    viewId: JDW_LAB_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): SampleJdwLabViewRenderData => ({
        kind: JDW_LAB_VIEW_RENDER_KIND,
        templateJdwPath: JDW_LAB_TEMPLATE_PATH,
        widgetTreePath: JDW_LAB_WIDGET_TREE_PATH,
      }),
      title: 'JDW Lab',
    }),
  });
}
