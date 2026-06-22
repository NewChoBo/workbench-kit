import { describe, expect, it } from 'vitest';

import {
  formatChatMessageTime,
  getChatMessageTimeMinuteKey,
  normalizeChatMessageTimestamp,
} from './chatMessageTime';

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
