import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog } from '../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../workbench/story/StoryWorkbenchShellFrame';
import { Button, EditorTabs, SegmentedControl, type EditorTab } from '.';

const initialTabs: EditorTab[] = [
  {
    id: 'readme',
    label: 'README.md',
    preview: true,
    title: 'README.md',
    icon: 'markdown',
    fileIconKind: 'markdown',
  },
  {
    id: 'button',
    label: 'Button.tsx',
    dirty: true,
    title: 'src/Button.tsx',
    icon: 'file-code',
    fileIconKind: 'typescript',
  },
  {
    id: 'missing',
    label: 'deleted.json',
    missing: true,
    title: 'deleted.json',
    icon: 'json',
    fileIconKind: 'json',
  },
];

const meta = {
  title: 'React/Primitives/Editor Chrome',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
  render: () => <EditorChromeHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabsAndModeControls: Story = {
  name: 'Tabs and mode controls',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('tab', { name: /Button\.tsx/ }));
    await expect(canvas.getByRole('tab', { name: /Button\.tsx/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    await expect(canvas.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const missingTab = canvas.getByRole('tab', { name: /deleted\.json/ });
    await userEvent.click(within(missingTab).getByRole('button', { name: 'Close tab' }));
    await expect(canvas.queryByRole('tab', { name: /deleted\.json/ })).toBeNull();
    await expect(canvas.getByRole('status', { name: 'Editor chrome event log' })).toHaveTextContent(
      'Closed missing',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'New tab' }));
    await expect(canvas.getByRole('status', { name: 'Editor chrome event log' })).toHaveTextContent(
      'New tab requested',
    );
  },
  tags: ['storybook-play-required'],
};

function EditorChromeHarness() {
  const [activeId, setActiveId] = useState('readme');
  const [mode, setMode] = useState<'code' | 'preview'>('code');
  const [tabs, setTabs] = useState(initialTabs);
  const [status, setStatus] = useState('Ready');

  const closeTab = (tabId: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== tabId));
    if (activeId === tabId) {
      setActiveId('readme');
    }
    setStatus(`Closed ${tabId}`);
  };

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <EditorTabs
        activeId={activeId}
        aria-label="Open files"
        tabs={tabs}
        onClose={closeTab}
        onNewTab={() => setStatus('New tab requested')}
        onSelect={(tabId) => {
          setActiveId(tabId);
          setStatus(`Selected ${tabId}`);
        }}
      />

      <div className="ui-story-editor-toolbar">
        <SegmentedControl
          ariaLabel="Editor mode"
          options={[
            { label: 'Code', value: 'code' },
            { label: 'Preview', value: 'preview' },
          ]}
          value={mode}
          onChange={(nextMode) => {
            setMode(nextMode);
            setStatus(`Mode ${nextMode}`);
          }}
        />
        <Button compact disabled>
          {mode === 'code' ? 'Code surface' : 'Preview surface'}
        </Button>
      </div>

      <div className="ui-story-editor-placeholder" role="region" aria-label="Editor placeholder">
        <span className="ui-story-editor-placeholder__title">Editor main area</span>
        <span>{mode === 'code' ? 'Source view placeholder' : 'Preview view placeholder'}</span>
      </div>

      <StoryEventLog aria-label="Editor chrome event log" compact>
        {status}
      </StoryEventLog>
    </StoryWorkbenchShellFrame>
  );
}
