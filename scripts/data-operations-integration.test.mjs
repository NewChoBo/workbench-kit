import { describe, expect, it } from 'vitest';
import { createDataOperationRunner } from '../packages/runtime/src/index.ts';
import {
  createBuiltinTextDataOperations,
  createBuiltinValueTransformRegistry,
} from '../packages/field-remap/src/index.ts';

describe('shared data operation integration', () => {
  it('reuses all three builtin algorithms through strict calls', async () => {
    const definitions = createBuiltinTextDataOperations();
    expect(definitions.map((item) => item.ref.id)).toEqual([
      'string:trim',
      'string:upper',
      'string:lower',
    ]);
    const runner = createDataOperationRunner(definitions);
    for (const [id, input, expected] of [
      ['string:trim', '  한글  ', '한글'],
      ['string:upper', 'Ada', 'ADA'],
      ['string:lower', 'Ada', 'ada'],
    ]) {
      expect(await runner.run({ id, version: 1 }, input, { maxInvocations: 1 })).toEqual({
        ok: true,
        value: expected,
      });
    }
  });

  it('separates strict rejection from unchanged legacy coercion', async () => {
    const runner = createDataOperationRunner(createBuiltinTextDataOperations());
    const legacy = createBuiltinValueTransformRegistry();
    expect(legacy.apply('string:trim', 42)).toBe('42');
    for (const input of [42, false, null, undefined, [], {}]) {
      expect(
        await runner.run({ id: 'string:trim', version: 1 }, input, { maxInvocations: 1 }),
      ).toMatchObject({ ok: false, diagnostic: { code: 'invalid-input' } });
    }
  });

  it('composes real adapters with one shared budget and location', async () => {
    const ref = { id: 'example:normalize', version: 1 };
    const runner = createDataOperationRunner([
      ...createBuiltinTextDataOperations(),
      {
        ref,
        acceptsInput: (value) => typeof value === 'string',
        acceptsOutput: (value) => typeof value === 'string',
        execute: async (value, context) => {
          const trimmed = await context.invoke({ id: 'string:trim', version: 1 }, value, 'trim');
          return context.invoke({ id: 'string:upper', version: 1 }, trimmed, 'upper');
        },
      },
    ]);
    expect(await runner.run(ref, '  Ada  ', { maxInvocations: 3 })).toEqual({
      ok: true,
      value: 'ADA',
    });
    expect(
      await runner.run(ref, '  Ada  ', { maxInvocations: 2, location: ['step:1'] }),
    ).toMatchObject({
      ok: false,
      diagnostic: { code: 'budget-exceeded', location: ['step:1', 'upper'] },
    });
  });
});
