import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMessageCollapsible } from './ChatMessageCollapsible';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatMessageList } from './ChatMessageList';
import {
  ChatMessageDateDivider,
  formatChatMessageDateLabel,
  formatChatMessageTime,
  getChatMessageCalendarDayKey,
  getChatMessageTimeMinuteKey,
  normalizeChatMessageTimestamp,
  shouldShowChatMessageDateDivider,
  shouldShowChatMessageTimestamp,
  shouldShowPeerChatSenderLabel,
} from './chatMessageMeta';
import type { ChatMessage } from './types';

describe('formatChatMessageDateLabel', () => {
  const now = new Date(2026, 5, 18, 12, 0, 0);

  it('labels the current calendar day as Today', () => {
    expect(formatChatMessageDateLabel(new Date(2026, 5, 18, 8, 0, 0), now)).toBe('Today');
  });

  it('labels the previous calendar day as Yesterday', () => {
    expect(formatChatMessageDateLabel(new Date(2026, 5, 17, 20, 0, 0), now)).toBe('Yesterday');
  });

  it('labels older dates in the same year without the year', () => {
    expect(formatChatMessageDateLabel(new Date(2026, 5, 10, 12, 0, 0), now)).toBe('June 10');
  });

  it('includes the year for messages from another year', () => {
    expect(formatChatMessageDateLabel(new Date(2025, 11, 31, 12, 0, 0), now)).toBe(
      'December 31, 2025',
    );
  });
});

describe('getChatMessageCalendarDayKey', () => {
  it('groups timestamps by local calendar day', () => {
    expect(getChatMessageCalendarDayKey(new Date(2026, 5, 18, 1, 0, 0))).toBe('2026-06-18');
    expect(getChatMessageCalendarDayKey('invalid')).toBe('');
  });
});

describe('formatChatMessageTime', () => {
  it('formats ISO timestamps in English clock time', () => {
    expect(formatChatMessageTime('2026-06-18T14:30:00.000Z')).toMatch(/PM|AM/);
  });

  it('formats Date and epoch values', () => {
    const date = new Date('2026-06-18T14:30:00.000Z');
    expect(formatChatMessageTime(date)).toMatch(/PM|AM/);
    expect(formatChatMessageTime(date.getTime())).toMatch(/PM|AM/);
  });

  it('returns an empty string for invalid timestamps', () => {
    expect(formatChatMessageTime('invalid')).toBe('');
    expect(normalizeChatMessageTimestamp('invalid')).toBeUndefined();
  });
});

describe('getChatMessageTimeMinuteKey', () => {
  it('groups timestamps that share the same displayed minute', () => {
    const keyA = getChatMessageTimeMinuteKey('2026-06-18T14:30:10.000Z');
    const keyB = getChatMessageTimeMinuteKey('2026-06-18T14:30:55.000Z');
    const keyC = getChatMessageTimeMinuteKey('2026-06-18T14:31:00.000Z');

    expect(keyA).toBe(keyB);
    expect(keyA).not.toBe(keyC);
  });
});

const peerMessages: ChatMessage[] = [
  { id: '1', source: 'assistant', label: 'Alex', content: 'Hello' },
  { id: '2', source: 'assistant', label: 'Alex', content: 'Still Alex' },
  { id: '3', source: 'user', content: 'Reply' },
  { id: '4', source: 'user', content: 'Another reply' },
  { id: '5', source: 'assistant', label: 'Alex', content: 'Back again' },
];

describe('shouldShowPeerChatSenderLabel', () => {
  it('shows the label only when the sender changes', () => {
    const options = { assistantLabel: 'Alex', userLabel: 'Jay' };

    expect(shouldShowPeerChatSenderLabel(peerMessages, 0, options)).toBe(true);
    expect(shouldShowPeerChatSenderLabel(peerMessages, 1, options)).toBe(false);
    expect(shouldShowPeerChatSenderLabel(peerMessages, 2, options)).toBe(true);
    expect(shouldShowPeerChatSenderLabel(peerMessages, 3, options)).toBe(false);
    expect(shouldShowPeerChatSenderLabel(peerMessages, 4, options)).toBe(true);
  });
});

describe('shouldShowChatMessageTimestamp', () => {
  it('shows the timestamp only on the last message in a same-minute run', () => {
    const timestampedMessages: ChatMessage[] = [
      { id: '1', source: 'user', content: 'First', createdAt: '2026-06-18T14:30:10.000Z' },
      { id: '2', source: 'user', content: 'Second', createdAt: '2026-06-18T14:30:45.000Z' },
      { id: '3', source: 'assistant', content: 'Reply', createdAt: '2026-06-18T14:31:00.000Z' },
      { id: '4', source: 'assistant', content: 'More', createdAt: '2026-06-18T14:31:20.000Z' },
      { id: '5', source: 'assistant', content: 'Done', createdAt: '2026-06-18T14:31:50.000Z' },
    ];

    expect(shouldShowChatMessageTimestamp(timestampedMessages, 0)).toBe(false);
    expect(shouldShowChatMessageTimestamp(timestampedMessages, 1)).toBe(true);
    expect(shouldShowChatMessageTimestamp(timestampedMessages, 2)).toBe(false);
    expect(shouldShowChatMessageTimestamp(timestampedMessages, 3)).toBe(false);
    expect(shouldShowChatMessageTimestamp(timestampedMessages, 4)).toBe(true);
  });

  it('prefers timestamp over createdAt and hides invalid values', () => {
    const timestampedMessages: ChatMessage[] = [
      { id: '1', source: 'user', content: 'No time' },
      {
        id: '2',
        source: 'user',
        content: 'Valid',
        createdAt: 'invalid',
        timestamp: '2026-06-18T14:30:00.000Z',
      },
    ];

    expect(shouldShowChatMessageTimestamp(timestampedMessages, 0)).toBe(false);
    expect(shouldShowChatMessageTimestamp(timestampedMessages, 1)).toBe(true);
  });
});

describe('shouldShowChatMessageDateDivider', () => {
  it('shows a divider for the first timestamped message and when the day changes', () => {
    const timestampedMessages: ChatMessage[] = [
      {
        id: '1',
        source: 'user',
        content: 'Earlier',
        createdAt: new Date(2026, 5, 17, 10, 0, 0).toISOString(),
      },
      {
        id: '2',
        source: 'assistant',
        content: 'Next day',
        createdAt: new Date(2026, 5, 18, 9, 0, 0).toISOString(),
      },
      {
        id: '3',
        source: 'user',
        content: 'Same day',
        createdAt: new Date(2026, 5, 18, 10, 0, 0).toISOString(),
      },
      { id: '4', source: 'user', content: 'No time' },
    ];

    expect(shouldShowChatMessageDateDivider(timestampedMessages, 0)).toBe(true);
    expect(shouldShowChatMessageDateDivider(timestampedMessages, 1)).toBe(true);
    expect(shouldShowChatMessageDateDivider(timestampedMessages, 2)).toBe(false);
    expect(shouldShowChatMessageDateDivider(timestampedMessages, 3)).toBe(false);
  });

  it('skips untimestamped messages when comparing day boundaries', () => {
    const timestampedMessages: ChatMessage[] = [
      {
        id: '1',
        source: 'user',
        content: 'Day one',
        createdAt: new Date(2026, 5, 17, 10, 0, 0).toISOString(),
      },
      { id: '2', source: 'user', content: 'No time between days' },
      {
        id: '3',
        source: 'assistant',
        content: 'Day two',
        createdAt: new Date(2026, 5, 18, 9, 0, 0).toISOString(),
      },
    ];

    expect(shouldShowChatMessageDateDivider(timestampedMessages, 2)).toBe(true);
  });
});

describe('ChatMessageCollapsible', () => {
  it('renders message text in the bubble body', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCollapsible content="Hello team" surfaceClassName="message__bubble">
        Hello team
      </ChatMessageCollapsible>,
    );

    expect(markup).toContain('Hello team');
    expect(markup).toContain('message__bubble-body');
    expect(markup).not.toContain('message__bubble-body--collapsed');
  });
});

describe('ChatMessageDateDivider', () => {
  it('renders a labeled separator for valid timestamps', () => {
    const markup = renderToStaticMarkup(
      <ChatMessageDateDivider timestamp="2026-06-18T14:30:00.000Z" />,
    );

    expect(markup).toContain('message-date-divider');
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('<time');
  });
});

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
