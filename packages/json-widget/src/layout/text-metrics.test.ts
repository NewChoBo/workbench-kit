import { describe, expect, it } from 'vitest';

import { estimateWrappedTextSize } from './text-metrics.js';

describe('estimateWrappedTextSize', () => {
  it('keeps short text on one line within maxWidth', () => {
    const size = estimateWrappedTextSize({
      text: 'Hi',
      fontSize: 10,
      maxWidth: 200,
    });

    expect(size.lineCount).toBe(1);
    expect(size.width).toBeLessThanOrEqual(200);
    expect(size.height).toBeCloseTo(10 * 1.35, 5);
  });

  it('wraps long text when constrained', () => {
    const size = estimateWrappedTextSize({
      text: 'alpha beta gamma delta epsilon zeta',
      fontSize: 10,
      maxWidth: 40,
    });

    expect(size.lineCount).toBeGreaterThan(1);
    expect(size.width).toBeLessThanOrEqual(40);
    expect(size.height).toBeGreaterThan(10 * 1.35);
  });

  it('respects maxLines', () => {
    const size = estimateWrappedTextSize({
      text: 'one two three four five six seven eight',
      fontSize: 10,
      maxWidth: 30,
      maxLines: 2,
    });

    expect(size.lineCount).toBe(2);
    expect(size.height).toBeCloseTo(2 * 10 * 1.35, 5);
  });

  it('matches single-line estimate when maxWidth is huge (no-metrics parity path)', () => {
    const text = 'Measured';
    const fontSize = 14;
    const wrapped = estimateWrappedTextSize({
      text,
      fontSize,
      maxWidth: 10_000,
    });
    const singleLineWidth = text.length * fontSize * 0.56;

    expect(wrapped.lineCount).toBe(1);
    expect(wrapped.width).toBeCloseTo(singleLineWidth, 5);
  });
});
