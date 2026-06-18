import { describe, expect, it } from 'vitest';

import { shouldShowPeerChatSenderLabel } from './chatMessageGrouping';
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
