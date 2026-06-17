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
export const SAMPLE_README_PATH = 'README.md';
export const SAMPLE_SHOWCASE_WORKBENCH_REACT_PATH = 'showcase/workbench-react.md';
export const SAMPLE_SHOWCASE_REACT_PATH = 'showcase/react-primitives.md';
export const SAMPLE_SHOWCASE_WORKSPACE_PATH = 'showcase/workspace.md';
export const SAMPLE_SHOWCASE_JDW_PATH = 'showcase/jdw.md';
export const SAMPLE_SHOWCASE_CONFIG_PATH = 'showcase/workbench-config.md';
export const SAMPLE_SHOWCASE_EXTENSIONS_PATH = 'showcase/extensions.md';
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

const sampleShowcaseDocuments = [
  {
    content: [
      '# @workbench-kit/workbench-react',
      '',
      'This package assembles the host-facing workbench shell.',
      '',
      '- `WorkbenchProvider` wires extensions, layout state, commands, and workspace ports.',
      '- `WorkbenchShell` renders the activity bar, sidebar, editor area, panels, and status bar.',
      '- `EditorArea` hosts tabs, Monaco-backed documents, JDW view modes, and split editor groups.',
      '',
      'The sample app uses this package as the integration layer instead of importing shell internals from lower packages.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_WORKBENCH_REACT_PATH,
  },
  {
    content: [
      '# @workbench-kit/react',
      '',
      'This package owns reusable React UI surfaces.',
      '',
      '- Primitives used here: `Button`, `Badge`, and `ScrollArea`.',
      '- Workbench UI used through the shell includes status bar models, workspace editor chrome, settings modal UI, and file icons.',
      '- JDW React rendering lives under `@workbench-kit/react/jdw` and is selected automatically for `.jdw.json` files.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_REACT_PATH,
  },
  {
    content: [
      '# @workbench-kit/workspace',
      '',
      'This package keeps workspace behavior framework-neutral.',
      '',
      '- `createWorkbenchWorkspaceHostPort()` creates the browser-side host port used by this sample.',
      '- `workspace.init` receives this virtual file tree at launch.',
      '- Explorer, editor open, save, rename, and file transactions consume the same workspace state.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_WORKSPACE_PATH,
  },
  {
    content: [
      '# @workbench-kit/jdw',
      '',
      'This package is the headless JSON Dynamic Widget engine.',
      '',
      '- Schema JSON is imported from `@workbench-kit/jdw/schemas/*`.',
      '- `.jdw.json` documents use one JSON source for code, form, and preview modes.',
      '- React preview rendering is layered through `@workbench-kit/react/jdw`, while parsing and schema contracts stay headless.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_JDW_PATH,
  },
  {
    content: [
      '# @workbench-kit/workbench-config',
      '',
      'This package parses shareable `.workbench` configuration.',
      '',
      '- `.workbench/extensions.json` selects bundled extensions.',
      '- `.workbench/layout.default.json` seeds sidebar visibility and active container.',
      '- `.workbench/workspace.json` provides sample workspace metadata.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_CONFIG_PATH,
  },
  {
    content: [
      '# Built-in extensions and SDK contracts',
      '',
      'The sample runs with bundled workbench extensions instead of hard-coded sidebar panels.',
      '',
      '- Explorer and settings are contributed through extension manifests.',
      '- Commands route through the platform command service.',
      '- Settings opens through a capability-backed modal so extension code does not depend on React shell internals.',
    ].join('\n'),
    path: SAMPLE_SHOWCASE_EXTENSIONS_PATH,
  },
] as const;

export const initialWorkspace: VirtualWorkspaceInitialState = {
  expandedPaths: ['src', 'showcase', 'schemas', 'jdw'],
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
        'Frontend-only host demonstrating Workbench Kit package integration.',
        '',
        '- `showcase/` contains package-by-package notes for the libraries used by this app.',
        '- `jdw/workbench-sample.jdw.json` is the editable JDW document.',
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
    ...sampleShowcaseDocuments,
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
  folders: ['src', 'showcase', 'schemas', 'jdw'],
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
