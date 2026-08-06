import { describe, expect, it } from 'vitest';

import {
  FIELD_REMAP_EDITOR_HOST_RENDER_KIND,
  FieldRemapEditorHost,
  buildFieldRemapEditorUri,
  isFieldRemapEditorHostRenderData,
  parseFieldRemapEditorUri,
} from './field-remap-editor-host.js';

describe('field-remap-editor-host', () => {
  it('builds and parses editor URIs for table samples', () => {
    const uri = buildFieldRemapEditorUri('t-user-contact');
    expect(uri).toBe('workbench://field-remap/t-user-contact');
    expect(parseFieldRemapEditorUri(uri)).toBe('t-user-contact');
    expect(parseFieldRemapEditorUri(buildFieldRemapEditorUri('nested-ab'))).toBe('nested-ab');
    expect(parseFieldRemapEditorUri('workspace://file/README.md')).toBeUndefined();
  });

  it('renders a typed editor host payload', () => {
    const host = new FieldRemapEditorHost({
      resourceUri: buildFieldRemapEditorUri('t-emp-dept'),
    });

    expect(host.title).toBe('T_EMP → T_EMP_ROW');
    expect(host.render()).toEqual({
      kind: FIELD_REMAP_EDITOR_HOST_RENDER_KIND,
      resourceUri: 'workbench://field-remap/t-emp-dept',
      surfaceId: 't-emp-dept',
    });
    expect(isFieldRemapEditorHostRenderData(host.render())).toBe(true);

    const eventHost = new FieldRemapEditorHost({
      resourceUri: buildFieldRemapEditorUri('t-event-time'),
    });
    expect(eventHost.title).toBe('T_EVENT → T_SLOT');
  });
});
