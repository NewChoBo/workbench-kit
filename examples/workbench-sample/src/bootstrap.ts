import { expandJsonWidgetDocumentRefsFromSource } from '@workbench-kit/jdw';
import jdwNodeSchemaJson from '@workbench-kit/jdw/schemas/jdw-node.jdw.schema.json';
import widgetDocumentSchemaJson from '@workbench-kit/jdw/schemas/widget-document.v1.jdw.schema.json';
import {
  JDW_SCHEMA_DOCUMENT_MIME,
  JDW_WIDGET_DOCUMENT_MIME,
} from '@workbench-kit/react/jdw/document';
import { formatJdwSampleScreenJson, JDW_SAMPLE_SCREENS } from '@workbench-kit/react/jdw/samples';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';
import {
  parseWorkbenchExtensionsConfig,
  parseWorkbenchExtensionsLock,
  parseWorkbenchKeybindingsConfig,
  parseWorkbenchLayoutConfig,
  parseWorkbenchSettingsConfig,
  parseWorkbenchUserCommandsConfig,
  type WorkbenchKeybindingDefinition,
  type WorkbenchSettingsConfig,
  type WorkbenchUserCommandDefinition,
} from '@workbench-kit/workbench-config';

import extensionsJson from '../../../.workbench/extensions.json';
import extensionsLockJson from '../../../.workbench/extensions.lock.json';
import keybindingsJson from '../../../.workbench/keybindings.json';
import layoutJson from '../../../.workbench/layout.default.json';
import settingsJson from '../../../.workbench/settings.json';
import tasksJson from '../../../.workbench/tasks.json';
import userCommandsJson from '../../../.workbench/user-commands.json';
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
/** Primary JDW showcase under explorer `jdw/showcase/`. */
export const SAMPLE_EXAMPLE_JDW_PATH = 'jdw/showcase/example.jdw.json';
/** Known-type layout smoke document (JSON → draw). */
export const SAMPLE_KNOWN_TYPES_JDW_PATH = 'jdw/known-types/known-types.jdw.json';
/** Dynamic `${var}` + listen demo document. */
export const SAMPLE_DYNAMIC_VALUES_JDW_PATH = 'jdw/dynamic-values/dynamic-values.jdw.json';
/** Multi-cell dashboard grid. */
export const SAMPLE_GRID_DASHBOARD_JDW_PATH = 'jdw/grid-dashboard/grid-dashboard.jdw.json';
/** Stack with absolute overlays. */
export const SAMPLE_STACK_HERO_JDW_PATH = 'jdw/stack-hero/stack-hero.jdw.json';
/** Nested row/column/expanded/flexible. */
export const SAMPLE_NESTED_FLEX_JDW_PATH = 'jdw/nested-flex/nested-flex.jdw.json';
/** Image, icon, and caption media strip. */
export const SAMPLE_MEDIA_ROW_JDW_PATH = 'jdw/media-row/media-row.jdw.json';
/** Long text that exercises wrap metrics. */
export const SAMPLE_WRAPPED_TEXT_JDW_PATH = 'jdw/wrapped-text/wrapped-text.jdw.json';
/** Button action bar inside boxes. */
export const SAMPLE_ACTION_BAR_JDW_PATH = 'jdw/action-bar/action-bar.jdw.json';
/** Reusable header part (imported by composed pages). */
export const SAMPLE_PART_HEADER_JDW_PATH = 'jdw/parts/header/header.jdw.json';
/** Reusable status chip part. */
export const SAMPLE_PART_STATUS_CHIP_JDW_PATH = 'jdw/parts/status-chip/status-chip.jdw.json';
/** Authored composed page using `type: "ref"` imports. */
export const SAMPLE_COMPOSED_HOME_REFS_JDW_PATH = 'jdw/composed/home.refs.jdw.json';
/** Drawable composed page after ref expansion (Form/Preview). */
export const SAMPLE_COMPOSED_HOME_JDW_PATH = 'jdw/composed/home.jdw.json';
export const SAMPLE_JDW_ASSET_HEADING_MANIFEST_PATH = 'jdw/assets/heading/manifest.json';
export const SAMPLE_JDW_ASSET_HEADING_CONTENT_PATH = 'jdw/assets/heading/content.json';
export const SAMPLE_JDW_ASSET_HEADING_SCHEMA_PATH = 'jdw/assets/heading/schema.json';
/** JDW document created by one-way compilation from a Screen Spec template. */
export const SAMPLE_SCREEN_TEMPLATE_JDW_PATH = 'jdw/templates/analytics-dashboard.jdw.json';
export const SAMPLE_JDW_NODE_SCHEMA_PATH = 'schemas/jdw-node.jdw.schema.json';
export const SAMPLE_JDW_SCHEMA_PATH = 'schemas/widget-document.v1.jdw.schema.json';

/** Relative `$schema` from any `jdw/<sample>/…jdw.json` document. */
const JDW_SAMPLE_DOCUMENT_SCHEMA_REF = '../../schemas/widget-document.v1.jdw.schema.json';

export const workbenchSettings: WorkbenchSettingsConfig =
  parseWorkbenchSettingsConfig(settingsJson);
export const extensionsConfig = parseWorkbenchExtensionsConfig(extensionsJson);
export const extensionsLock = parseWorkbenchExtensionsLock(extensionsLockJson);
export const workbenchKeybindings: readonly WorkbenchKeybindingDefinition[] =
  parseWorkbenchKeybindingsConfig(keybindingsJson);
export const workbenchUserCommands: readonly WorkbenchUserCommandDefinition[] =
  parseWorkbenchUserCommandsConfig(userCommandsJson).commands;

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

const workbenchConfigFiles = createWorkbenchConfigVirtualFiles();

export const initialWorkspace: VirtualWorkspaceInitialState = {
  expandedPaths: [
    'jdw',
    'jdw/showcase',
    'jdw/known-types',
    'jdw/dynamic-values',
    'jdw/grid-dashboard',
    'jdw/stack-hero',
    'jdw/nested-flex',
    'jdw/media-row',
    'jdw/wrapped-text',
    'jdw/action-bar',
    'jdw/parts',
    'jdw/parts/header',
    'jdw/parts/status-chip',
    'jdw/composed',
    'jdw/assets',
    'jdw/assets/heading',
    'jdw/templates',
    'src',
    'src/components',
    'schemas',
    '.workbench',
  ],
  openPaths: [SAMPLE_EXAMPLE_JDW_PATH],
  files: [
    {
      content: [
        'import { WorkbenchProvider, WorkbenchShell } from "@workbench-kit/shell-react";',
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
        '- `jdw/<sample>/` keeps each fixture in its own folder.',
        '- `jdw/showcase/example.jdw.json` is the primary showcase (opens on startup).',
        '- `jdw/parts/` holds reusable documents; `jdw/composed/` imports them via `type: "ref"`.',
        '- Extra fixtures: known-types, dynamic-values, grid-dashboard, stack-hero, nested-flex, media-row, wrapped-text, action-bar.',
        '- `jdw/templates/analytics-dashboard.jdw.json` is compiled once from a Screen Spec template, then edited as JDW.',
        '- `.workbench/` holds shareable workbench configuration for the sample host.',
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
    ...createJdwWorkspaceFiles(),
    {
      content: formatJdwSampleScreenJson(JDW_SAMPLE_SCREENS[0]!),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_SCREEN_TEMPLATE_JDW_PATH,
    },
    ...workbenchConfigFiles,
  ],
  folders: [
    'jdw',
    'jdw/showcase',
    'jdw/known-types',
    'jdw/dynamic-values',
    'jdw/grid-dashboard',
    'jdw/stack-hero',
    'jdw/nested-flex',
    'jdw/media-row',
    'jdw/wrapped-text',
    'jdw/action-bar',
    'jdw/parts',
    'jdw/parts/header',
    'jdw/parts/status-chip',
    'jdw/composed',
    'jdw/assets',
    'jdw/assets/heading',
    'jdw/templates',
    'src',
    'src/components',
    'schemas',
    '.workbench',
  ],
};

export const workspaceInfo: SampleWorkspaceInfo = {
  fileCount: initialWorkspace.files?.length ?? 0,
  folderCount: initialWorkspace.folders?.length ?? 0,
  name: readWorkspaceName(workspaceJson),
  rootFolderCount: readWorkspaceFolderCount(workspaceJson),
};

function createJdwWorkspaceFiles() {
  return [
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
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
                text: 'This jdw/showcase/example.jdw.json document is the sample showcase surface.',
                fontSize: 13,
                color: '#cbd5e1',
              },
            },
            {
              type: 'text',
              args: {
                text: 'Open Code, Form (Widget Tree), or Preview — or use the JDW Lab activity.',
                fontSize: 12,
                color: '#93c5fd',
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_EXAMPLE_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 10,
          padding: 16,
          background: '#0f172a',
          children: [
            {
              type: 'text',
              args: { text: 'Known types (JSON → draw)', fontSize: 18, color: '#e2e8f0' },
            },
            {
              type: 'row',
              args: {
                gap: 8,
                children: [
                  {
                    type: 'expanded',
                    args: {
                      flex: 1,
                      child: {
                        type: 'container',
                        args: {
                          padding: 8,
                          background: '#1e293b',
                          child: {
                            type: 'text',
                            args: { text: 'container + text', color: '#f8fafc' },
                          },
                        },
                      },
                    },
                  },
                  {
                    type: 'box',
                    args: {
                      padding: 8,
                      background: '#334155',
                      child: {
                        type: 'button',
                        args: { label: 'button', variant: 'secondary' },
                      },
                    },
                  },
                ],
              },
            },
            {
              type: 'grid',
              args: {
                columns: 2,
                gap: 8,
                children: [
                  {
                    type: 'text',
                    args: { text: 'grid A', col: 0, row: 0, color: '#94a3b8' },
                  },
                  {
                    type: 'icon',
                    args: { name: 'symbol-method', size: 18, col: 1, row: 0, color: '#38bdf8' },
                  },
                  {
                    type: 'image',
                    args: {
                      src: 'https://example.com/sample.png',
                      alt: 'Sample',
                      width: 64,
                      height: 40,
                      col: 0,
                      row: 1,
                      colSpan: 2,
                    },
                  },
                ],
              },
            },
            {
              type: 'stack',
              args: {
                children: [
                  {
                    type: 'sized_box',
                    args: {
                      width: 160,
                      height: 48,
                      child: {
                        type: 'padding',
                        args: {
                          padding: 6,
                          child: {
                            type: 'center',
                            args: {
                              child: {
                                type: 'text',
                                args: { text: 'stack base', color: '#cbd5e1' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    type: 'align',
                    args: {
                      alignment: 'topRight',
                      left: 8,
                      top: 4,
                      child: {
                        type: 'text',
                        args: { text: 'overlay', fontSize: 11, color: '#fbbf24' },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_KNOWN_TYPES_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        listen: ['title', 'subtitle'],
        args: {
          gap: 8,
          padding: 16,
          background: '#111827',
          children: [
            {
              type: 'text',
              listen: ['title'],
              args: {
                text: '${title}',
                fontSize: 20,
                color: '#f8fafc',
              },
            },
            {
              type: 'text',
              listen: ['subtitle'],
              args: {
                text: '${subtitle}',
                fontSize: 13,
                color: '#94a3b8',
              },
            },
            {
              type: 'text',
              args: {
                text: 'Pass Preview values: title / subtitle (exact ${path} resolve).',
                fontSize: 11,
                color: '#64748b',
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_DYNAMIC_VALUES_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 12,
          padding: 16,
          background: '#0b1220',
          children: [
            {
              type: 'text',
              args: { text: 'Grid dashboard', fontSize: 18, color: '#f8fafc' },
            },
            {
              type: 'grid',
              args: {
                columns: 3,
                gap: 10,
                children: [
                  {
                    type: 'box',
                    args: {
                      padding: 12,
                      background: '#1e293b',
                      col: 0,
                      row: 0,
                      colSpan: 2,
                      child: {
                        type: 'column',
                        args: {
                          gap: 6,
                          children: [
                            {
                              type: 'text',
                              args: { text: 'Primary metric', fontSize: 12, color: '#94a3b8' },
                            },
                            {
                              type: 'text',
                              args: { text: '1,248', fontSize: 28, color: '#38bdf8' },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    type: 'box',
                    args: {
                      padding: 12,
                      background: '#172554',
                      col: 2,
                      row: 0,
                      child: {
                        type: 'column',
                        args: {
                          gap: 4,
                          children: [
                            {
                              type: 'icon',
                              args: { name: 'pulse', size: 18, color: '#93c5fd' },
                            },
                            {
                              type: 'text',
                              args: { text: 'Live', fontSize: 12, color: '#bfdbfe' },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    type: 'text',
                    args: {
                      text: 'North',
                      col: 0,
                      row: 1,
                      color: '#cbd5e1',
                      background: '#1e293b',
                      padding: 10,
                    },
                  },
                  {
                    type: 'text',
                    args: {
                      text: 'South',
                      col: 1,
                      row: 1,
                      color: '#cbd5e1',
                      background: '#1e293b',
                      padding: 10,
                    },
                  },
                  {
                    type: 'text',
                    args: {
                      text: 'West',
                      col: 2,
                      row: 1,
                      color: '#cbd5e1',
                      background: '#1e293b',
                      padding: 10,
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_GRID_DASHBOARD_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'stack',
        args: {
          width: 360,
          height: 200,
          background: '#111827',
          children: [
            {
              type: 'sized_box',
              args: {
                width: 360,
                height: 200,
                child: {
                  type: 'container',
                  args: {
                    padding: 16,
                    background: '#0f172a',
                    child: {
                      type: 'text',
                      args: { text: 'Hero base layer', fontSize: 14, color: '#64748b' },
                    },
                  },
                },
              },
            },
            {
              type: 'align',
              args: {
                alignment: 'bottomLeft',
                left: 16,
                bottom: 16,
                child: {
                  type: 'column',
                  args: {
                    gap: 4,
                    children: [
                      {
                        type: 'text',
                        args: { text: 'Stack hero', fontSize: 22, color: '#f8fafc' },
                      },
                      {
                        type: 'text',
                        args: {
                          text: 'Overlay copy sits above the base',
                          fontSize: 12,
                          color: '#cbd5e1',
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: 'align',
              args: {
                alignment: 'topRight',
                right: 12,
                top: 12,
                child: {
                  type: 'button',
                  args: { label: 'Action', variant: 'primary' },
                },
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_STACK_HERO_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 10,
          padding: 16,
          background: '#0f172a',
          children: [
            {
              type: 'text',
              args: { text: 'Nested flex', fontSize: 18, color: '#e2e8f0' },
            },
            {
              type: 'row',
              args: {
                gap: 8,
                children: [
                  {
                    type: 'expanded',
                    args: {
                      flex: 2,
                      child: {
                        type: 'box',
                        args: {
                          padding: 10,
                          background: '#1e293b',
                          child: {
                            type: 'text',
                            args: { text: 'flex: 2', color: '#f8fafc' },
                          },
                        },
                      },
                    },
                  },
                  {
                    type: 'flexible',
                    args: {
                      flex: 1,
                      fit: 'loose',
                      child: {
                        type: 'box',
                        args: {
                          padding: 10,
                          background: '#334155',
                          child: {
                            type: 'text',
                            args: { text: 'flexible', color: '#e2e8f0' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              type: 'row',
              args: {
                gap: 8,
                children: [
                  {
                    type: 'expanded',
                    args: {
                      flex: 1,
                      child: {
                        type: 'column',
                        args: {
                          gap: 6,
                          children: [
                            {
                              type: 'padding',
                              args: {
                                padding: 8,
                                child: {
                                  type: 'text',
                                  args: { text: 'Nested column A', color: '#94a3b8' },
                                },
                              },
                            },
                            {
                              type: 'center',
                              args: {
                                child: {
                                  type: 'text',
                                  args: { text: 'centered', color: '#38bdf8' },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    type: 'expanded',
                    args: {
                      flex: 1,
                      child: {
                        type: 'box',
                        args: {
                          padding: 8,
                          background: '#172554',
                          child: {
                            type: 'text',
                            args: { text: 'Nested column B', color: '#bfdbfe' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_NESTED_FLEX_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 12,
          padding: 16,
          background: '#111827',
          children: [
            {
              type: 'text',
              args: { text: 'Media row', fontSize: 18, color: '#f8fafc' },
            },
            {
              type: 'row',
              args: {
                gap: 12,
                children: [
                  {
                    type: 'column',
                    args: {
                      gap: 6,
                      children: [
                        {
                          type: 'image',
                          args: {
                            src: 'https://example.com/thumb-a.png',
                            alt: 'Thumb A',
                            width: 96,
                            height: 64,
                          },
                        },
                        {
                          type: 'text',
                          args: { text: 'Clip A', fontSize: 12, color: '#cbd5e1' },
                        },
                      ],
                    },
                  },
                  {
                    type: 'column',
                    args: {
                      gap: 6,
                      children: [
                        {
                          type: 'image',
                          args: {
                            src: 'https://example.com/thumb-b.png',
                            alt: 'Thumb B',
                            width: 96,
                            height: 64,
                          },
                        },
                        {
                          type: 'row',
                          args: {
                            gap: 4,
                            children: [
                              {
                                type: 'icon',
                                args: { name: 'play', size: 14, color: '#38bdf8' },
                              },
                              {
                                type: 'text',
                                args: { text: 'Clip B', fontSize: 12, color: '#cbd5e1' },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'column',
                    args: {
                      gap: 6,
                      children: [
                        {
                          type: 'image',
                          args: {
                            src: 'https://example.com/thumb-c.png',
                            alt: 'Thumb C',
                            width: 96,
                            height: 64,
                          },
                        },
                        {
                          type: 'text',
                          args: { text: 'Clip C', fontSize: 12, color: '#cbd5e1' },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_MEDIA_ROW_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 10,
          padding: 16,
          background: '#0b1220',
          children: [
            {
              type: 'text',
              args: { text: 'Wrapped text', fontSize: 18, color: '#f8fafc' },
            },
            {
              type: 'sized_box',
              args: {
                width: 220,
                child: {
                  type: 'text',
                  args: {
                    text: 'This paragraph is intentionally long so layout wraps within a fixed width and exercises wrapped text metrics for JSON → draw.',
                    fontSize: 13,
                    color: '#cbd5e1',
                  },
                },
              },
            },
            {
              type: 'sized_box',
              args: {
                width: 140,
                child: {
                  type: 'text',
                  args: {
                    text: 'Narrow column wraps even earlier for comparison.',
                    fontSize: 12,
                    color: '#94a3b8',
                  },
                },
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_WRAPPED_TEXT_JDW_PATH,
    },
    {
      content: formatSampleJson({
        $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
        type: 'column',
        args: {
          gap: 12,
          padding: 16,
          background: '#111827',
          children: [
            {
              type: 'text',
              args: { text: 'Action bar', fontSize: 18, color: '#f8fafc' },
            },
            {
              type: 'box',
              args: {
                padding: 12,
                background: '#1e293b',
                child: {
                  type: 'row',
                  args: {
                    gap: 8,
                    children: [
                      {
                        type: 'button',
                        args: { label: 'Save', variant: 'primary' },
                      },
                      {
                        type: 'button',
                        args: { label: 'Discard', variant: 'secondary' },
                      },
                      {
                        type: 'expanded',
                        args: {
                          flex: 1,
                          child: {
                            type: 'text',
                            args: { text: '', fontSize: 1 },
                          },
                        },
                      },
                      {
                        type: 'button',
                        args: { label: 'Delete', variant: 'danger' },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: 'container',
              args: {
                padding: 10,
                background: '#0f172a',
                child: {
                  type: 'row',
                  args: {
                    gap: 8,
                    children: [
                      {
                        type: 'icon',
                        args: { name: 'info', size: 16, color: '#38bdf8' },
                      },
                      {
                        type: 'text',
                        args: {
                          text: 'Buttons live inside box/container rows for Form smoke.',
                          fontSize: 12,
                          color: '#94a3b8',
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      }),
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_ACTION_BAR_JDW_PATH,
    },
    ...createJdwCompositionWorkspaceFiles(),
    {
      content: formatSampleJson({
        $schema: 'https://workbench-kit.dev/schemas/widget-asset-manifest.v1.jdw.schema.json',
        name: 'content.heading',
        label: 'Heading',
        category: 'content',
        kind: 'leaf',
        description: 'Parameterized heading asset (JD-2 schema.json inputs).',
      }),
      path: SAMPLE_JDW_ASSET_HEADING_MANIFEST_PATH,
    },
    {
      content: formatSampleJson({
        type: 'text',
        args: {
          text: '${title}',
          fontSize: '${fontSize}',
          color: '#e2e8f0',
        },
      }),
      path: SAMPLE_JDW_ASSET_HEADING_CONTENT_PATH,
    },
    {
      content: formatSampleJson({
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', default: 'Heading' },
          fontSize: { type: 'number', default: 24 },
        },
      }),
      path: SAMPLE_JDW_ASSET_HEADING_SCHEMA_PATH,
    },
  ];
}

function createJdwCompositionWorkspaceFiles() {
  const headerSource = formatSampleJson({
    $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
    type: 'column',
    args: {
      gap: 4,
      children: [
        {
          type: 'text',
          args: { text: '${title}', fontSize: 20, color: '#f8fafc' },
        },
        {
          type: 'text',
          args: { text: '${subtitle}', fontSize: 12, color: '#94a3b8' },
        },
      ],
    },
  });

  const statusChipSource = formatSampleJson({
    $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
    type: 'row',
    args: {
      gap: 6,
      children: [
        {
          type: 'icon',
          args: { name: 'pass-filled', size: 14, color: '#4ade80' },
        },
        {
          type: 'text',
          args: { text: '${label}', fontSize: 12, color: '#bbf7d0' },
        },
      ],
    },
  });

  const homeRefsSource = formatSampleJson({
    $schema: JDW_SAMPLE_DOCUMENT_SCHEMA_REF,
    type: 'column',
    args: {
      gap: 12,
      padding: 16,
      background: '#0b1220',
      children: [
        {
          type: 'ref',
          args: {
            path: '../parts/header/header.jdw.json',
            inputs: {
              title: 'Composed home',
              subtitle: 'Imports parts via type: "ref" (coding-style reuse)',
            },
          },
        },
        {
          type: 'ref',
          args: {
            path: '../parts/status-chip/status-chip.jdw.json',
            inputs: { label: 'Parts linked' },
          },
        },
        {
          type: 'text',
          args: {
            text: 'Open home.refs.jdw.json to see imports; home.jdw.json is the expanded drawable result.',
            fontSize: 12,
            color: '#64748b',
          },
        },
      ],
    },
  });

  const fileMap: Record<string, string> = {
    [SAMPLE_PART_HEADER_JDW_PATH]: headerSource,
    [SAMPLE_PART_STATUS_CHIP_JDW_PATH]: statusChipSource,
    [SAMPLE_COMPOSED_HOME_REFS_JDW_PATH]: homeRefsSource,
  };

  const expanded = expandJsonWidgetDocumentRefsFromSource(homeRefsSource, {
    documentPath: SAMPLE_COMPOSED_HOME_REFS_JDW_PATH,
    loadDocument: (path) => fileMap[path] ?? null,
  });

  if (expanded.source === null) {
    throw new Error(
      `Failed to expand composed home refs: ${expanded.issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  return [
    {
      content: headerSource,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_PART_HEADER_JDW_PATH,
    },
    {
      content: statusChipSource,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_PART_STATUS_CHIP_JDW_PATH,
    },
    {
      content: homeRefsSource,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_COMPOSED_HOME_REFS_JDW_PATH,
    },
    {
      content: expanded.source.endsWith('\n') ? expanded.source : `${expanded.source}\n`,
      mimeType: JDW_WIDGET_DOCUMENT_MIME,
      path: SAMPLE_COMPOSED_HOME_JDW_PATH,
    },
  ];
}

function createWorkbenchConfigVirtualFiles() {
  return [
    { content: formatSampleJson(workspaceJson), path: '.workbench/workspace.json' },
    { content: formatSampleJson(extensionsJson), path: '.workbench/extensions.json' },
    { content: formatSampleJson(layoutJson), path: '.workbench/layout.default.json' },
    { content: formatSampleJson(settingsJson), path: '.workbench/settings.json' },
    { content: formatSampleJson(keybindingsJson), path: '.workbench/keybindings.json' },
    { content: formatSampleJson(userCommandsJson), path: '.workbench/user-commands.json' },
    { content: formatSampleJson(tasksJson), path: '.workbench/tasks.json' },
  ];
}

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
