import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatConversationBar } from './ChatConversationBar';
import type { WorkbenchChatConversation } from './chatConversation';

const seedConversations: WorkbenchChatConversation[] = [
  {
    id: 'chat-1',
    metaSummary: '3 messages · updated today',
    metaTooltip: (
      <div>
        <div className="chat-conversation-bar__meta-title">Planning</div>
        <dl className="chat-conversation-bar__meta-list">
          <div className="chat-conversation-bar__meta-row">
            <dt>Messages</dt>
            <dd>3</dd>
          </div>
        </dl>
      </div>
    ),
    title: 'Planning',
  },
  {
    id: 'chat-2',
    metaSummary: '1 message · updated yesterday',
    title: 'Follow-up',
  },
];

function ConversationBarDemo() {
  const [conversations, setConversations] = useState(seedConversations);
  const [activeConversationId, setActiveConversationId] = useState('chat-1');

  return (
    <div style={{ padding: 16, width: 360 }}>
      <ChatConversationBar
        activeConversationId={activeConversationId}
        conversations={conversations}
        moreMenuItems={[
          {
            icon: 'codicon-clear-all',
            label: 'Reset chat',
            onSelect: () => undefined,
          },
        ]}
        secondaryPill={
          <button
            className="chat-conversation-bar__pill chat-conversation-bar__pill--session"
            type="button"
          >
            <i aria-hidden="true" className="codicon codicon-folder" />
            <span className="chat-conversation-bar__pill-label">session-01</span>
          </button>
        }
        onActivate={setActiveConversationId}
        onCreate={() => {
          const nextId = `chat-${conversations.length + 1}`;
          setConversations((current) => [
            { id: nextId, metaSummary: '0 messages', title: `Chat ${current.length + 1}` },
            ...current,
          ]);
          setActiveConversationId(nextId);
        }}
        onDelete={(conversationId) => {
          setConversations((current) => {
            const next = current.filter((conversation) => conversation.id !== conversationId);
            if (activeConversationId === conversationId) {
              setActiveConversationId(next[0]?.id ?? '');
            }
            return next;
          });
        }}
        onRename={(conversationId, title) => {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId ? { ...conversation, title } : conversation,
            ),
          );
        }}
      />
    </div>
  );
}

const meta = {
  title: 'React/Workbench/Chat/ChatConversationBar',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ConversationBarDemo />,
};
