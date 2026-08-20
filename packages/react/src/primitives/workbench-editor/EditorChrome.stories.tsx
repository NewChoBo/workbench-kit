import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog } from '../../workbench/story/StorySidebarFrame';
import { StoryWorkbenchShellFrame } from '../../workbench/story/StoryWorkbenchShellFrame';
import { WorkbenchEditorTabs } from '../../workbench/editor/WorkbenchEditorTabs';
import { Button } from '../button';
import { EditorTabs, SegmentedControl, type EditorTab } from './WorkbenchEditor';

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
  title: 'Workbench UI/Editor/Chrome',
  parameters: {
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

export const StandaloneTabMenuExtensions: Story = {
  name: 'Standalone tab menu extensions',
  render: () => <StandaloneTabMenuHarness includeExtraItem />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const middleTab = canvas.getByRole('tab', { name: 'Middle.tsx' });

    await userEvent.pointer({ keys: '[MouseRight]', target: middleTab });

    const menu = canvas.getByRole('menu', { name: 'Editor tab menu' });
    await expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Close', 'Close others', 'Close to the right', 'Close all', 'Inspect tab']);
    await expect(within(menu).getByRole('separator')).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Inspect tab' }));
    await expect(
      canvas.getByRole('status', { name: 'Editor tab menu event log' }),
    ).toHaveTextContent('Inspected middle');

    await userEvent.pointer({ keys: '[MouseRight]', target: middleTab });
    await userEvent.click(
      within(canvas.getByRole('menu', { name: 'Editor tab menu' })).getByRole('menuitem', {
        name: 'Close to the right',
      }),
    );
    await expect(canvas.queryByRole('tab', { name: 'End.tsx' })).toBeNull();
    await expect(canvas.getByRole('tab', { name: 'Pinned.tsx' })).toBeInTheDocument();
    await expect(
      canvas.getByRole('status', { name: 'Editor tab menu event log' }),
    ).toHaveTextContent('Closed end');

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByRole('tab', { name: 'Pinned.tsx' }),
    });
    await expect(
      within(canvas.getByRole('menu', { name: 'Editor tab menu' })).getByRole('menuitem', {
        name: 'Close to the right',
      }),
    ).toBeDisabled();
  },
  tags: ['storybook-play-required'],
};

export const StandaloneTabMenuDefault: Story = {
  name: 'Standalone tab menu default',
  render: () => <StandaloneTabMenuHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByRole('tab', { name: 'Middle.tsx' }),
    });

    const menu = canvas.getByRole('menu', { name: 'Editor tab menu' });
    await expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Close', 'Close others', 'Close to the right', 'Close all']);
    await expect(within(menu).queryByRole('separator')).toBeNull();
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
          compact
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

function StandaloneTabMenuHarness({ includeExtraItem = false }: { includeExtraItem?: boolean }) {
  const [activeId, setActiveId] = useState('middle');
  const [tabs, setTabs] = useState<EditorTab[]>([
    { id: 'start', label: 'Start.tsx' },
    { id: 'middle', label: 'Middle.tsx' },
    { closable: false, id: 'pinned', label: 'Pinned.tsx' },
    { id: 'end', label: 'End.tsx' },
  ]);
  const [status, setStatus] = useState('Ready');

  const closeTab = (tabId: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== tabId));
    setStatus(`Closed ${tabId}`);
  };

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <WorkbenchEditorTabs
        activeId={activeId}
        aria-label="Standalone editor tabs"
        getExtraTabContextMenuItems={
          includeExtraItem
            ? (tabId) => [
                {
                  id: 'inspect-tab',
                  label: 'Inspect tab',
                  onSelect: () => setStatus(`Inspected ${tabId}`),
                },
              ]
            : undefined
        }
        tabs={tabs}
        onClose={closeTab}
        onSelect={setActiveId}
        onTabContextMenu={(tabId) => setStatus(`Observed ${tabId} menu`)}
      />

      <div className="ui-story-editor-placeholder" role="region" aria-label="Editor placeholder">
        <span className="ui-story-editor-placeholder__title">Standalone tab menu</span>
        <span>Right-click a tab to inspect built-in and host-provided actions.</span>
      </div>

      <StoryEventLog aria-label="Editor tab menu event log" compact>
        {status}
      </StoryEventLog>
    </StoryWorkbenchShellFrame>
  );
}
