import { describe, expect, it } from 'vitest';

import {
  formatChatMessageDateLabel,
  formatChatMessageTime,
  getChatMessageCalendarDayKey,
  getChatMessageTimeMinuteKey,
  normalizeChatMessageTimestamp,
} from './chatMessageTime';

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
