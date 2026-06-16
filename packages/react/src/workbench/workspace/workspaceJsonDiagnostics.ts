import type * as Monaco from 'monaco-editor';
import jdwNodeSchemaJson from '@workbench-kit/jdw/schemas/jdw-node.jdw.schema.json';
import widgetDocumentSchemaJson from '@workbench-kit/jdw/schemas/widget-document.v1.jdw.schema.json';
import { formatWorkspaceResourceUri, type WorkspaceFile } from '@workbench-kit/workspace';
import { isJdwDocument } from '../../jdw/document';

export const JDW_WIDGET_DOCUMENT_SCHEMA_URI =
  'https://workbench-kit.dev/schemas/widget-document.v1.jdw.schema.json';
export const JDW_NODE_SCHEMA_URI = 'https://workbench-kit.dev/schemas/jdw-node.jdw.schema.json';

const WORKSPACE_URI_PATTERN = /^[a-z][a-z\d+\-.]*:/i;
const WORKSPACE_JDW_WIDGET_DOCUMENT_SCHEMA_PATH = 'schemas/widget-document.v1.jdw.schema.json';
const WORKSPACE_JDW_NODE_SCHEMA_PATH = 'schemas/jdw-node.jdw.schema.json';

interface WorkspaceEditorJsonDiagnosticsSchema {
  readonly fileMatch?: readonly string[];
  readonly schema: unknown;
  readonly uri: string;
}

export function monacoModelPathForWorkspaceFile(path: string): string {
  if (WORKSPACE_URI_PATTERN.test(path)) {
    return path;
  }

  return formatWorkspaceResourceUri({ kind: 'file', path });
}

export function getWorkspaceEditorJsonDiagnosticsSchemas(
  file: WorkspaceFile,
): readonly WorkspaceEditorJsonDiagnosticsSchema[] {
  if (!isJdwDocument(file)) {
    return [];
  }

  const modelPath = monacoModelPathForWorkspaceFile(file.path);
  const fileMatch = [modelPath, file.path];

  return [
    {
      schema: jdwNodeSchemaJson,
      uri: JDW_NODE_SCHEMA_URI,
    },
    {
      schema: jdwNodeSchemaJson,
      uri: formatWorkspaceResourceUri({ kind: 'file', path: WORKSPACE_JDW_NODE_SCHEMA_PATH }),
    },
    {
      fileMatch,
      schema: widgetDocumentSchemaJson,
      uri: JDW_WIDGET_DOCUMENT_SCHEMA_URI,
    },
    {
      fileMatch,
      schema: widgetDocumentSchemaJson,
      uri: formatWorkspaceResourceUri({
        kind: 'file',
        path: WORKSPACE_JDW_WIDGET_DOCUMENT_SCHEMA_PATH,
      }),
    },
  ];
}

export function configureWorkspaceEditorJsonDiagnostics(
  monacoInstance: typeof Monaco,
  file: WorkspaceFile,
): void {
  const schemas = getWorkspaceEditorJsonDiagnosticsSchemas(file);
  if (schemas.length === 0) return;

  const jsonDefaults = (
    monacoInstance.languages.json as unknown as {
      jsonDefaults?: { setDiagnosticsOptions: (options: unknown) => void };
    }
  ).jsonDefaults;
  if (!jsonDefaults) return;

  jsonDefaults.setDiagnosticsOptions({
    validate: true,
    enableSchemaRequest: true,
    schemas,
  });
}
