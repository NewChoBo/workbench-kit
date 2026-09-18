import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataOperationContext, DataOperationDefinition } from '@workbench-kit/contracts';
import { createDataOperationRunner } from '../../../runtime/src/dataOperations.js';
import {
  createJsonParseDataOperation,
  type JsonParseDataOperationOptions,
} from './jsonDataOperations.js';

const ref = { id: 'json:parse', version: 1 };
const runOptions = { maxInvocations: 1 };
const context: DataOperationContext = {
  signal: undefined,
  location: [],
  invoke: async () => {
    throw new Error('JSON parsing must not invoke a child operation.');
  },
};
function runner(maxInputCharacters = 256) {
  return createDataOperationRunner([createJsonParseDataOperation({ maxInputCharacters })]);
}

afterEach(() => vi.restoreAllMocks());

describe('bounded native JSON operation', () => {
  it('rejects missing options and invalid limits before parsing', () => {
    const parse = vi.spyOn(JSON, 'parse');
    for (const options of [undefined, null, false, 1, 'limit', () => 1]) {
      expect(() =>
        createJsonParseDataOperation(options as unknown as JsonParseDataOperationOptions),
      ).toThrow(TypeError);
    }
    for (const maxInputCharacters of [
      undefined,
      null,
      '4',
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        createJsonParseDataOperation({ maxInputCharacters } as JsonParseDataOperationOptions),
      ).toThrow(RangeError);
    }
    expect(() =>
      createJsonParseDataOperation({ maxInputCharacters: Number.MAX_SAFE_INTEGER }),
    ).not.toThrow();
    expect(parse).not.toHaveBeenCalled();
  });

  it('snapshots the limit and freezes the exact versioned definition', async () => {
    const options = { maxInputCharacters: 1 };
    const definition = createJsonParseDataOperation(options);
    options.maxInputCharacters = 100;
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.ref)).toBe(true);
    expect(definition.ref).toEqual(ref);
    const instance = createDataOperationRunner([definition]);
    expect(await instance.run(ref, '0', runOptions)).toEqual({ ok: true, value: 0 });
    expect(await instance.run(ref, '[]', runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(() =>
      createDataOperationRunner([
        definition,
        createJsonParseDataOperation({ maxInputCharacters: 100 }),
      ]),
    ).toThrow('Duplicate');
  });

  it('parses scalar null object and zero one many array results', async () => {
    const instance = runner();
    const fixtures: readonly [string, unknown][] = [
      ['null', null],
      ['true', true],
      ['false', false],
      ['0', 0],
      ['1.25', 1.25],
      ['""', ''],
      ['"Ada\\nLovelace"', 'Ada\nLovelace'],
      ['{}', {}],
      [
        '{"name":"Ada","active":true,"nested":{"items":[1,null]}}',
        { name: 'Ada', active: true, nested: { items: [1, null] } },
      ],
      ['[]', []],
      ['[1]', [1]],
      ['[1,2,3]', [1, 2, 3]],
    ];
    for (const [input, expected] of fixtures) {
      expect(await instance.run(ref, input, runOptions)).toEqual({ ok: true, value: expected });
    }
  });

  it('admits only parser top-level kinds without recursively validating values', () => {
    const definition = createJsonParseDataOperation({ maxInputCharacters: 1 });
    const accessed = vi.fn(() => {
      throw new Error('Nested properties must not be read.');
    });
    const record = Object.defineProperty({}, 'nested', { get: accessed });
    for (const value of [
      null,
      '',
      false,
      0,
      -0,
      Infinity,
      -Infinity,
      [],
      {},
      Object.create(null),
      record,
      [undefined],
    ]) {
      expect(definition.acceptsOutput(value)).toBe(true);
    }
    for (const value of [
      undefined,
      NaN,
      1n,
      Symbol('value'),
      () => 1,
      new Date(),
      new Map(),
      new Set(),
      new Uint8Array(),
      Object('text'),
    ]) {
      expect(definition.acceptsOutput(value)).toBe(false);
    }
    expect(accessed).not.toHaveBeenCalled();
  });

  it('enforces original UTF16 length including emoji and whitespace', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    expect(await runner(4).run(ref, '"😀"', runOptions)).toEqual({ ok: true, value: '😀' });
    expect(await runner(3).run(ref, '"😀"', runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(await runner(2).run(ref, '0 ', runOptions)).toEqual({ ok: true, value: 0 });
    expect(await runner(1).run(ref, '0 ', runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse).toHaveBeenNthCalledWith(1, '"😀"');
    expect(parse).toHaveBeenNthCalledWith(2, '0 ');
  });

  it('rejects nonstrings boxed and hostile inputs without coercion or parsing', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const coercion = vi.fn(() => {
      throw new Error('Input coercion must not run.');
    });
    const hostile = { [Symbol.toPrimitive]: coercion, toString: coercion, valueOf: coercion };
    const instance = runner();
    for (const input of [
      null,
      undefined,
      false,
      0,
      1n,
      Symbol('json'),
      [],
      {},
      Object('null'),
      hostile,
    ]) {
      expect(await instance.run(ref, input, runOptions)).toEqual({
        ok: false,
        diagnostic: { code: 'invalid-input', operation: ref, location: [] },
        cause: undefined,
      });
    }
    expect(coercion).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
  });

  it('guards direct execution type and length before its single parse', () => {
    const parse = vi.spyOn(JSON, 'parse');
    const definition = createJsonParseDataOperation({ maxInputCharacters: 1 });
    expect(() => definition.execute(Object('0'), context)).toThrow(TypeError);
    expect(() => definition.execute('[]', context)).toThrow(RangeError);
    expect(parse).not.toHaveBeenCalled();
    expect(definition.execute('0', context)).toBe(0);
    expect(parse).toHaveBeenCalledExactlyOnceWith('0');
  });

  it('preserves native syntax errors as execution causes without normalization', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const instance = runner();
    const malformed = [
      '',
      ' \t\n',
      '\ufeffnull',
      '/* comment */null',
      '[1,]',
      '{"a":1,}',
      'NaN',
      'Infinity',
      'undefined',
      '01',
      "'text'",
    ];
    for (const input of malformed) {
      const result = await instance.run(ref, input, { ...runOptions, location: ['parse'] });
      expect(result).toMatchObject({
        ok: false,
        diagnostic: { code: 'execution-failed', operation: ref, location: ['parse'] },
      });
      expect(parse.mock.results[parse.mock.results.length - 1]?.type).toBe('throw');
      if (!result.ok) {
        expect(result.cause).toBeInstanceOf(SyntaxError);
        expect(result.cause).toBe(parse.mock.results[parse.mock.results.length - 1]?.value);
      }
    }
    expect(parse).toHaveBeenCalledTimes(malformed.length);
  });

  it('preserves native rounded numbers negative zero and overflow', async () => {
    const instance = runner();
    for (const [input, expected] of [
      ['9007199254740993', 9007199254740992],
      ['-0', -0],
      ['1e400', Infinity],
      ['-1e400', -Infinity],
    ] as const) {
      const result = await instance.run(ref, input, runOptions);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(expected);
    }
    expect(await instance.run(ref, '{"number":1e400}', runOptions)).toEqual({
      ok: true,
      value: { number: Infinity },
    });
  });

  it('keeps duplicate last keys and proto as an own data property', async () => {
    const result = await runner().run(
      ref,
      '{"duplicate":1,"duplicate":2,"__proto__":{"marker":true}}',
      runOptions,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const value = result.value as Record<string, unknown>;
      expect(value.duplicate).toBe(2);
      expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
      expect(Object.getOwnPropertyDescriptor(value, '__proto__')).toEqual({
        value: { marker: true },
        writable: true,
        enumerable: true,
        configurable: true,
      });
      expect(Object.prototype).not.toHaveProperty('marker');
    }
  });

  it('parses once and returns the native result without cloning or freezing', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const result = await runner().run(ref, '{"items":[1,2]}', runOptions);
    expect(parse).toHaveBeenCalledExactlyOnceWith('{"items":[1,2]}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(parse.mock.results[0]?.value);
      expect(Object.isFrozen(result.value)).toBe(false);
    }
  });

  it('does not parse on preabort and preserves late cancellation after parsing', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const instance = runner();
    const before = new AbortController();
    before.abort('before');
    expect(await instance.run(ref, 'null', { ...runOptions, signal: before.signal })).toEqual({
      ok: false,
      diagnostic: { code: 'cancelled', operation: ref, location: [] },
      cause: 'before',
    });
    expect(parse).not.toHaveBeenCalled();
    const after = new AbortController();
    const result = instance.run(ref, 'null', {
      ...runOptions,
      signal: after.signal,
      location: ['late'],
    });
    expect(parse).toHaveBeenCalledExactlyOnceWith('null');
    after.abort('after');
    expect(await result).toEqual({
      ok: false,
      diagnostic: { code: 'cancelled', operation: ref, location: ['late'] },
      cause: 'after',
    });
  });

  it('inherits nested budgets and child diagnostic locations from the runner', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const parent: DataOperationDefinition = {
      ref: { id: 'example:parse', version: 1 },
      acceptsInput: () => true,
      acceptsOutput: () => true,
      execute: (value, context) => context.invoke(ref, value, 'json'),
    };
    const instance = createDataOperationRunner([
      createJsonParseDataOperation({ maxInputCharacters: 16 }),
      parent,
    ]);
    expect(
      await instance.run(parent.ref, '[1]', { maxInvocations: 1, location: ['recipe'] }),
    ).toEqual({
      ok: false,
      diagnostic: { code: 'budget-exceeded', operation: ref, location: ['recipe', 'json'] },
      cause: undefined,
    });
    expect(parse).not.toHaveBeenCalled();
    expect(await instance.run(parent.ref, '[1]', { maxInvocations: 2 })).toEqual({
      ok: true,
      value: [1],
    });
    const result = await instance.run(parent.ref, '[', { maxInvocations: 2, location: ['recipe'] });
    expect(result).toMatchObject({
      ok: false,
      diagnostic: { code: 'execution-failed', operation: ref, location: ['recipe', 'json'] },
    });
    if (!result.ok) expect(result.cause).toBeInstanceOf(SyntaxError);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('isolates concurrent results cancellation and separately configured runners', async () => {
    const first = runner(4);
    const second = runner(8);
    const controller = new AbortController();
    const cancelled = first.run(ref, 'null', { ...runOptions, signal: controller.signal });
    const successful = first.run(ref, '[1]', runOptions);
    const larger = second.run(ref, '[1,2,3]', runOptions);
    controller.abort('one run');
    expect(await cancelled).toMatchObject({ ok: false, diagnostic: { code: 'cancelled' } });
    expect(await successful).toEqual({ ok: true, value: [1] });
    expect(await larger).toEqual({ ok: true, value: [1, 2, 3] });
    expect(await first.run(ref, '[1,2,3]', runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(await first.run(ref, 'true', runOptions)).toEqual({ ok: true, value: true });
  });
});
