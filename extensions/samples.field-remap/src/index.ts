import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import {
  FIELD_REMAP_EDITOR_ID,
  FieldRemapEditorHost,
  parseFieldRemapEditorUri,
} from './field-remap-editor-host.js';

export const EXTENSION_ID = 'workbench-kit.samples.field-remap' as const;
export const FIELD_REMAP_VIEW_ID = 'workbench-kit.samples.field-remap.panel' as const;
export const FIELD_REMAP_VIEW_RENDER_KIND = 'workbench-kit.samples.field-remap.view' as const;

export interface SampleFieldRemapViewRenderData {
  readonly kind: typeof FIELD_REMAP_VIEW_RENDER_KIND;
}

export {
  FIELD_REMAP_EDITOR_HOST_RENDER_KIND,
  FIELD_REMAP_EDITOR_ID,
  FieldRemapEditorHost,
  buildFieldRemapEditorUri,
  isFieldRemapEditorHostRenderData,
  isFieldRemapEditorUri,
  parseFieldRemapEditorUri,
  type FieldRemapEditorHostRenderData,
  type FieldRemapEditorSurfaceId,
} from './field-remap-editor-host.js';

export function activate(context: ExtensionContext): void {
  context.editorResolvers.registerResolver({
    id: 'field-remap',
    priority: 20,
    canResolve: ({ resourceUri }) => parseFieldRemapEditorUri(resourceUri) !== undefined,
    resolve: () => FIELD_REMAP_EDITOR_ID,
  });

  context.editorHostFactories.registerFactory({
    id: 'workbench-kit.samples.field-remap.editorHost',
    priority: 20,
    canCreate: ({ editorId }) => editorId === FIELD_REMAP_EDITOR_ID,
    create: ({ resourceUri }) => {
      return new FieldRemapEditorHost({ resourceUri });
    },
  });

  context.views.registerViewProvider({
    viewId: FIELD_REMAP_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): SampleFieldRemapViewRenderData => ({
        kind: FIELD_REMAP_VIEW_RENDER_KIND,
      }),
      title: 'Schema Mapper',
    }),
  });
}
