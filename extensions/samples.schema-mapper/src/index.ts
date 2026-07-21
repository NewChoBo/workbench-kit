import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import {
  SCHEMA_MAPPER_EDITOR_ID,
  SchemaMapperEditorHost,
  parseSchemaMapperEditorUri,
} from './schema-mapper-editor-host.js';

export const EXTENSION_ID = 'workbench-kit.samples.schema-mapper' as const;
export const SCHEMA_MAPPER_VIEW_ID = 'workbench-kit.samples.schema-mapper.panel' as const;
export const SCHEMA_MAPPER_VIEW_RENDER_KIND = 'workbench-kit.samples.schema-mapper.view' as const;

export interface SampleSchemaMapperViewRenderData {
  readonly kind: typeof SCHEMA_MAPPER_VIEW_RENDER_KIND;
}

export {
  SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND,
  SCHEMA_MAPPER_EDITOR_ID,
  SchemaMapperEditorHost,
  buildSchemaMapperEditorUri,
  isSchemaMapperEditorHostRenderData,
  isSchemaMapperEditorUri,
  parseSchemaMapperEditorUri,
  type SchemaMapperEditorHostRenderData,
  type SchemaMapperEditorSurfaceId,
} from './schema-mapper-editor-host.js';

export function activate(context: ExtensionContext): void {
  context.editorResolvers.registerResolver({
    id: 'schema-mapper',
    priority: 20,
    canResolve: ({ resourceUri }) => parseSchemaMapperEditorUri(resourceUri) !== undefined,
    resolve: () => SCHEMA_MAPPER_EDITOR_ID,
  });

  context.editorHostFactories.registerFactory({
    id: 'workbench-kit.samples.schema-mapper.editorHost',
    priority: 20,
    canCreate: ({ editorId }) => editorId === SCHEMA_MAPPER_EDITOR_ID,
    create: ({ resourceUri }) => {
      return new SchemaMapperEditorHost({ resourceUri });
    },
  });

  context.views.registerViewProvider({
    viewId: SCHEMA_MAPPER_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): SampleSchemaMapperViewRenderData => ({
        kind: SCHEMA_MAPPER_VIEW_RENDER_KIND,
      }),
      title: 'Schema Mapper',
    }),
  });
}
