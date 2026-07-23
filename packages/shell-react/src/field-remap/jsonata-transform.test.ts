import { describe, expect, it } from 'vitest';
import { createValueTransformRegistry } from '@workbench-kit/field-remap';

import {
  JSONATA_TRANSFORM_ID,
  JsonataTransformTimeoutError,
  createJsonataValueTransform,
  jsonataValueTransform,
  raceJsonataEvaluation,
} from './jsonata-transform.js';

describe('jsonataValueTransform', () => {
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

  it('times out when evaluation exceeds timeoutMs', async () => {
    await expect(
      raceJsonataEvaluation(new Promise(() => {}), { timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(JsonataTransformTimeoutError);
  });

  it('fails closed on invalid expressions by default', async () => {
    await expect(
      jsonataValueTransform.apply({}, { options: { expression: '$sum(' } }),
    ).rejects.toBeTruthy();
  });

  it('can passthrough errors when configured', async () => {
    const transform = createJsonataValueTransform({
      maxExpressionLength: 4,
      onError: 'passthrough',
    });
    await expect(transform.apply('keep', { options: { expression: '$string()' } })).resolves.toBe(
      'keep',
    );
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
