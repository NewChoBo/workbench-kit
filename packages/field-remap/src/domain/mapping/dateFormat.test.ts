import { describe, expect, it } from 'vitest';
import { reformatDateString, splitDateTimeString } from './dateFormat.js';

describe('dateFormat', () => {
  it('reformats YYYYMMDD to YYYY.MM.DD', () => {
    expect(reformatDateString('20260720', 'YYYYMMDD', 'YYYY.MM.DD')).toBe('2026.07.20');
  });

  it('reformats YYYY-MM-DD to YYYYMMDD', () => {
    expect(reformatDateString('2026-07-20', 'YYYY-MM-DD', 'YYYYMMDD')).toBe('20260720');
  });

  it('splits datetime strings', () => {
    expect(splitDateTimeString('2026-07-20T14:30:00')).toEqual({
      date: '2026-07-20',
      time: '14:30:00',
    });
    expect(splitDateTimeString('2026-07-20 14:30:00')).toEqual({
      date: '2026-07-20',
      time: '14:30:00',
    });
  });
});
