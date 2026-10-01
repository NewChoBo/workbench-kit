import { describe, expect, it } from 'vitest';
import { createValueTransformRegistry } from '@workbench-kit/field-remap';

import {
  JSONATA_TRANSFORM_ID,
  JsonataTransformTimeoutError,
  createJsonataValueTransform,
  jsonataValueTransform,
  raceJsonataEvaluation,
} from './jsonata-transform.js';

const applyDefaultTransform = jsonataValueTransform.apply;

describe('jsonataValueTransform', () => {
  it.each([0, -1, NaN, Infinity, -Infinity, null])(
    'rejects invalid factory bounds: %s',
    (invalid) => {
      expect(() => createJsonataValueTransform({ timeoutMs: invalid as number })).toThrow(
        /timeoutMs.*finite/i,
      );
      expect(() => createJsonataValueTransform({ maxExpressionLength: invalid as number })).toThrow(
        /maxExpressionLength.*finite/i,
      );
    },
  );

  it('rejects a timeout that would overflow the runtime timer', () => {
    expect(() => createJsonataValueTransform({ timeoutMs: 2_147_483_648 })).toThrow(RangeError);
  });

  it('retains omitted defaults and positive fractional option values', () => {
    expect(() =>
      createJsonataValueTransform({ timeoutMs: undefined, maxExpressionLength: undefined }),
    ).not.toThrow();
    expect(() =>
      createJsonataValueTransform({ timeoutMs: 20.5, maxExpressionLength: 16.5 }),
    ).not.toThrow();
  });

  it('evaluates expressions against the source value', async () => {
    const registry = createValueTransformRegistry([jsonataValueTransform]);
    const result = await registry.apply(
      JSONATA_TRANSFORM_ID,
      { tags: [{ name: 'math' }, { name: 'computing' }] },
      { options: { expression: 'tags.name' } },
    );
    // JSONata may return a sequence array; normalize for assertion.
    expect(Array.from(result as string[])).toEqual(['math', 'computing']);
  });

  it('rejects overlong expressions by default (fail closed)', async () => {
    const transform = createJsonataValueTransform({ maxExpressionLength: 8 });
    await expect(
      transform.apply({ ok: true }, { options: { expression: '$exists(ok)' } }),
    ).rejects.toThrow(/max length/i);
  });

  it('keeps empty expressions as a source-value passthrough', async () => {
    const source = { value: 7 };
    const controller = new AbortController();
    controller.abort();
    await expect(
      jsonataValueTransform.apply(source, {
        options: { expression: '   ' },
        signal: controller.signal,
      }),
    ).resolves.toBe(source);
  });

  it('supports finite recursion under the native timeout', async () => {
    await expect(
      applyDefaultTransform(null, {
        options: {
          expression: '($sum := function($n) { $n = 0 ? 0 : $n + $sum($n - 1) }; $sum(10))',
        },
      }),
    ).resolves.toBe(55);
  });

  it('times out awaited external work through the outer timer', async () => {
    const transform = createJsonataValueTransform({ timeoutMs: 20 });
    await expect(
      transform.apply({ work: () => new Promise(() => {}) }, { options: { expression: 'work()' } }),
    ).rejects.toBeInstanceOf(JsonataTransformTimeoutError);
  });

  it('times out a pending promise through the direct race helper', async () => {
    await expect(
      raceJsonataEvaluation(new Promise(() => {}), { timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(JsonataTransformTimeoutError);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'preserves direct race-helper behavior for disabled deadlines: %s',
    async (timeoutMs) => {
      await expect(raceJsonataEvaluation(Promise.resolve(7), { timeoutMs })).resolves.toBe(7);
    },
  );

  it('fails closed on invalid expressions by default', async () => {
    await expect(
      jsonataValueTransform.apply({}, { options: { expression: '$sum(' } }),
    ).rejects.toBeTruthy();
  });

  it('preserves non-timeout JSONata errors', async () => {
    await expect(
      applyDefaultTransform(null, { options: { expression: '$error("synthetic failure")' } }),
    ).rejects.toMatchObject({ code: 'D3137', message: 'synthetic failure' });
  });

  it('checks an already-aborted signal before parsing a nonempty expression', async () => {
    const reason = new Error('Preview cancelled');
    const controller = new AbortController();
    controller.abort(reason);
    await expect(
      applyDefaultTransform(null, {
        options: { expression: '$sum(' },
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
  });

  it('preserves the abort reason while awaiting external work', async () => {
    const reason = Object.assign(new Error('Preview cancelled'), { code: 'D1012' });
    const controller = new AbortController();
    const transform = createJsonataValueTransform({ timeoutMs: 5_000 });
    const result = transform.apply(
      { work: () => new Promise(() => {}) },
      { options: { expression: 'work()' }, signal: controller.signal },
    );
    controller.abort(reason);
    await expect(result).rejects.toBe(reason);
  });

  it('rejects when the transform context signal is already aborted', async () => {
    const transform = createJsonataValueTransform({ timeoutMs: 5_000 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      transform.apply({}, { options: { expression: '1+1' }, signal: controller.signal }),
    ).rejects.toSatisfy((error: unknown) => error instanceof Error && error.name === 'AbortError');
  });
});
