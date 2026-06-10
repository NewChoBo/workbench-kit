import type { RuntimeChatMessage } from '@workbench-kit/runtime';
import type { WorkspaceFile } from '@workbench-kit/workspace';

import {
  widgetStudioBuiltinAssetFiles,
  widgetStudioCustomAssetExampleFiles,
} from './widget-studio-assets.js';

export const integratedShellWorkspaceFolders = [
  'src',
  'src/components',
  'src/workbench',
  'src/widgets',
  'src/widgets/assets',
  'src/widgets/assets/heading',
  'src/widgets/assets/body',
  'src/widgets/assets/label',
  'src/widgets/assets/caption',
  'src/widgets/assets/row',
  'src/widgets/assets/column',
  'src/widgets/assets/grid-2',
  'src/widgets/assets/grid-3',
  'src/widgets/assets/media-card',
  'src/widgets/assets/section-stack',
  'src/widgets/assets/custom',
  'src/widgets/assets/custom/feature-badge',
  'docs',
  'public',
] as const;

const integratedShellCoreWorkspaceFiles: WorkspaceFile[] = [
  {
    path: 'src/App.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:12:00.000Z',
    source: 'user',
    content: `import { WorkbenchShell } from './workbench/Shell';

export function App() {
  return <WorkbenchShell title="Public UI Workbench" />;
}
`,
  },
  {
    path: 'src/components/Button.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:18:00.000Z',
    source: 'assistant',
    content: `import type { ComponentPropsWithRef } from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'default', ...props }: ButtonProps) {
  return <button data-variant={variant} {...props} />;
}
`,
  },
  {
    path: 'src/components/Panel.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:20:00.000Z',
    source: 'assistant',
    content: `import type { ComponentPropsWithRef, ReactNode } from 'react';

interface PanelProps extends ComponentPropsWithRef<'section'> {
  title: ReactNode;
}

export function Panel({ children, title, ...props }: PanelProps) {
  return (
    <section {...props}>
      <header>{title}</header>
      <div>{children}</div>
    </section>
  );
}
`,
  },
  {
    path: 'src/widgets/home.widget.json',
    mimeType: 'application/vnd.workbench-kit.widget+json',
    updatedAt: '2026-06-02T09:28:00.000Z',
    source: 'user',
    content: `{
  "type": "column",
  "args": {
    "children": [
      {
        "type": "text",
        "args": {
          "text": "Welcome"
        }
      }
    ]
  }
}
`,
  },
  {
    path: 'src/workbench/Shell.tsx',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:30:00.000Z',
    source: 'assistant',
    content: `import { ActivityBar, StatusBar } from '@workbench-kit/react/workbench';

export function WorkbenchShell({ title }: { title: string }) {
  return (
    <main aria-label={title}>
      <ActivityBar items={[]} />
      <section data-region="editor">
        <h1>{title}</h1>
      </section>
      <StatusBar compact />
    </main>
  );
}
`,
  },
  {
    path: 'src/workbench/search.ts',
    mimeType: 'application/typescript',
    updatedAt: '2026-06-02T09:34:00.000Z',
    source: 'assistant',
    content: `export function compactText(value: string) {
  return value.replace(/\\s+/g, ' ').trim();
}

export function createContentPreview(content: string, query: string) {
  const compact = compactText(content);
  const index = compact.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return compact.slice(0, 120);

  const start = Math.max(0, index - 48);
  const end = Math.min(compact.length, index + query.length + 72);
  return \`\${start > 0 ? '...' : ''}\${compact.slice(start, end)}\${end < compact.length ? '...' : ''}\`;
}
`,
  },
  {
    path: 'docs/getting-started.md',
    mimeType: 'text/markdown',
    updatedAt: '2026-06-02T09:42:00.000Z',
    source: 'user',
    content: `# Getting Started

Import shared styles once, then compose the workbench primitives in your app shell.

- Use Explorer for file navigation.
- Use Search for path and content matches.
- Use Chat for workspace-side conversations.
`,
  },
  {
    path: 'package.json',
    mimeType: 'application/json',
    updatedAt: '2026-06-02T09:50:00.000Z',
    source: 'user',
    content: `{
  "name": "@example/workbench-app",
  "private": true,
  "scripts": {
    "storybook": "storybook dev --port 6010"
  }
}
`,
  },
  {
    path: 'public/theme.css',
    mimeType: 'text/css',
    updatedAt: '2026-06-02T09:54:00.000Z',
    source: 'assistant',
    content: `:root {
  color-scheme: dark;
  --workspace-accent: #4aa8ff;
}

.workspace-file-icon {
  color: var(--workspace-accent);
}
`,
  },
];

export const integratedShellWorkspaceFiles: WorkspaceFile[] = [
  ...integratedShellCoreWorkspaceFiles,
  ...widgetStudioBuiltinAssetFiles,
  ...widgetStudioCustomAssetExampleFiles,
];

export {
  widgetStudioBuiltinAssetFiles,
  widgetStudioCustomAssetExampleFiles,
} from './widget-studio-assets.js';

export const integratedShellInitialRuntimeMessages: RuntimeChatMessage[] = [
  {
    id: 'm1',
    source: 'user',
    content:
      'Check whether the workbench shell covers explorer, search, chat, settings, and status surfaces.',
  },
  {
    id: 'm2',
    source: 'assistant',
    content:
      'The integrated story now keeps those surfaces in one stateful shell with public mock data.',
  },
  {
    id: 'm3',
    source: 'assistant',
    content:
      'Search results, file icons, and the editor preview are driven by the same virtual workspace.',
  },
];

export const integratedShellDefaultSelectionByActivity = {
  explorer: 'src/App.tsx',
  search: 'src/components/Button.tsx',
  chat: 'src/App.tsx',
} as const;

export function createIntegratedShellChatRuntimeResponse(message: RuntimeChatMessage) {
  return {
    chunks: [
      'Mock runtime received the workspace request. ',
      'A workspace patch is ready in `docs/runtime-notes.md`.',
    ],
    intervalMs: 20,
    workspacePatches: [
      {
        content: `# Runtime Notes\n\nLast request: ${message.content}\n\nThis file was produced by the public mock runtime fixture.\n`,
        mimeType: 'text/markdown',
        path: 'docs/runtime-notes.md',
        source: 'assistant' as const,
        type: 'write-file' as const,
        updatedAt: '2026-06-02T10:05:00.000Z',
      },
    ],
  };
}
