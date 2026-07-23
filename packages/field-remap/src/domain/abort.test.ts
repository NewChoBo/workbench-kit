import { describe, expect, it } from 'vitest';

import { createAbortError, isAbortError, throwIfAborted } from './abort.js';

describe('abort helpers', () => {
  it('detects AbortError instances', () => {
    expect(isAbortError(createAbortError())).toBe(true);
    expect(isAbortError(new Error('nope'))).toBe(false);
  });

  it('throwIfAborted is a no-op until aborted', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow();
  });
});
