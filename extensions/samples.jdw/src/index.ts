import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.jdw' as const;
export const JDW_LAB_VIEW_ID = 'workbench-kit.samples.jdw.panel' as const;
export const JDW_LAB_VIEW_RENDER_KIND = 'workbench-kit.samples.jdw.view' as const;

export const JDW_LAB_WIDGET_TREE_PATH = 'jdw/showcase/example.jdw.json' as const;
export const JDW_LAB_TEMPLATE_PATH = 'jdw/templates/analytics-dashboard.jdw.json' as const;

export const JDW_WIDGET_FORM_PROVIDER_ID = 'workbench-kit.samples.jdw.widget-form' as const;
export const JDW_WIDGET_PREVIEW_PROVIDER_ID = 'workbench-kit.samples.jdw.widget-preview' as const;
export const JDW_WIDGET_FORM_RENDER_KIND = 'workbench-kit.samples.jdw.widget-form' as const;
export const JDW_WIDGET_PREVIEW_RENDER_KIND = 'workbench-kit.samples.jdw.widget-preview' as const;

export interface SampleJdwLabViewRenderData {
  readonly kind: typeof JDW_LAB_VIEW_RENDER_KIND;
  readonly templateJdwPath: typeof JDW_LAB_TEMPLATE_PATH;
  readonly widgetTreePath: typeof JDW_LAB_WIDGET_TREE_PATH;
}

export interface SampleJdwWidgetFormRenderData {
  readonly kind: typeof JDW_WIDGET_FORM_RENDER_KIND;
}

export interface SampleJdwWidgetPreviewRenderData {
  readonly kind: typeof JDW_WIDGET_PREVIEW_RENDER_KIND;
}

function isJdwWidgetDocument(path: string, mimeType: string | undefined): boolean {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  if (
    normalized.endsWith('.jdw.schema.json') ||
    normalized.endsWith('.schema.jdw.json') ||
    normalized.endsWith('.refs.jdw.json')
  ) {
    return false;
  }
  if (normalized.endsWith('.jdw.json') || normalized.endsWith('.jdw')) {
    return true;
  }
  return mimeType === 'application/vnd.workbench-kit.jdw+json';
}

export function activate(context: ExtensionContext): void {
  context.editorDocumentViews.registerProvider({
    id: JDW_WIDGET_FORM_PROVIDER_ID,
    kind: 'form',
    label: 'Form',
    priority: 20,
    filenamePatterns: ['*.jdw.json', '*.jdw'],
    mimeTypes: ['application/vnd.workbench-kit.jdw+json'],
    matches: (document) => isJdwWidgetDocument(document.path, document.mimeType),
    render: (): SampleJdwWidgetFormRenderData => ({
      kind: JDW_WIDGET_FORM_RENDER_KIND,
    }),
  });

  context.editorDocumentViews.registerProvider({
    id: JDW_WIDGET_PREVIEW_PROVIDER_ID,
    kind: 'preview',
    label: 'Preview',
    priority: 10,
    filenamePatterns: ['*.jdw.json', '*.jdw'],
    mimeTypes: ['application/vnd.workbench-kit.jdw+json'],
    matches: (document) => isJdwWidgetDocument(document.path, document.mimeType),
    render: (): SampleJdwWidgetPreviewRenderData => ({
      kind: JDW_WIDGET_PREVIEW_RENDER_KIND,
    }),
  });

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
