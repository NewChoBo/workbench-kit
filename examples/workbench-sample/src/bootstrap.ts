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
  readonly fileCount: number;
  readonly name: string;
  readonly folderCount: number;
  readonly rootFolderCount: number;
}

export const SAMPLE_APP_PATH = 'src/App.tsx';
export const SAMPLE_BUTTON_PATH = 'src/components/Button.tsx';
export const SAMPLE_README_PATH = 'README.md';
export const SAMPLE_EXAMPLE_JDW_PATH = 'example.jdw.json';
export const SAMPLE_JDW_NODE_SCHEMA_PATH = 'schemas/jdw-node.jdw.schema.json';
export const SAMPLE_JDW_SCHEMA_PATH = 'schemas/widget-document.v1.jdw.schema.json';

export const extensionsConfig = parseWorkbenchExtensionsConfig(extensionsJson);

export const initialLayout = (() => {
  const layout = parseWorkbenchLayoutConfig(layoutJson);

  return {
    activityBar: {
      itemOrder: layout.activityBar.itemOrder,
      visible: layout.activityBar.visible,
    },
    sideBar: {
      activeViewContainer: layout.sideBar.activeViewContainer,
      visible: layout.sideBar.visible,
    },
  };
})();

export const initialWorkspace: VirtualWorkspaceInitialState = {
  expandedPaths: ['src', 'src/components', 'schemas'],
  openPaths: [SAMPLE_EXAMPLE_JDW_PATH],
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
        "import type { ComponentPropsWithRef } from 'react';",
        '',
        "type ButtonVariant = 'default' | 'primary' | 'danger';",
        '',
        "interface ButtonProps extends ComponentPropsWithRef<'button'> {",
        '  variant?: ButtonVariant;',
        '}',
        '',
        'export function Button({ variant = "default", ...props }: ButtonProps) {',
        '  return <button data-variant={variant} {...props} />;',
        '}',
      ].join('\n'),
      path: SAMPLE_BUTTON_PATH,
    },
    {
      content: [
        '# Workbench Kit Sample',
        '',
        'Frontend-only host demonstrating Workbench Kit package integration.',
        '',
        '- `example.jdw.json` is the editable JDW showcase document.',
        '- `schemas/widget-document.v1.jdw.schema.json` is imported from `@workbench-kit/jdw`.',
        '',
        '```mermaid',
        'graph TD',
        '  A[Explorer] --> B[Markdown source]',
        '  B --> C[Preview]',
        '  C --> D[Review]',
        '```',
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
        $schema: './schemas/widget-document.v1.jdw.schema.json',
        type: 'column',
        args: {
          gap: 12,
          padding: 24,
          background: '#111827',
          children: [
            {
              type: 'text',
              args: {
                text: 'Workbench Kit Sample',
                fontSize: 22,
                color: '#f8fafc',
              },
            },
            {
              type: 'text',
              args: {
                text: 'This example.jdw.json document is the sample showcase surface.',
                fontSize: 13,
                color: '#cbd5e1',
              },
            },
            {
              type: 'text',
              args: {
                text: 'Open it in Code, Form, or Preview mode to review the editor, schema, and JDW rendering flow.',
                fontSize: 12,
                color: '#93c5fd',
              },
            },
          ],
        },
      }),
      mimeType: JDW_DOCUMENT_MIME,
      path: SAMPLE_EXAMPLE_JDW_PATH,
    },
  ],
  folders: ['src', 'src/components', 'schemas'],
};

export const workspaceInfo: SampleWorkspaceInfo = {
  fileCount: initialWorkspace.files?.length ?? 0,
  folderCount: initialWorkspace.folders?.length ?? 0,
  name: readWorkspaceName(workspaceJson),
  rootFolderCount: readWorkspaceFolderCount(workspaceJson),
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
