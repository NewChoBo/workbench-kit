import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMessageItem } from './ChatMessageItem';
import type { ChatMessage } from './types';

describe('ChatMessageItem', () => {
  it('renders peer user message text in the bubble', () => {
    const message: ChatMessage = {
      content: 'Hello team',
      id: 'user-1',
      source: 'user',
    };

    const markup = renderToStaticMarkup(
      <ChatMessageItem layout="peer" message={message} userLabel="Jay" />,
    );

    expect(markup).toContain('Hello team');
    expect(markup).toContain('message--user-peer');
    expect(markup).toContain('message__bubble');
    expect(markup).not.toContain('message__bubble-body--collapsed');
  });

  it('renders continued peer user messages without a sender label', () => {
    const messages: ChatMessage[] = [
      {
        content: 'First message',
        id: 'user-1',
        source: 'user',
      },
      {
        content: 'Second message',
        id: 'user-2',
        source: 'user',
      },
    ];

    const markup = renderToStaticMarkup(
      <>
        <ChatMessageItem
          layout="peer"
          message={messages[1]!}
          showSenderLabel={false}
          userLabel="Jay"
        />
      </>,
    );

    expect(markup).toContain('Second message');
    expect(markup).toContain('message--continued');
    expect(markup).not.toContain('message__user-label');
  });

  it('places inline timestamps beside peer bubbles', () => {
    const message: ChatMessage = {
      content: 'On my way',
      createdAt: '2026-06-18T14:30:10.000Z',
      id: 'user-1',
      source: 'user',
    };

    const userMarkup = renderToStaticMarkup(
      <ChatMessageItem layout="peer" message={message} showTimestamp userLabel="Jay" />,
    );
    expect(userMarkup).toContain('message__bubble-line--end');
    expect(userMarkup).toContain('message__time--pinned');
    expect(userMarkup).toContain('<time');

    const peerMarkup = renderToStaticMarkup(
      <ChatMessageItem
        assistantLabel="Alex"
        layout="peer"
        message={{
          content: 'Thanks!',
          createdAt: '2026-06-18T14:31:00.000Z',
          id: 'peer-1',
          label: 'Alex',
          source: 'assistant',
        }}
        showTimestamp
      />,
    );
    expect(peerMarkup).toContain('message__bubble-line--start');
    expect(peerMarkup).toContain('message__time--pinned');
  });
});
