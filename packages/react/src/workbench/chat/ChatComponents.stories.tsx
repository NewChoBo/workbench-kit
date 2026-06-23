import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog, StorySidebarFrame } from '../story/StorySidebarFrame';
import { expectPeerChatExampleThread, expectVisibleChatBubbleText } from './chatStoryAssertions';
import { samplePeerChatIntroMessage, samplePeerChatThread } from './chatStoryFixtures';
import { ChatPanel, type ChatMessage } from './index';

const initialAssistantMessages: ChatMessage[] = [
  {
    id: 'assistant-1',
    source: 'assistant',
    content: 'Review formatter command before applying it to the workspace.',
    commandProposals: [
      {
        id: 'proposal-format',
        commandId: 'workspace.formatChangedFiles',
        description: 'Format changed files in the current workspace.',
        label: 'Format changed files',
        policy: 'approval-required',
        status: 'pending',
      },
    ],
  },
];

const meta = {
  title: 'React/Workbench/Chat Components',
  parameters: {
    layout: 'fullscreen',
    storybookGrid: { enabled: false },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SamplePeerChatExample: Story = {
  name: 'Sample peer chat example',
  render: () => <SamplePeerChatExampleHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectPeerChatExampleThread(canvas, canvasElement);
    expect(canvas.getAllByText('Jay', { selector: '.message__user-label' })).toHaveLength(2);
    expect(canvas.getByText('Alex')).toBeVisible();
  },
  tags: ['storybook-play-required'],
};

export const PeerChatInteraction: Story = {
  name: 'Peer chat interaction',
  render: () => <PeerChatHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expectVisibleChatBubbleText(canvas, 'Share updates here while working in the workspace.');

    const composer = canvas.getByPlaceholderText('Message your team');
    await userEvent.type(composer, 'Team update from Jay');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Team update from Jay');
    await expect(composer).toHaveValue('');

    await userEvent.type(composer, 'Follow-up note');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Follow-up note');
    expect(canvas.getAllByText('Jay')).toHaveLength(1);
  },
  tags: ['storybook-play-required'],
};

export const RuntimeControls: Story = {
  name: 'Runtime controls',
  render: () => <AssistantChatHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Format changed files')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }));
    await expect(
      canvas.getByRole('status', { name: 'Chat component event log' }),
    ).toHaveTextContent('Allowed workspace.formatChangedFiles');

    const composer = canvas.getByPlaceholderText('Message the workspace');
    await userEvent.type(composer, 'Run this after review');
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }));
    await expectVisibleChatBubbleText(canvas, 'Run this after review');
    await expect(composer).toHaveValue('');
  },
  tags: ['storybook-play-required'],
};

function SamplePeerChatExampleHarness() {
  return (
    <section aria-label="Sample peer chat example" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="chat">
        <ChatPanel
          assistantLabel="Alex"
          emptyLabel="Start a conversation with your team."
          messageLayout="peer"
          messages={samplePeerChatThread}
          placeholder="Message your team"
          title="Chat"
          userLabel="Jay"
          value=""
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />
      </StorySidebarFrame>
    </section>
  );
}

function PeerChatHarness() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [samplePeerChatIntroMessage]);
  const [value, setValue] = useState('');

  return (
    <section aria-label="Peer chat story surface" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="chat">
        <ChatPanel
          assistantLabel="Alex"
          emptyLabel="Start a conversation with your team."
          messageLayout="peer"
          messages={messages}
          placeholder="Message your team"
          title="Chat"
          userLabel="Jay"
          value={value}
          onSubmit={(message) => {
            setMessages((current) => [
              ...current,
              {
                content: message,
                createdAt: new Date().toISOString(),
                id: `user-${current.length}`,
                source: 'user',
              },
            ]);
            setValue('');
          }}
          onValueChange={setValue}
        />
      </StorySidebarFrame>
    </section>
  );
}

function AssistantChatHarness() {
  const [messages, setMessages] = useState(initialAssistantMessages);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('Ready');

  return (
    <section aria-label="Chat component story surface" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="chat">
        <ChatPanel
          commandLabel="Show commands"
          emptyLabel="No messages"
          messages={messages}
          placeholder="Message the workspace"
          showTools
          title="Chat"
          value={value}
          onCommandClick={() => setStatus('Command menu requested')}
          onCommandProposalAllow={(_messageId, proposal) =>
            setStatus(`Allowed ${proposal.commandId}`)
          }
          onCommandProposalDeny={(_messageId, proposal) =>
            setStatus(`Denied ${proposal.commandId}`)
          }
          onSubmit={(message) => {
            setMessages((current) => [
              ...current,
              {
                id: `user-${current.length}`,
                source: 'user',
                content: message,
              },
            ]);
            setValue('');
            setStatus(`Sent ${message}`);
          }}
          onValueChange={setValue}
        />

        <StoryEventLog aria-label="Chat component event log" compact>
          {status}
        </StoryEventLog>
      </StorySidebarFrame>
    </section>
  );
}
