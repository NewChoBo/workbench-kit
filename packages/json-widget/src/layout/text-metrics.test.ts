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

const mode = 'unicode-pre-line-v1' as const;
const estimate = (text: string, maxWidth = 1_000, fontWeight: 400 | 700 = 400) =>
  estimateWrappedTextSize({ text, maxWidth, fontSize: 10, textMetricsMode: mode, fontWeight });

describe('estimateWrappedTextSize opt-in Unicode pre-line metrics', () => {
  it('normalizes CRLF and CR while preserving empty and trailing explicit lines', () => {
    expect(estimate('a\r\nb\r\n\r')).toEqual({
      width: 5.6000000000000005,
      height: 54,
      lineCount: 4,
    });
    expect(estimate('\n\n')).toEqual({ width: 0, height: 40.5, lineCount: 3 });
    expect(estimate('')).toEqual({ width: 0, height: 13.5, lineCount: 1 });
  });

  it('measures Unicode code points rather than UTF-16 units', () => {
    const result = estimate('😀😀a');
    expect(result.width).toBeCloseTo(16.8);
    expect(result.lineCount).toBe(1);
    expect(estimate('😀😀😀', 12).lineCount).toBe(2);
    expect(estimate('😀😀😀', 12).height).toBe(27);
  });

  it('wraps on whitespace and soft-wraps long tokens under narrow constraints', () => {
    expect(estimate('alpha beta', 30).lineCount).toBe(2);
    expect(estimate('abcdefgh', 12).lineCount).toBe(4);
    expect(estimate('😀x', 1)).toEqual({ width: 1, height: 27, lineCount: 2 });
    expect(estimate('a\nb\n', 0)).toEqual({ width: 0, height: 40.5, lineCount: 3 });
    expect(estimate('one  two', Number.POSITIVE_INFINITY).width).toBeCloseTo(44.8);
  });

  it('uses matching weight and fixed line-height factors only in the new mode', () => {
    expect(estimate('abcd', 23, 400).lineCount).toBe(1);
    expect(estimate('abcd', 23, 700).lineCount).toBe(2);
    expect(estimate('abc', 1_000, 700).width).toBe(18);
    expect(
      estimateWrappedTextSize({
        text: 'abc',
        fontSize: 10,
        maxWidth: 1_000,
        textMetricsMode: mode,
        fontWeight: 700,
        averageCharWidthFactor: 3,
        lineHeightFactor: 4,
      }),
    ).toEqual({ width: 18, height: 13.5, lineCount: 1 });
  });

  it('honors maxLines without losing the final explicit line when uncapped', () => {
    expect(
      estimateWrappedTextSize({
        text: '😀😀😀\nlast\n',
        fontSize: 10,
        maxWidth: 12,
        textMetricsMode: mode,
        maxLines: 2,
      }),
    ).toEqual({ width: 11.200000000000001, height: 27, lineCount: 2 });
    expect(estimate('last\n', 1_000).lineCount).toBe(2);
  });

  it('keeps legacy UTF-16, whitespace, weight and zero-width results unchanged', () => {
    const legacy = { text: '😀\nx', fontSize: 10, maxWidth: 1_000 };
    expect(estimateWrappedTextSize(legacy)).toEqual({
      width: 22.400000000000002,
      height: 13.5,
      lineCount: 1,
    });
    expect(estimateWrappedTextSize({ ...legacy, fontWeight: 700 })).toEqual(
      estimateWrappedTextSize(legacy),
    );
    expect(estimateWrappedTextSize({ ...legacy, maxWidth: 0 })).toEqual({
      width: 0,
      height: 13.5,
      lineCount: 1,
    });
    expect(
      estimateWrappedTextSize({
        text: 'abcd',
        fontSize: 10,
        maxWidth: 100,
        averageCharWidthFactor: 1,
        lineHeightFactor: 2,
      }),
    ).toEqual({ width: 40, height: 20, lineCount: 1 });
  });
});
