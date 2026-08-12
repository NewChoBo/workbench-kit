import { describe, expect, it } from 'vitest';
import { sanitizeOptionRecord } from './transformOptions.js';

describe('transformOptions helpers', () => {
  it('sanitizes option records', () => {
    expect(sanitizeOptionRecord({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(sanitizeOptionRecord({})).toBeUndefined();
  });
});
