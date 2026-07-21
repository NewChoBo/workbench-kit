import { describe, expect, it } from 'vitest';
import { JDW_WIDGET_DOCUMENT_MIME } from '../../jdw/document';
import {
  JDW_NODE_SCHEMA_URI,
  JDW_WIDGET_DOCUMENT_SCHEMA_URI,
  getWorkspaceEditorJsonDiagnosticsSchemas,
  monacoModelPathForWorkspaceFile,
} from './workspaceJsonDiagnostics';

describe('WorkspaceEditor', () => {
  it('uses workspace resource uris for Monaco models', () => {
    expect(monacoModelPathForWorkspaceFile('jdw/workbench-sample.jdw.json')).toBe(
      'workspace://file/jdw/workbench-sample.jdw.json',
    );
    expect(monacoModelPathForWorkspaceFile('workspace://file/config.json')).toBe(
      'workspace://file/config.json',
    );
  });

  it('registers JDW document schemas in canonical and workspace-relative forms', () => {
    const schemas = getWorkspaceEditorJsonDiagnosticsSchemas({
      content: '{}',
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: 'jdw/workbench-sample.jdw.json',
    });

    expect(schemas.map((schema) => schema.uri)).toEqual([
      JDW_NODE_SCHEMA_URI,
      'workspace://file/schemas/jdw-node.jdw.schema.json',
      JDW_WIDGET_DOCUMENT_SCHEMA_URI,
      'workspace://file/schemas/widget-document.v1.jdw.schema.json',
    ]);
    expect(schemas[2]?.fileMatch).toEqual([
      'workspace://file/jdw/workbench-sample.jdw.json',
      'jdw/workbench-sample.jdw.json',
    ]);
  });

  it('loads the recursive static JDW node schema for workspace diagnostics', () => {
    const schemas = getWorkspaceEditorJsonDiagnosticsSchemas({
      content: '{}',
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: 'jdw/workbench-sample.jdw.json',
    });
    const nodeSchema = schemas[0]?.schema as
      | {
          definitions?: Record<string, unknown>;
        }
      | undefined;

    expect(nodeSchema?.definitions?.JdwNode).toBeDefined();
    expect(nodeSchema?.definitions?.StackJdwNode).toBeDefined();
    expect(nodeSchema?.definitions?.ImageJdwNode).toBeDefined();
    expect(nodeSchema?.definitions?.ButtonJdwNode).toBeDefined();
  });

  it('does not override diagnostics for unrelated JSON files', () => {
    expect(
      getWorkspaceEditorJsonDiagnosticsSchemas({
        content: '{}',
        mimeType: 'application/json',
        path: 'config.json',
      }),
    ).toEqual([]);
  });
});
