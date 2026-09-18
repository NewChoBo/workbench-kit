import { describe, expect, it, vi } from 'vitest';
import type { DataOperationContext, DataOperationDefinition } from '@workbench-kit/contracts';
import { createDataOperationRunner } from './index';

const ref = { id: 'test:identity', version: 1 };
function definition(overrides: Partial<DataOperationDefinition> = {}): DataOperationDefinition {
  return {
    ref,
    acceptsInput: () => true,
    acceptsOutput: () => true,
    execute: (value) => value,
    ...overrides,
  };
}
const options = { maxInvocations: 1 };

describe('strict data operations', () => {
  it('preserves explicit null undefined bytes and array cardinality', async () => {
    const runner = createDataOperationRunner([definition()]);
    for (const value of [
      null,
      undefined,
      new Uint8Array([0, 255]),
      Object.freeze([]),
      Object.freeze([1]),
      Object.freeze([1, 2]),
    ]) {
      const result = await runner.run(ref, value, options);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(value);
    }
  });

  it('resolves only exact refs and rejects invalid registration', async () => {
    const runner = createDataOperationRunner([
      definition(),
      definition({ ref: { ...ref, version: 2 }, execute: () => 'v2' }),
    ]);
    expect(await runner.run({ ...ref, version: 2 }, null, options)).toEqual({
      ok: true,
      value: 'v2',
    });
    expect(await runner.run({ ...ref, version: 3 }, null, options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'unknown-operation' },
    });
    expect(await runner.run({ ...ref, id: ` ${ref.id}` }, null, options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-request' },
    });
    expect(() => createDataOperationRunner([definition(), definition()])).toThrow('Duplicate');
    for (const version of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => createDataOperationRunner([definition({ ref: { ...ref, version } })])).toThrow(
        'Invalid',
      );
    }
  });

  it('snapshots registration independently of caller mutation', async () => {
    const mutable = { ...definition(), ref: { ...ref } };
    const runner = createDataOperationRunner([mutable]);
    mutable.ref.id = 'changed';
    mutable.execute = () => 'changed';
    expect(await runner.run(ref, 'original', options)).toEqual({ ok: true, value: 'original' });
  });

  it('keeps punctuation unicode and prototype-like ids distinct across versions', async () => {
    const ids = ['__proto__', 'constructor', 'text:1', 'text', 'text,1', 'text"1', '문자열'];
    const definitions = ids.flatMap((id) =>
      [1, 2, Number.MAX_SAFE_INTEGER].map((version) =>
        definition({ ref: { id, version }, execute: () => `${id}/${version}` }),
      ),
    );
    const runner = createDataOperationRunner(definitions);
    for (const { ref: request } of definitions) {
      expect(await runner.run({ ...request }, null, options)).toEqual({
        ok: true,
        value: `${request.id}/${request.version}`,
      });
    }
    expect(await runner.run({ id: 'text', version: 3 }, null, options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'unknown-operation' },
    });
    expect(() => createDataOperationRunner([...definitions, definitions[0]!])).toThrow('Duplicate');
  });

  it('rejects invalid input before executing and rejects invalid output', async () => {
    const execute = vi.fn(() => 7);
    const runner = createDataOperationRunner([
      definition({
        acceptsInput: (value) => typeof value === 'string',
        acceptsOutput: (value) => typeof value === 'string',
        execute,
      }),
    ]);
    expect(await runner.run(ref, 7, options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(execute).not.toHaveBeenCalled();
    expect(await runner.run(ref, 'text', options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-output' },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('retains causes and identifies validation versus execution failures', async () => {
    const cause = new Error('failure');
    for (const field of ['acceptsInput', 'acceptsOutput', 'execute'] as const) {
      const runner = createDataOperationRunner([
        definition({
          [field]: () => {
            throw cause;
          },
        }),
      ]);
      const result = await runner.run(ref, 'text', { ...options, location: ['step:1'] });
      expect(result).toMatchObject({
        ok: false,
        diagnostic: {
          code: field === 'execute' ? 'execution-failed' : 'validation-failed',
          operation: ref,
          location: ['step:1'],
        },
      });
      if (!result.ok) expect(result.cause).toBe(cause);
    }
  });

  it('rejects invalid budgets and locations without running code', async () => {
    const execute = vi.fn();
    const runner = createDataOperationRunner([definition({ execute })]);
    for (const maxInvocations of [0, -1, 1.1, Infinity, NaN]) {
      expect(await runner.run(ref, null, { maxInvocations })).toMatchObject({
        ok: false,
        diagnostic: { code: 'invalid-request' },
      });
    }
    expect(await runner.run(ref, null, { ...options, location: [' '] })).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-request' },
    });
    expect(await runner.run(ref, null, { ...options, location: Array<string>(1) })).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-request' },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('checks cancellation before execution and after awaited completion', async () => {
    const controller = new AbortController();
    const reason = new Error('stop');
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const execute = vi.fn(() => pending);
    const runner = createDataOperationRunner([definition({ execute })]);
    const result = runner.run(ref, null, { ...options, signal: controller.signal });
    controller.abort(reason);
    finish('not success');
    const failure = await result;
    expect(failure).toMatchObject({ ok: false, diagnostic: { code: 'cancelled' } });
    if (!failure.ok) expect(failure.cause).toBe(reason);
    await runner.run(ref, null, { ...options, signal: controller.signal });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('isolates cancellation and budgets across concurrent runs', async () => {
    const finishes: ((value: unknown) => void)[] = [];
    const runner = createDataOperationRunner([
      definition({
        execute: () =>
          new Promise((resolve) => {
            finishes.push(resolve);
          }),
      }),
    ]);
    const controller = new AbortController();
    const first = runner.run(ref, 'first', { ...options, signal: controller.signal });
    const second = runner.run(ref, 'second', options);
    controller.abort();
    finishes[0]!('first result');
    finishes[1]!('second result');
    expect(await first).toMatchObject({ ok: false, diagnostic: { code: 'cancelled' } });
    expect(await second).toEqual({ ok: true, value: 'second result' });
  });

  it('shares a nested budget and preserves child error addresses', async () => {
    const parent = { id: 'test:parent', version: 1 };
    const runner = createDataOperationRunner([
      definition({ acceptsInput: (value) => typeof value === 'string' }),
      definition({
        ref: parent,
        execute: (value, context) => context.invoke(ref, value, 'child:1'),
      }),
    ]);
    expect(await runner.run(parent, 'text', { maxInvocations: 2 })).toEqual({
      ok: true,
      value: 'text',
    });
    expect(
      await runner.run(parent, 'text', { maxInvocations: 1, location: ['recipe'] }),
    ).toMatchObject({
      ok: false,
      diagnostic: { code: 'budget-exceeded', operation: ref, location: ['recipe', 'child:1'] },
    });
    expect(await runner.run(parent, 7, { maxInvocations: 2, location: ['recipe'] })).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input', operation: ref, location: ['recipe', 'child:1'] },
    });
  });

  it('does not hide an exceeded budget when operation code catches it', async () => {
    const parent = { id: 'test:parent', version: 1 };
    const runner = createDataOperationRunner([
      definition(),
      definition({
        ref: parent,
        execute: async (value, context) => {
          try {
            await context.invoke(ref, value, 'child');
          } catch {
            /* caller cannot reset this budget */
          }
          return 'recovered';
        },
      }),
    ]);
    expect(await runner.run(parent, null, options)).toMatchObject({
      ok: false,
      diagnostic: { code: 'budget-exceeded', operation: ref, location: ['child'] },
    });
  });

  it('keeps child cancellation location and freezes diagnostics', async () => {
    const controller = new AbortController();
    const parent = { id: 'test:parent', version: 1 };
    const runner = createDataOperationRunner([
      definition({
        execute: () => {
          controller.abort();
          return 'cancelled';
        },
      }),
      definition({ ref: parent, execute: (value, context) => context.invoke(ref, value, 'child') }),
    ]);
    const result = await runner.run(parent, null, { maxInvocations: 2, signal: controller.signal });
    expect(result).toMatchObject({
      ok: false,
      diagnostic: { code: 'cancelled', operation: ref, location: ['child'] },
    });
    if (!result.ok) {
      expect(Object.isFrozen(result.diagnostic)).toBe(true);
      expect(Object.isFrozen(result.diagnostic.location)).toBe(true);
      expect(Object.isFrozen(result.diagnostic.operation)).toBe(true);
    }
  });

  it('closes escaped invocation contexts and isolates separate runs', async () => {
    let saved!: DataOperationContext;
    const execute = vi.fn((value, context) => {
      saved = context;
      return value;
    });
    const runner = createDataOperationRunner([definition({ execute })]);
    expect(await runner.run(ref, 'one', options)).toEqual({ ok: true, value: 'one' });
    await expect(saved.invoke(ref, 'late', 'child')).rejects.toMatchObject({
      diagnostic: { code: 'invalid-request' },
    });
    expect(await runner.run(ref, 'two', options)).toEqual({ ok: true, value: 'two' });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
