import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatHistoryMenu } from './ChatHistoryMenu';

describe('ChatHistoryMenu', () => {
  it('renders conversation rows and new chat action', () => {
    const markup = renderToStaticMarkup(
      <ChatHistoryMenu
        activeConversationId="chat-1"
        conversations={[
          { id: 'chat-1', metaSummary: '3 messages', title: 'Planning' },
          { id: 'chat-2', metaSummary: '1 message', title: 'Follow-up' },
        ]}
        x={120}
        y={80}
        onActivate={() => undefined}
        onClose={() => undefined}
        onCreate={() => undefined}
        onDelete={() => undefined}
        onRename={() => undefined}
      />,
    );

    expect(markup).toContain('chat-history-menu');
    expect(markup).toContain('New chat');
    expect(markup).toContain('Planning');
    expect(markup).toContain('3 messages');
    expect(markup).toContain('codicon-check');
  });
});
