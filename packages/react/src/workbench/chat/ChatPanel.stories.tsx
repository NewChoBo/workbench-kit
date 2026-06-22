import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  createChatTransportFromRuntime,
  createWorkspaceFileRepository,
} from '@workbench-kit/adapters';
import {
  createMockWorkbenchRuntime,
  type MockWorkbenchRuntime,
  type MockRuntimeResponsePlan,
  type RuntimeStatus,
} from '@workbench-kit/runtime';
import type {
  ChatTransport,
  ChatStreamEvent,
  WorkspacePatchApplyResult,
  WorkspacePatchEvent,
} from '@workbench-kit/contracts';
import { createDemoRuntimeServices } from '../demo/demoRuntimeServices';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage, ChatCommandProposalStatus } from './types';

const meta = {
  title: 'React/Workbench/Chat/ChatPanel',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface ChatRuntimeHarnessProps {
  response: MockRuntimeResponsePlan;
  title?: string;
  chatTransportFactory?: (runtime: MockWorkbenchRuntime) => ChatTransport;
}

function runtimeStatusLabel(status: RuntimeStatus) {
  if (status === 'running') return 'Runtime running';
  if (status === 'cancelled') return 'Runtime stopped';
  if (status === 'error') return 'Runtime error';
  return 'Runtime idle';
}

function workspacePatchLabel(patch: WorkspacePatchEvent) {
  if (patch.type === 'delete-file') return `Patch delete: ${patch.path}`;
  return `Patch write: ${patch.path}`;
}

function updateMessages(currentMessages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = currentMessages.findIndex((entry) => entry.id === message.id);
  if (index < 0) return [...currentMessages, message];

  const nextMessages = [...currentMessages];
  nextMessages[index] = message;
  return nextMessages;
}

function ChatRuntimeHarness({
  response,
  title = 'Runtime Chat',
  chatTransportFactory,
}: ChatRuntimeHarnessProps) {
  const runtime = useMemo(
    () =>
      createMockWorkbenchRuntime({
        idPrefix: 'chat-story-message',
        response,
      }),
    [response],
  );
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    runtime.getMessages().map((message) => ({
      content: message.content,
      createdAt: message.createdAt,
      id: message.id,
      label: message.label,
      source: message.source,
    })),
  );
  const [status, setStatus] = useState<RuntimeStatus>(() => runtime.getStatus());
  const [workspacePatchLog, setWorkspacePatchLog] = useState<string[]>([]);
  const chatRuntimeTransport = useMemo(
    () =>
      chatTransportFactory
        ? chatTransportFactory(runtime)
        : createChatTransportFromRuntime({
            runtime,
          }),
    [runtime, chatTransportFactory],
  );
  const repository = useMemo(
    () =>
      createWorkspaceFileRepository({
        files: [],
        createFile: () => undefined,
        deleteFile: () => undefined,
        saveFile: () => undefined,
      }),
    [],
  );
  const extensionRuntime = useMemo(
    () =>
      createDemoRuntimeServices({
        commandContributions: [],
        chatTransport: chatRuntimeTransport,
        repository,
        onChatPatch: (_patch: WorkspacePatchEvent, result: WorkspacePatchApplyResult) => {
          if (result.type === 'patch:failed') {
            setWorkspacePatchLog((currentLog) => [
              ...currentLog,
              `Patch failed: ${result.message}`,
            ]);
            return;
          }

          setWorkspacePatchLog((currentLog) => [...currentLog, workspacePatchLabel(result.patch)]);
        },
      }),
    [chatRuntimeTransport, repository],
  );
  const chatService = extensionRuntime.services.chatService;

  useEffect(() => {
    const unsubscribe = chatService.subscribe((event: ChatStreamEvent) => {
      if (event.type === 'message' || event.type === 'message-delta') {
        setMessages((currentMessages) => updateMessages(currentMessages, event.message));
      }

      if (event.type === 'status') {
        setStatus(event.status);
      }
    });

    return () => {
      unsubscribe();
      extensionRuntime.dispose();
      runtime.dispose();
    };
  }, [chatService, runtime, extensionRuntime]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: 'min(calc(100% - 120px), 620px)',
        width: 'min(100%, 420px)',
      }}
    >
      <ChatPanel
        assistantLabel="Assistant"
        emptyLabel="Start a runtime conversation."
        isRunning={status === 'running'}
        messages={messages}
        placeholder="Ask the mock runtime"
        showTools={false}
        title={title}
        value={draft}
        onCancel={() => chatService.cancel()}
        onSubmit={async (message) => {
          setDraft('');
          try {
            await chatService.sendMessage(message);
          } catch {
            // transport/service failures are expected in baseline failure-path scenarios
          } finally {
            setStatus(chatService.getSnapshot().status);
          }
        }}
        onValueChange={setDraft}
      />
      <div
        aria-label="Runtime event log"
        role="status"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          font: '12px/1.4 var(--font-mono)',
          minHeight: 44,
          padding: 8,
        }}
      >
        <div>{runtimeStatusLabel(status)}</div>
        {workspacePatchLog.map((entry) => (
          <div key={entry}>{entry}</div>
        ))}
      </div>
    </div>
  );
}

export const StreamingRuntimeFlow: Story = {
  render: () => (
    <ChatRuntimeHarness
      response={{
        chunks: ['Planning runtime update. ', 'Writing workspace notes.'],
        intervalMs: 60,
        workspacePatches: [
          {
            content: 'Runtime story notes',
            path: 'docs/chat-stream.md',
            source: 'assistant',
            type: 'write-file',
          },
        ],
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByPlaceholderText('Ask the mock runtime');

    await expect(canvas.getByText('Start a runtime conversation.')).toBeVisible();
    await userEvent.type(composer, 'Stream a workspace note');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent('Runtime running');
    await expect(await canvas.findByText(/Planning runtime update/)).toBeVisible();
    await expect(await canvas.findByText(/Writing workspace notes/)).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent('Runtime idle'),
    );
    await expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent(
      'Patch write: docs/chat-stream.md',
    );
  },
};

export const CancelRuntimeFlow: Story = {
  render: () => (
    <ChatRuntimeHarness
      response={{
        chunks: ['First cancelable chunk. ', 'Second chunk should not render.'],
        intervalMs: 250,
      }}
      title="Cancelable Runtime Chat"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByPlaceholderText('Ask the mock runtime');

    await userEvent.type(composer, 'Start and cancel');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(await canvas.findByText(/First cancelable chunk/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Stop response' }));
    await expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent('Runtime stopped');

    await new Promise((resolve) => globalThis.setTimeout(resolve, 350));

    await expect(canvas.queryByText(/Second chunk should not render/)).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Send message' })).toBeDisabled();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

function createOverflowMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    content: `Overflow check message ${index + 1}. ${'The quick brown fox jumps over the lazy dog. '.repeat(4)}`,
    id: `overflow-message-${index + 1}`,
    source: index % 2 === 0 ? 'user' : 'assistant',
  }));
}

export const MessageListOverflowScroll: Story = {
  name: 'Chat / Message List Overflow',
  render: () => (
    <div
      style={{
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        height: 200,
        overflow: 'hidden',
        padding: 16,
        width: 'min(100%, 420px)',
      }}
    >
      <ChatPanel
        assistantLabel="Assistant"
        messages={createOverflowMessages(48)}
        placeholder="Type a message"
        title="Overflow Chat"
        value=""
        onSubmit={() => undefined}
        onValueChange={() => undefined}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const messageScroll = canvasElement.querySelector<HTMLElement>(
      '.chat-side-bar-view .ui-side-bar-view__body',
    );

    expect(messageScroll).toBeTruthy();
    expect(messageScroll!.scrollHeight).toBeGreaterThan(messageScroll!.clientHeight + 8);
    await expect(canvas.getByText(/^Overflow check message 1\. /)).toBeVisible();

    messageScroll!.scrollTop = messageScroll!.scrollHeight;
    await expect(canvas.getByText(/^Overflow check message 48\. /)).toBeVisible();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const WorkspacePatchRuntimeFlow: Story = {
  render: () => (
    <ChatRuntimeHarness
      response={{
        chunks: ['Removing stale workspace note.'],
        intervalMs: 40,
        workspacePatches: [
          {
            path: 'docs/stale-runtime-note.md',
            type: 'delete-file',
          },
        ],
      }}
      title="Workspace Patch Runtime Chat"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByPlaceholderText('Ask the mock runtime');

    await userEvent.type(composer, 'Remove stale note');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expect(await canvas.findByText(/Removing stale workspace note/)).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent(
        'Patch delete: docs/stale-runtime-note.md',
      ),
    );
    await expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent('Runtime idle');
  },
};

function CommandProposalHarness() {
  const [eventLog, setEventLog] = useState('Ready');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      commandProposals: [
        {
          args: ['soft'],
          commandId: 'workbench.action.reloadWindow',
          description: 'Reloads the workbench to apply extension changes.',
          id: 'proposal-reload',
          label: 'Reload workbench',
          policy: 'approval-required',
          status: 'pending',
        },
      ],
      content: 'I can reload the workbench to apply pending extension changes.',
      id: 'assistant-proposal',
      source: 'assistant',
    },
  ]);

  const updateProposalStatus = (
    messageId: string,
    proposalId: string,
    status: ChatCommandProposalStatus,
  ) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || !message.commandProposals) {
          return message;
        }

        return {
          ...message,
          commandProposals: message.commandProposals.map((proposal) =>
            proposal.id === proposalId ? { ...proposal, status } : proposal,
          ),
        };
      }),
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: 'min(calc(100% - 120px), 520px)',
        width: 'min(100%, 420px)',
      }}
    >
      <ChatPanel
        assistantLabel="Assistant"
        messages={messages}
        placeholder="Ask the assistant"
        title="Command proposals"
        value=""
        onCommandProposalAllow={(messageId, proposal) => {
          updateProposalStatus(messageId, proposal.id, 'allowed');
          setEventLog(`Allowed ${proposal.commandId}`);
        }}
        onCommandProposalDeny={(messageId, proposal) => {
          updateProposalStatus(messageId, proposal.id, 'denied');
          setEventLog(`Denied ${proposal.commandId}`);
        }}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
      />
      <div
        aria-label="Proposal event log"
        role="status"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          font: '12px/1.4 var(--font-mono)',
          minHeight: 36,
          padding: 8,
        }}
      >
        {eventLog}
      </div>
    </div>
  );
}

export const CommandProposalFlow: Story = {
  name: 'Chat / Command proposal allow-deny',
  render: () => <CommandProposalHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Proposal event log');

    await expect(canvas.getByText('Reload workbench')).toBeVisible();
    await expect(canvas.getByText('workbench.action.reloadWindow')).toBeVisible();
    await expect(canvas.getByText('Approval required')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Allow' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Deny' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }));
    await expect(eventLog).toHaveTextContent('Allowed workbench.action.reloadWindow');
    await expect(canvas.getByText('Allowed')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Allow' })).toBeNull();
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const ErrorTransportFlow: Story = {
  render: () => (
    <ChatRuntimeHarness
      response={{
        chunks: ['Runtime should not start'],
        intervalMs: 80,
      }}
      title="Error Transport Chat"
      chatTransportFactory={(runtime) => {
        const baseTransport = createChatTransportFromRuntime({ runtime });

        return {
          ...baseTransport,
          sendMessage: async () => {
            throw new Error('Runtime transport unavailable');
          },
        };
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByPlaceholderText('Ask the mock runtime');

    await userEvent.type(composer, 'Trigger transport failure');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(canvas.getByLabelText('Runtime event log')).toHaveTextContent('Runtime error'),
    );
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
