import { describe, expect, it } from 'vitest';

import {
  SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND,
  SchemaMapperEditorHost,
  buildSchemaMapperEditorUri,
  isSchemaMapperEditorHostRenderData,
  parseSchemaMapperEditorUri,
} from './schema-mapper-editor-host.js';

describe('schema-mapper-editor-host', () => {
  it('builds and parses editor URIs for table samples', () => {
    const uri = buildSchemaMapperEditorUri('t-user-contact');
    expect(uri).toBe('workbench://schema-mapper/t-user-contact');
    expect(parseSchemaMapperEditorUri(uri)).toBe('t-user-contact');
    expect(parseSchemaMapperEditorUri(buildSchemaMapperEditorUri('nested-ab'))).toBe('nested-ab');
    expect(parseSchemaMapperEditorUri(buildSchemaMapperEditorUri('interactive-bindings'))).toBe(
      'nested-ab',
    );
    expect(parseSchemaMapperEditorUri('workspace://file/README.md')).toBeUndefined();
  });

  it('renders a typed editor host payload', () => {
    const host = new SchemaMapperEditorHost({
      resourceUri: buildSchemaMapperEditorUri('t-emp-dept'),
    });

    expect(host.title).toBe('T_EMP → T_EMP_ROW');
    expect(host.render()).toEqual({
      kind: SCHEMA_MAPPER_EDITOR_HOST_RENDER_KIND,
      resourceUri: 'workbench://schema-mapper/t-emp-dept',
      surfaceId: 't-emp-dept',
    });
    expect(isSchemaMapperEditorHostRenderData(host.render())).toBe(true);

    const eventHost = new SchemaMapperEditorHost({
      resourceUri: buildSchemaMapperEditorUri('t-event-time'),
    });
    expect(eventHost.title).toBe('T_EVENT → T_SLOT');
  });
});
