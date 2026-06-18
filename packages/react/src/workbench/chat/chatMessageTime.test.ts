import { describe, expect, it } from 'vitest';

import { formatChatMessageTime } from './chatMessageTime';

describe('formatChatMessageTime', () => {
  it('formats ISO timestamps in English clock time', () => {
    expect(formatChatMessageTime('2026-06-18T14:30:00.000Z')).toMatch(/PM|AM/);
  });

  it('returns an empty string for invalid timestamps', () => {
    expect(formatChatMessageTime('invalid')).toBe('');
  });
});
