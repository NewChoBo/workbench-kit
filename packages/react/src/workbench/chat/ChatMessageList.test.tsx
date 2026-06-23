import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMessageList } from './ChatMessageList';
import type { ChatMessage } from './types';

describe('ChatMessageList', () => {
  it('renders date dividers when the calendar day changes', () => {
    const messages: ChatMessage[] = [
      {
        content: 'Earlier day',
        createdAt: new Date(2026, 5, 17, 10, 0, 0).toISOString(),
        id: 'day-one',
        source: 'user',
      },
      {
        content: 'Next day',
        createdAt: new Date(2026, 5, 18, 9, 0, 0).toISOString(),
        id: 'day-two',
        label: 'Alex',
        source: 'assistant',
      },
    ];

    const markup = renderToStaticMarkup(
      <ChatMessageList messageLayout="peer" messages={messages} userLabel="Jay" />,
    );

    expect(markup.match(/class="message-date-divider"/g)?.length).toBe(2);
    expect(markup).toContain('Earlier day');
    expect(markup).toContain('Next day');
  });
});
