import {
  parseWorkbenchExtensionsConfig,
  parseWorkbenchLayoutConfig,
} from '@workbench-kit/workbench-config';
import jdwNodeSchemaJson from '@workbench-kit/jdw/schemas/jdw-node.jdw.schema.json';
import widgetDocumentSchemaJson from '@workbench-kit/jdw/schemas/widget-document.v1.jdw.schema.json';
import { JDW_DOCUMENT_MIME, JDW_SCHEMA_DOCUMENT_MIME } from '@workbench-kit/react/jdw/document';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';

import extensionsJson from '../../../.workbench/extensions.json';
import layoutJson from '../../../.workbench/layout.default.json';
import workspaceJson from '../../../.workbench/workspace.json';

export interface SampleWorkspaceInfo {
  readonly name: string;
  readonly folderCount: number;
}

export const SAMPLE_APP_PATH = 'src/App.tsx';
export const SAMPLE_README_PATH = 'README.md';
export const SAMPLE_JDW_DOCUMENT_PATH = 'jdw/workbench-sample.jdw.json';
export const SAMPLE_JDW_NODE_SCHEMA_PATH = 'schemas/jdw-node.jdw.schema.json';
export const SAMPLE_JDW_SCHEMA_PATH = 'schemas/widget-document.v1.jdw.schema.json';

export const extensionsConfig = parseWorkbenchExtensionsConfig(extensionsJson);

export const initialLayout = (() => {
  const layout = parseWorkbenchLayoutConfig(layoutJson);

  return {
    sideBar: {
      activeViewContainer: layout.sideBar.activeViewContainer,
      visible: layout.sideBar.visible,
    },
  };
})();

export const workspaceInfo: SampleWorkspaceInfo = {
  name: readWorkspaceName(workspaceJson),
  folderCount: readWorkspaceFolderCount(workspaceJson),
};

export const initialWorkspace: VirtualWorkspaceInitialState = {
  expandedPaths: ['src', 'schemas', 'jdw'],
  files: [
    {
      content: [
        'import { WorkbenchProvider, WorkbenchShell } from "@workbench-kit/workbench-react";',
        '',
        'export function App() {',
        '  return <WorkbenchShell />;',
        '}',
      ].join('\n'),
      path: SAMPLE_APP_PATH,
    },
    {
      content: [
        '# Workbench Kit Sample',
        '',
        'Frontend-only host demonstrating editor tabs, workspace save, and JDW preview.',
        '',
        '- `jdw/workbench-sample.jdw.json` is the editable JDW document.',
        '- `schemas/widget-document.v1.jdw.schema.json` is imported from `@workbench-kit/jdw`.',
      ].join('\n'),
      path: SAMPLE_README_PATH,
    },
    {
      content: formatSampleJson(widgetDocumentSchemaJson),
      mimeType: JDW_SCHEMA_DOCUMENT_MIME,
      path: SAMPLE_JDW_SCHEMA_PATH,
    },
    {
      content: formatSampleJson(jdwNodeSchemaJson),
      mimeType: JDW_SCHEMA_DOCUMENT_MIME,
      path: SAMPLE_JDW_NODE_SCHEMA_PATH,
    },
    {
      content: formatSampleJson({
        $schema: '../schemas/widget-document.v1.jdw.schema.json',
        type: 'column',
        args: {
          gap: 10,
          padding: 20,
          background: '#13151a',
          children: [
            {
              type: 'text',
              args: {
                text: 'Workbench Sample',
                fontSize: 18,
                color: '#e8eaed',
              },
            },
            {
              type: 'text',
              args: {
                text: 'This .jdw.json document renders through the JDW preview.',
                fontSize: 12,
                color: '#9aa0a6',
              },
            },
          ],
        },
      }),
      mimeType: JDW_DOCUMENT_MIME,
      path: SAMPLE_JDW_DOCUMENT_PATH,
    },
  ],
  folders: ['src', 'schemas', 'jdw'],
};

function formatSampleJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readWorkspaceName(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return 'Workbench';
  }

  const name = (value as { name?: unknown }).name;
  return typeof name === 'string' && name.trim().length > 0 ? name : 'Workbench';
}

function readWorkspaceFolderCount(value: unknown): number {
  if (typeof value !== 'object' || value === null) {
    return 0;
  }

  const folders = (value as { folders?: unknown }).folders;
  return Array.isArray(folders) ? folders.length : 0;
}
