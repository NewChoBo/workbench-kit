import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StoryEventLog, StorySidebarFrame } from '../story/StorySidebarFrame';
import { ChatPanel, type ChatMessage } from './index';

const initialMessages: ChatMessage[] = [
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
  render: () => <ChatComponentsHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const RuntimeControls: Story = {
  name: 'Runtime controls',
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
    await expect(await canvas.findByText('Run this after review')).toBeVisible();
    await expect(composer).toHaveValue('');
  },
  tags: ['storybook-play-required'],
};

function ChatComponentsHarness() {
  const [messages, setMessages] = useState(initialMessages);
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
