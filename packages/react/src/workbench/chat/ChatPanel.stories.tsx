import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createChatTransportFromRuntime } from '@workbench-kit/adapters';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ChatRuntimeHarness } from '../story/ChatRuntimeHarness';
import { StoryEventLog, StorySidebarFrame } from '../story/StorySidebarFrame';
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

const timestampDemoMessages: ChatMessage[] = [
  {
    content: 'Can you summarize the release notes?',
    createdAt: '2026-06-18T14:30:10.000Z',
    id: 'timestamp-user-1',
    source: 'user',
  },
  {
    content: 'Also include the migration checklist.',
    createdAt: '2026-06-18T14:30:45.000Z',
    id: 'timestamp-user-2',
    source: 'user',
  },
  {
    content: 'Here is a short summary of the release notes and migration checklist.',
    createdAt: '2026-06-18T14:31:05.000Z',
    id: 'timestamp-assistant-1',
    source: 'assistant',
  },
  {
    content: 'Let me know if you want the full diff.',
    createdAt: '2026-06-18T14:31:40.000Z',
    id: 'timestamp-assistant-2',
    source: 'assistant',
  },
];

export const MessageTimestampHover: Story = {
  name: 'Chat / Message timestamp hover',
  render: () => (
    <StorySidebarFrame variant="chatCompact">
      <ChatPanel
        assistantLabel="Assistant"
        messages={timestampDemoMessages}
        placeholder="Type a message"
        title="Timestamp hover"
        value=""
        onSubmit={() => undefined}
        onValueChange={() => undefined}
      />
    </StorySidebarFrame>
  ),
};

export const MessageListOverflowScroll: Story = {
  name: 'Chat / Message List Overflow',
  render: () => (
    <StorySidebarFrame variant="overflow">
      <ChatPanel
        assistantLabel="Assistant"
        messages={createOverflowMessages(48)}
        placeholder="Type a message"
        title="Overflow Chat"
        value=""
        onSubmit={() => undefined}
        onValueChange={() => undefined}
      />
    </StorySidebarFrame>
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
    <StorySidebarFrame variant="chatCompact">
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
      <StoryEventLog aria-label="Proposal event log" compact>
        {eventLog}
      </StoryEventLog>
    </StorySidebarFrame>
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
