import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { createCommandRegistry } from '@workbench-kit/platform';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/WorkbenchEditor';
import { ChatComposer } from './chat/ChatComposer';
import {
  WorkbenchCommandGroupShell,
  WorkbenchCommandPalette,
  WorkbenchCommandSuggest,
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  isWorkbenchCommandRunnable,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandGroupBy,
} from './CommandPalette';
import { WorkbenchShortcutCommandBridge } from './ShortcutCommandBridge';
import {
  WORKBENCH_EDITOR_SAVE_COMMAND_ID,
  createWorkbenchEditorCommands,
  type WorkbenchEditorCommandContext,
} from './commands';

const meta = {
  title: 'React/Workbench/Commands/CommandPalette',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const commandFixtures: WorkbenchCommandDescriptor[] = [
  {
    category: 'View',
    description: 'Open the selected artifact in a preview surface.',
    execution: { kind: 'local' },
    feedback: 'status',
    icon: 'codicon-open-preview',
    id: 'artifact.openPreview',
    keywords: ['artifact'],
    label: 'Open preview',
    output: 'artifact',
    shortcut: 'Ctrl+Enter',
  },
  {
    category: 'View',
    description: 'Switch the current artifact to source editing.',
    execution: { kind: 'local' },
    icon: 'codicon-json',
    id: 'artifact.editJson',
    keywords: ['artifact'],
    label: 'Edit JSON',
    shortcut: 'Ctrl+J',
  },
  {
    category: 'Operation',
    description: 'Run a remote validation operation for the current selection.',
    execution: { kind: 'remote' },
    feedback: 'timeline',
    icon: 'codicon-checklist',
    id: 'operation.validateSelection',
    keywords: ['validation', 'quality-gate'],
    label: 'Validate selection',
    output: 'event',
    status: 'waiting',
  },
  {
    category: 'Operation',
    description: 'Request a delegated operation that can create a new artifact.',
    execution: { kind: 'delegated', label: 'Delegated' },
    feedback: 'timeline',
    icon: 'codicon-sparkle',
    id: 'operation.createArtifact',
    keywords: ['draft', 'delegated'],
    label: 'Create artifact draft',
    output: 'artifact',
    status: 'running',
  },
  {
    category: 'Workspace',
    danger: true,
    description: 'Write the current artifact into the workspace.',
    disabled: true,
    disabledReason: 'Workspace writes are unavailable in this state.',
    execution: { kind: 'composite' },
    feedback: 'timeline',
    icon: 'codicon-file-code',
    id: 'workspace.writeArtifact',
    keywords: ['workspace', 'side-effect'],
    label: 'Write artifact',
    sideEffect: 'workspace-write',
    status: 'unavailable',
  },
];

function CommandStoryFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        alignItems: 'start',
        background: 'var(--color-surface)',
        display: 'grid',
        gap: 16,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

function PaletteHarness() {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState('No command run');

  return (
    <CommandStoryFrame>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => setOpen(true)}>Open palette</Button>
        <div aria-label="Command event log" role="status">
          {status}
        </div>
      </div>
      <WorkbenchCommandPalette
        commands={commandFixtures}
        open={open}
        onClose={() => setOpen(false)}
        onRunCommand={(command, context) => {
          setStatus(`Ran ${command.label} from ${context.source}`);
        }}
      />
    </CommandStoryFrame>
  );
}

function commandQueryFromDraft(draft: string) {
  const match = draft.match(/(?:^|\s)\/([^\s]*)$/);
  return match?.[1];
}

function SlashSuggestHarness() {
  const [draft, setDraft] = useState('/pre');
  const [activeCommandId, setActiveCommandId] = useState<string>();
  const [status, setStatus] = useState('No command selected');
  const query = commandQueryFromDraft(draft);
  const suggestedCommands = useMemo(
    () => filterWorkbenchCommands({ commands: commandFixtures, limit: 8, query }),
    [query],
  );

  const runCommand = (command: WorkbenchCommandDescriptor) => {
    if (!isWorkbenchCommandRunnable(command)) return;
    setStatus(`Selected ${command.label}`);
    setDraft(command.label);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query === undefined) return;

    const activeIndex = suggestedCommands.findIndex((command) => command.id === activeCommandId);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = getNextWorkbenchCommandIndex({
        commands: suggestedCommands,
        currentIndex: activeIndex,
        direction: event.key === 'ArrowDown' ? 'next' : 'previous',
      });
      if (nextIndex >= 0) {
        setActiveCommandId(suggestedCommands[nextIndex].id);
      }
    }

    if (event.key === 'Enter') {
      const activeCommand =
        suggestedCommands[activeIndex] ??
        suggestedCommands.find((command) => isWorkbenchCommandRunnable(command));
      if (!activeCommand) return;

      event.preventDefault();
      runCommand(activeCommand);
    }
  };

  return (
    <CommandStoryFrame>
      <div style={{ position: 'relative', width: 'min(100%, 440px)' }}>
        <ChatComposer
          showTools={false}
          value={draft}
          onKeyDown={handleComposerKeyDown}
          onSubmit={(message) => setStatus(`Submitted ${message}`)}
          onValueChange={(value) => {
            setDraft(value);
            setActiveCommandId(undefined);
          }}
        />
        <WorkbenchCommandSuggest
          activeCommandId={activeCommandId}
          commands={commandFixtures}
          query={query}
          style={{ marginTop: 8 }}
          visible={query !== undefined}
          onActiveCommandChange={setActiveCommandId}
          onRunCommand={(command) => runCommand(command)}
        />
      </div>
      <div aria-label="Suggest event log" role="status">
        {status}
      </div>
    </CommandStoryFrame>
  );
}

const groupModeOptions: { label: string; value: WorkbenchCommandGroupBy }[] = [
  { label: 'Category', value: 'category' },
  { label: 'Status', value: 'status' },
  { label: 'Execution', value: 'execution' },
  { label: 'Tag', value: 'keyword' },
];

function GroupedCommandShellHarness() {
  const [groupBy, setGroupBy] = useState<WorkbenchCommandGroupBy>('category');
  const [activeCommandId, setActiveCommandId] = useState<string>();
  const [status, setStatus] = useState('No command run');

  return (
    <CommandStoryFrame>
      <div style={{ display: 'grid', gap: 12, width: 'min(100%, 840px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SegmentedControl
            ariaLabel="Command grouping"
            options={groupModeOptions}
            value={groupBy}
            onChange={setGroupBy}
          />
          <div aria-label="Grouped command event log" role="status">
            {status}
          </div>
        </div>
        <WorkbenchCommandGroupShell
          activeCommandId={activeCommandId}
          commands={commandFixtures}
          groupBy={groupBy}
          onActiveCommandChange={setActiveCommandId}
          onRunCommand={(command, context) => {
            setStatus(`Ran ${command.label} from ${context.groupLabel}`);
          }}
        />
      </div>
    </CommandStoryFrame>
  );
}

function ShortcutCommandBridgeHarness() {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [dirty, setDirty] = useState(true);
  const [status, setStatus] = useState('No shortcut run');
  const registry = useMemo(
    () =>
      createCommandRegistry(
        createWorkbenchEditorCommands({
          commandOverrides: {
            [WORKBENCH_EDITOR_SAVE_COMMAND_ID]: {
              shortcut: 'Ctrl/Cmd+S',
            },
          },
        }),
      ),
    [],
  );
  const context = useMemo<WorkbenchEditorCommandContext>(
    () => ({
      canCloseAll: false,
      canCloseOthers: false,
      canClosePath: false,
      canCopyPath: true,
      canDeletePath: false,
      canDiscardFile: dirty,
      canSaveFile: true,
      canSplitDown: false,
      canSplitRight: false,
      canTogglePinned: false,
      closeAll: () => undefined,
      closeOthers: () => undefined,
      closePath: () => undefined,
      copyPath: () => undefined,
      deletePath: () => undefined,
      discardFile: () => {
        setDirty(false);
        setStatus('Discarded active file');
      },
      filePath: 'src/workbench.ts',
      hasMultipleOpenFiles: false,
      hasOpenFiles: true,
      hasUnsavedChanges: dirty,
      isPinned: false,
      saveFile: () => {
        setDirty(false);
        setStatus('Saved active file');
      },
      splitDown: () => undefined,
      splitRight: () => undefined,
      togglePinned: () => undefined,
    }),
    [dirty],
  );

  return (
    <CommandStoryFrame>
      <WorkbenchShortcutCommandBridge
        context={context}
        registry={registry}
        target={target}
        onShortcutCommand={(result) => {
          if (!result.handled) return;
          setStatus(`Saved active file via ${result.shortcut}`);
        }}
      />
      <div
        ref={setTarget}
        aria-label="Active shortcut surface"
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          display: 'grid',
          gap: 12,
          padding: 16,
          width: 'min(100%, 420px)',
        }}
        tabIndex={0}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>src/workbench.ts</strong>
          <span aria-label="File dirty state">{dirty ? 'Unsaved' : 'Saved'}</span>
        </div>
        <Button onClick={() => setDirty(true)}>Mark dirty</Button>
      </div>
      <div aria-label="Shortcut event log" role="status">
        {status}
      </div>
    </CommandStoryFrame>
  );
}

export const GlobalPalette: Story = {
  render: () => <PaletteHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = await canvas.findByRole('searchbox', { name: 'Search commands' });

    await userEvent.clear(search);
    await userEvent.type(search, 'preview');
    await expect(canvas.getByRole('option', { name: /Open preview/ })).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('Command event log')).toHaveTextContent(
      'Ran Open preview from palette',
    );
  },
};

export const ComposerSlashSuggest: Story = {
  render: () => <SlashSuggestHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByPlaceholderText('Type a message...');

    await expect(canvas.getByRole('option', { name: /Open preview/ })).toBeVisible();
    await userEvent.click(composer);
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('Suggest event log')).toHaveTextContent(
      'Selected Open preview',
    );
  },
};

export const GroupedCommandShell: Story = {
  render: () => <GroupedCommandShellHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('link', { name: 'View 2' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Status' }));
    await expect(canvas.getByRole('link', { name: 'Running 1' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tag' }));
    await expect(canvas.getByRole('link', { name: 'artifact 2' })).toBeVisible();

    await userEvent.click(canvas.getByRole('option', { name: /Open preview/ }));
    await expect(canvas.getByLabelText('Grouped command event log')).toHaveTextContent(
      'Ran Open preview from artifact',
    );
  },
};

export const ShortcutCommandBridge: Story = {
  render: () => <ShortcutCommandBridgeHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const surface = canvas.getByLabelText('Active shortcut surface');

    await expect(canvas.getByLabelText('File dirty state')).toHaveTextContent('Unsaved');
    await userEvent.click(surface);
    await userEvent.keyboard('{Control>}s{/Control}');
    await expect(canvas.getByLabelText('Shortcut event log')).toHaveTextContent(
      'Saved active file via Ctrl/Cmd+S',
    );
    await expect(canvas.getByLabelText('File dirty state')).toHaveTextContent('Saved');
  },
};

export const UnavailableAndEmptyStates: Story = {
  render: () => (
    <CommandStoryFrame>
      <div style={{ display: 'grid', gap: 12, width: 'min(100%, 440px)' }}>
        <WorkbenchCommandSuggest commands={commandFixtures} query="write" />
        <WorkbenchCommandSuggest commands={commandFixtures} query="missing" />
      </div>
    </CommandStoryFrame>
  ),
};
