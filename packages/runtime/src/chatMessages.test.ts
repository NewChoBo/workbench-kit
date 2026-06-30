import { describe, expect, it } from 'vitest';

import {
  deriveRuntimeChatMessages,
  reduceRuntimeChatMessages,
  upsertRuntimeChatMessage,
} from './chatMessages';
import type { RuntimeChatMessage, WorkbenchRuntimeEvent } from './types';

const assistantMessage: RuntimeChatMessage = {
  content: 'first',
  id: 'assistant-1',
  source: 'assistant',
};

describe('runtime chat message helpers', () => {
  it('replaces an existing message with the same id instead of appending a duplicate', () => {
    expect(
      upsertRuntimeChatMessage(
        [
          {
            content: 'pending',
            id: 'assistant-1',
            source: 'assistant',
          },
        ],
        {
          content: 'complete',
          id: 'assistant-1',
          source: 'assistant',
        },
      ),
    ).toEqual([
      {
        content: 'complete',
        id: 'assistant-1',
        source: 'assistant',
      },
    ]);
  });

  it('reduces message and delta events into a compact chat transcript', () => {
    const events: WorkbenchRuntimeEvent[] = [
      { message: assistantMessage, type: 'message' },
      {
        delta: ' second',
        message: {
          ...assistantMessage,
          content: 'first second',
        },
        type: 'message-delta',
      },
      {
        previousStatus: 'running',
        status: 'idle',
        type: 'status',
      },
    ];

    expect(deriveRuntimeChatMessages(events)).toEqual([
      {
        content: 'first second',
        id: 'assistant-1',
        source: 'assistant',
      },
    ]);
  });

  it('ignores non-message events when reducing a message list', () => {
    expect(
      reduceRuntimeChatMessages([assistantMessage], {
        previousStatus: 'idle',
        status: 'running',
        type: 'status',
      }),
    ).toEqual([assistantMessage]);
  });
});
