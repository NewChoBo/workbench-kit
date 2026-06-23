import { describe, expect, it } from 'vitest';

import {
  shouldShowChatMessageDateDivider,
  shouldShowChatMessageTimestamp,
  shouldShowPeerChatSenderLabel,
} from './chatMessageGrouping';
import type { ChatMessage } from './types';

const messages: ChatMessage[] = [
  { id: '1', source: 'assistant', label: 'Alex', content: 'Hello' },
  { id: '2', source: 'assistant', label: 'Alex', content: 'Still Alex' },
  { id: '3', source: 'user', content: 'Reply' },
  { id: '4', source: 'user', content: 'Another reply' },
  { id: '5', source: 'assistant', label: 'Alex', content: 'Back again' },
];

describe('shouldShowPeerChatSenderLabel', () => {
  it('shows the label only when the sender changes', () => {
    const options = { assistantLabel: 'Alex', userLabel: 'Jay' };

    expect(shouldShowPeerChatSenderLabel(messages, 0, options)).toBe(true);
    expect(shouldShowPeerChatSenderLabel(messages, 1, options)).toBe(false);
    expect(shouldShowPeerChatSenderLabel(messages, 2, options)).toBe(true);
    expect(shouldShowPeerChatSenderLabel(messages, 3, options)).toBe(false);
    expect(shouldShowPeerChatSenderLabel(messages, 4, options)).toBe(true);
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
