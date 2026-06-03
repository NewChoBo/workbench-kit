import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import {
  createMockWorkbenchRuntime,
  type MockRuntimeResponsePlan,
  type RuntimeStatus,
} from '@newchobo-ui/runtime';
import { createChatTransportFromRuntime } from '@newchobo-ui/adapters';
import { WorkbenchChatService } from '@newchobo-ui/services';
import type { ChatStreamEvent, WorkspacePatchEvent } from '@newchobo-ui/contracts';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from './types';

const meta = {
  title: 'React/Workbench/ChatPanel',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface ChatRuntimeHarnessProps {
  response: MockRuntimeResponsePlan;
  title?: string;
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

function ChatRuntimeHarness({ response, title = 'Runtime Chat' }: ChatRuntimeHarnessProps) {
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
      id: message.id,
      label: message.label,
      source: message.source,
    })),
  );
  const [status, setStatus] = useState<RuntimeStatus>(() => runtime.getStatus());
  const [workspacePatchLog, setWorkspacePatchLog] = useState<string[]>([]);
  const chatRuntimeTransport = useMemo(
    () => createChatTransportFromRuntime({ runtime }),
    [runtime],
  );
  const chatService = useMemo(
    () =>
      new WorkbenchChatService({
        onPatch: (patch) => {
          setWorkspacePatchLog((currentLog) => [...currentLog, workspacePatchLabel(patch)]);
        },
        transport: chatRuntimeTransport,
      }),
    [chatRuntimeTransport],
  );

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
      chatService.dispose();
      runtime.dispose();
    };
  }, [chatService, runtime]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: 520, width: 360 }}>
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
        onSubmit={(message) => {
          setDraft('');
          chatService.sendMessage(message);
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
  tags: ['storybook-play-baseline'],
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
