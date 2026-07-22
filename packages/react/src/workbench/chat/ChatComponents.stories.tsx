import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog, StorySidebarFrame } from '../story/StorySidebarFrame';
import {
  expectPeerChatExampleThread,
  expectVisibleChatBubbleText,
  samplePeerChatIntroMessage,
  samplePeerChatThread,
} from '../story/chatStory';
import { ChatMessageItem, ChatPanel, ChatPhasedRunProgress, type ChatMessage } from './index';

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

/** Host gaps: file-drop overlay (`onFilesDrop`) and message `tone` / `contentMode`. */
export const HostGapsDropAndTone: Story = {
  name: 'Host gaps — drop and tone',
  render: () => <HostGapsDropAndToneHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Plain assistant note (contentMode: plain).')).toBeVisible();
    await expect(canvas.getByText('Warning: review before applying.')).toBeVisible();
    await expect(canvas.getByText('Error: the last command failed.')).toBeVisible();

    const warningMessage = canvas.getByText('Warning: review before applying.').closest('.message');
    const errorMessage = canvas.getByText('Error: the last command failed.').closest('.message');
    expect(warningMessage?.querySelector('.codicon-warning')).not.toBeNull();
    expect(errorMessage?.querySelector('.codicon-error')).not.toBeNull();
    expect(warningMessage?.querySelector('.codicon-sparkle')).toBeNull();
    expect(errorMessage?.querySelector('.codicon-sparkle')).toBeNull();
  },
  tags: ['storybook-play-baseline'],
};

/** Host gaps: `renderComposer` wrap + in-bubble `attachments` on `ChatMessageItem`. */
export const ComposerAndAttachments: Story = {
  name: 'Host gaps — composer and attachments',
  render: () => <ComposerAndAttachmentsHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Host wrap around kit composer')).toBeVisible();
    await expect(canvas.getByPlaceholderText('Message the workspace')).toBeVisible();
    await expect(canvas.getByText('brief.pdf')).toBeVisible();
    await expect(canvas.getByText('notes.txt')).toBeVisible();
    await expect(canvas.getByText('diff.patch')).toBeVisible();

    const briefChip = canvas.getByText('brief.pdf');
    expect(briefChip.closest('.message__attachments')).not.toBeNull();
    expect(briefChip.closest('.message__after')).toBeNull();
  },
  tags: ['storybook-play-baseline'],
};

/** Host gaps: `ChatPhasedRunProgress` overridable chrome labels. */
export const PhasedRunProgressLabels: Story = {
  name: 'Host gaps — phased run labels',
  render: () => (
    <section aria-label="Phased run labels story" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="chat">
        <ChatPhasedRunProgress
          defaultExpanded
          labels={{
            collapse: '접기',
            expand: '펼치기',
            getStatusLabel: (status) => `status:${status}`,
            summaryStatus: (status) => `summary:${status}`,
          }}
          phases={[
            { id: 'plan', label: 'Plan', status: 'completed' },
            { id: 'apply', label: 'Apply', status: 'running' },
          ]}
          title="Pipeline"
        />
      </StorySidebarFrame>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Pipeline')).toBeVisible();
    await expect(canvas.getByText('summary:running')).toBeVisible();
    await expect(canvas.getByText('접기')).toBeVisible();
    await expect(canvas.getByText('status:completed')).toBeVisible();
    await expect(canvas.getByText('status:running')).toBeVisible();
  },
  tags: ['storybook-play-baseline'],
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

const hostGapToneMessages: ChatMessage[] = [
  {
    content: 'Plain assistant note (contentMode: plain).',
    contentMode: 'plain',
    id: 'plain-1',
    source: 'assistant',
  },
  {
    content: 'Warning: review before applying.',
    id: 'warn-1',
    source: 'assistant',
    tone: 'warning',
  },
  {
    content: 'Error: the last command failed.',
    id: 'err-1',
    source: 'assistant',
    tone: 'error',
  },
];

function HostGapsDropAndToneHarness() {
  const [status, setStatus] = useState('Drop files onto the panel to attach.');

  return (
    <section aria-label="Host gaps drop and tone story" className="ui-story-sidebar-surface">
      <StorySidebarFrame variant="chat">
        <ChatPanel
          emptyLabel="Drop files or send a message"
          filesDropLabel="Drop files to attach"
          messages={hostGapToneMessages}
          placeholder="Message the workspace"
          title="Chat"
          value=""
          onFilesDrop={(files) =>
            setStatus(
              `Dropped ${files.length} file(s): ${files.map((file) => file.name).join(', ')}`,
            )
          }
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />
        <StoryEventLog aria-label="Host gaps event log" compact>
          {status}
        </StoryEventLog>
      </StorySidebarFrame>
    </section>
  );
}

function ComposerAndAttachmentsHarness() {
  const [status, setStatus] = useState('Custom composer wraps the kit default.');

  return (
    <section
      aria-label="Host gaps composer and attachments story"
      className="ui-story-sidebar-surface"
    >
      <StorySidebarFrame variant="chat">
        <ChatPanel
          emptyLabel="Hybrid composer demo"
          messages={[]}
          placeholder="Message the workspace"
          renderComposer={(defaultComposer) => (
            <div className="chat-story-composer-wrap">
              <div className="chat-story-composer-hint">Host wrap around kit composer</div>
              {defaultComposer}
            </div>
          )}
          renderMessageList={() => (
            <div className="message-list">
              <ChatMessageItem
                attachments={<span className="file-chip">brief.pdf</span>}
                message={{ content: 'Please review the brief.', id: 'u1', source: 'user' }}
              />
              <ChatMessageItem
                attachments={<span className="file-chip">notes.txt</span>}
                message={{ content: '', id: 'u2', source: 'user' }}
              />
              <ChatMessageItem
                attachments={<span className="file-chip">diff.patch</span>}
                message={{
                  content: 'Attached the patch for review.',
                  id: 'a1',
                  source: 'assistant',
                }}
              />
            </div>
          )}
          title="Chat"
          value=""
          onSubmit={() => setStatus('Submit via kit composer')}
          onValueChange={() => undefined}
        />
        <StoryEventLog aria-label="Composer attachments event log" compact>
          {status}
        </StoryEventLog>
      </StorySidebarFrame>
    </section>
  );
}
