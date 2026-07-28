import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  WorkbenchMonacoDiffEditor,
  useMonacoWorkbenchThemeSync,
} from '@workbench-kit/monaco';

import { StoryWorkbenchShellFrame } from '../../../packages/react/src/workbench/story/StoryWorkbenchShellFrame';

const ORIGINAL = `{
  "name": "workbench-kit",
  "version": "0.0.1"
}
`;

const MODIFIED = `{
  "name": "workbench-kit",
  "version": "0.0.2",
  "private": false
}
`;

function MonacoDiffEditorDemo() {
  const [modified, setModified] = useState(MODIFIED);
  useMonacoWorkbenchThemeSync('dark');

  return (
    <StoryWorkbenchShellFrame fill variant="editor">
      <div
        data-testid="monaco-diff-editor-story"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <header
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--ui-border, #334155)',
            display: 'flex',
            gap: 12,
            padding: '8px 12px',
          }}
        >
          <strong>package.json</strong>
          <span style={{ color: 'var(--ui-text-muted, #94a3b8)', fontSize: 12 }}>
            WorkbenchMonacoDiffEditor (review / patch)
          </span>
        </header>
        <div style={{ flex: 1, minHeight: 0 }}>
          <WorkbenchMonacoDiffEditor
            height="100%"
            language="json"
            modified={modified}
            original={ORIGINAL}
            theme="dark"
            onModifiedChange={setModified}
          />
        </div>
      </div>
    </StoryWorkbenchShellFrame>
  );
}

const meta = {
  title: 'Workbench Sample/Monaco Diff Editor',
  parameters: {
    layout: 'fullscreen',
    fullHeightShell: '100vh',
    storybookGrid: { enabled: false },
    docs: {
      description: {
        component:
          'Public `@workbench-kit/monaco` DiffEditor wrapper with workbench theme sync in the editor/main frame.',
      },
    },
  },
  render: () => <MonacoDiffEditorDemo />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReviewPatch: Story = {
  name: 'Review / patch',
};
