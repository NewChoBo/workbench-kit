import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataOperationContext, DataOperationDefinition } from '@workbench-kit/contracts';
import { createDataOperationRunner } from '../../../runtime/src/dataOperations.js';
import { createJsonParseDataOperation } from './jsonDataOperations.js';
import {
  createUtf8DecodeDataOperation,
  type Utf8DecodeDataOperationOptions,
} from './utf8DataOperations.js';

const ref = { id: 'bytes:utf8-decode', version: 1 };
const runOptions = { maxInvocations: 1 };
const context: DataOperationContext = {
  signal: undefined,
  location: [],
  invoke: async () => {
    throw new Error('Decoding must not invoke children.');
  },
};
function runner(maxInputBytes = 64, bom: 'strip' | 'preserve' = 'strip') {
  return createDataOperationRunner([createUtf8DecodeDataOperation({ maxInputBytes, bom })]);
}

afterEach(() => vi.restoreAllMocks());

describe('strict bounded UTF8 operation', () => {
  it('rejects missing options invalid limits and missing or invalid BOM policy', () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    for (const options of [undefined, null, 1, 'options', false, () => 1]) {
      expect(() =>
        createUtf8DecodeDataOperation(options as unknown as Utf8DecodeDataOperationOptions),
      ).toThrow(TypeError);
    }
    for (const maxInputBytes of [
      undefined,
      null,
      '4',
      0,
      -1,
      0.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        createUtf8DecodeDataOperation({
          maxInputBytes,
          bom: 'strip',
        } as Utf8DecodeDataOperationOptions),
      ).toThrow(RangeError);
    }
    for (const bom of [undefined, null, true, 'ignore', 'STRIP', '']) {
      expect(() =>
        createUtf8DecodeDataOperation({ maxInputBytes: 1, bom } as Utf8DecodeDataOperationOptions),
      ).toThrow(TypeError);
    }
    expect(() =>
      createUtf8DecodeDataOperation({ maxInputBytes: Number.MAX_SAFE_INTEGER, bom: 'preserve' }),
    ).not.toThrow();
    expect(decode).not.toHaveBeenCalled();
  });

  it('snapshots both options and freezes the exact versioned definition', async () => {
    const options: Utf8DecodeDataOperationOptions = { maxInputBytes: 4, bom: 'strip' };
    const mutable = { ...options };
    const definition = createUtf8DecodeDataOperation(mutable);
    mutable.maxInputBytes = 100;
    mutable.bom = 'preserve';
    expect(definition.ref).toEqual(ref);
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.ref)).toBe(true);
    const instance = createDataOperationRunner([definition]);
    expect(await instance.run(ref, new Uint8Array([0xef, 0xbb, 0xbf, 65]), runOptions)).toEqual({
      ok: true,
      value: 'A',
    });
    expect(await instance.run(ref, new Uint8Array(5), runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(() =>
      createDataOperationRunner([
        definition,
        createUtf8DecodeDataOperation({ maxInputBytes: 8, bom: 'preserve' }),
      ]),
    ).toThrow('Duplicate');
  });

  it('decodes handwritten ASCII Hangul emoji NUL and empty byte sequences', async () => {
    const instance = runner();
    const fixtures: readonly [readonly number[], string][] = [
      [[], ''],
      [[65, 100, 97], 'Ada'],
      [[0xed, 0x95, 0x9c, 0xea, 0xb8, 0x80], '한글'],
      [[0xf0, 0x9f, 0x98, 0x80], '😀'],
      [[65, 0, 66], 'A\0B'],
      [[0x65, 0xcc, 0x81], 'e\u0301'],
    ];
    for (const [bytes, expected] of fixtures) {
      expect(await instance.run(ref, new Uint8Array(bytes), runOptions)).toEqual({
        ok: true,
        value: expected,
      });
    }
  });

  it('bounds actual view bytes and ignores bytes outside a subarray', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const backing = new Uint8Array([0xff, 65, 66, 0xff]);
    const visible = backing.subarray(1, 3);
    expect(await runner(2).run(ref, visible, runOptions)).toEqual({ ok: true, value: 'AB' });
    expect(await runner(1).run(ref, visible, runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(decode).toHaveBeenCalledTimes(1);
    const decodedView = decode.mock.calls[0][0] as Uint8Array;
    expect(decodedView).not.toBe(visible);
    expect(Object.getPrototypeOf(decodedView)).toBe(Uint8Array.prototype);
    expect(decodedView.buffer).toBe(backing.buffer);
    expect(decodedView.byteOffset).toBe(1);
    expect(decodedView.byteLength).toBe(2);
    expect(await runner(1).run(ref, backing.subarray(4, 4), runOptions)).toEqual({
      ok: true,
      value: '',
    });
  });

  it('admits cross realm subclass and native Buffer views without a Node production dependency', async () => {
    // These fixtures use actual Node builtins without adding Node ambient types to this package.
    const bufferModule: string = 'node:buffer';
    const vmModule: string = 'node:vm';
    const { Buffer } = (await import(bufferModule)) as {
      Buffer: { from(values: readonly number[]): Uint8Array };
    };
    const { runInNewContext } = (await import(vmModule)) as {
      runInNewContext(source: string): unknown;
    };
    class Bytes extends Uint8Array {}
    const inputs: unknown[] = [
      runInNewContext('new Uint8Array([65, 66])'),
      new Bytes([65, 66]),
      Buffer.from([0xff, 65, 66, 0xff]).subarray(1, 3),
    ];
    for (const input of inputs) {
      expect(await runner(2).run(ref, input, runOptions)).toEqual({ ok: true, value: 'AB' });
    }
  });

  it('uses intrinsic view metadata without reading shadowed properties', async () => {
    const shadow = vi.fn(() => {
      throw new Error('Shadowed properties must not be read.');
    });
    const input = new Uint8Array([65, 66]);
    for (const key of ['buffer', 'byteOffset', 'byteLength', Symbol.toStringTag]) {
      Object.defineProperty(input, key, { get: shadow });
    }
    expect(await runner(2).run(ref, input, runOptions)).toEqual({ ok: true, value: 'AB' });
    expect(await runner(1).run(ref, input, runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(shadow).not.toHaveBeenCalled();
  });

  it('rejects other brands proxies spoofed tags and coercion without decoding', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const coercion = vi.fn(() => {
      throw new Error('Coercion must not run.');
    });
    const tagged = new Int8Array([65]);
    Object.defineProperty(tagged, Symbol.toStringTag, { value: 'Uint8Array' });
    const inputs = [
      null,
      undefined,
      'A',
      [65],
      new ArrayBuffer(1),
      new DataView(new ArrayBuffer(1)),
      new Uint8ClampedArray([65]),
      new Int8Array([65]),
      new Uint16Array([65]),
      tagged,
      new Proxy(new Uint8Array([65]), {}),
      Object.create(Uint8Array.prototype),
      { [Symbol.toStringTag]: 'Uint8Array', [Symbol.toPrimitive]: coercion, toString: coercion },
    ];
    const instance = runner();
    for (const input of inputs) {
      expect(await instance.run(ref, input, runOptions)).toEqual({
        ok: false,
        diagnostic: { code: 'invalid-input', operation: ref, location: [] },
        cause: undefined,
      });
    }
    expect(coercion).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it('rejects shared resizable and detached storage including empty detached views', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const resizable = Reflect.construct(ArrayBuffer, [1, { maxByteLength: 2 }]) as ArrayBuffer;
    const resizableGetter = Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'resizable',
    )?.get;
    expect(resizableGetter?.call(resizable)).toBe(true);
    const detached = new Uint8Array([65]);
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    const emptyDetached = new Uint8Array(0);
    structuredClone(emptyDetached.buffer, { transfer: [emptyDetached.buffer] });
    const inputs = [
      new Uint8Array(new SharedArrayBuffer(1)),
      new Uint8Array(new SharedArrayBuffer(0)),
      new Uint8Array(resizable),
      detached,
      emptyDetached,
    ];
    const instance = runner();
    for (const input of inputs) {
      expect(await instance.run(ref, input, runOptions)).toMatchObject({
        ok: false,
        diagnostic: { code: 'invalid-input' },
      });
    }
    expect(decode).not.toHaveBeenCalled();
    expect(await instance.run(ref, new Uint8Array(0), runOptions)).toEqual({ ok: true, value: '' });
  });

  it('guards direct execution type storage and byte limits before decoding', () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const definition = createUtf8DecodeDataOperation({ maxInputBytes: 1, bom: 'preserve' });
    expect(() => definition.execute([65], context)).toThrow(TypeError);
    expect(() => definition.execute(new Uint8Array(new SharedArrayBuffer(1)), context)).toThrow(
      TypeError,
    );
    expect(() => definition.execute(new Uint8Array([65, 66]), context)).toThrow(RangeError);
    expect(decode).not.toHaveBeenCalled();
    expect(definition.execute(new Uint8Array([65]), context)).toBe('A');
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('preserves original fatal errors for truncated overlong surrogate and out of range bytes', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const instance = runner();
    const malformed = [
      [0xff],
      [0x80],
      [0xe2, 0x82],
      [0xc0, 0xaf],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
    ];
    for (const bytes of malformed) {
      const result = await instance.run(ref, new Uint8Array(bytes), {
        ...runOptions,
        location: ['decode'],
      });
      expect(result).toMatchObject({
        ok: false,
        diagnostic: { code: 'execution-failed', operation: ref, location: ['decode'] },
      });
      expect(decode.mock.results[decode.mock.results.length - 1]?.type).toBe('throw');
      if (!result.ok) {
        expect(result.cause).toBeInstanceOf(TypeError);
        expect(result.cause).toBe(decode.mock.results[decode.mock.results.length - 1]?.value);
      }
    }
    expect(decode).toHaveBeenCalledTimes(malformed.length);
    expect(await instance.run(ref, new Uint8Array([65]), runOptions)).toEqual({
      ok: true,
      value: 'A',
    });
  });

  it('applies explicit BOM policies without stripping internal or repeated markers', async () => {
    for (const [bom, expected] of [
      ['strip', 'A'],
      ['preserve', '\ufeffA'],
    ] as const) {
      const instance = runner(64, bom);
      expect(await instance.run(ref, new Uint8Array([0xef, 0xbb, 0xbf, 65]), runOptions)).toEqual({
        ok: true,
        value: expected,
      });
      expect(await instance.run(ref, new Uint8Array([0xef, 0xbb, 0xbf, 65]), runOptions)).toEqual({
        ok: true,
        value: expected,
      });
      expect(
        await instance.run(ref, new Uint8Array([65, 0xef, 0xbb, 0xbf, 66]), runOptions),
      ).toEqual({ ok: true, value: 'A\ufeffB' });
    }
    expect(
      await runner(6, 'strip').run(
        ref,
        new Uint8Array([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf]),
        runOptions,
      ),
    ).toEqual({ ok: true, value: '\ufeff' });
    expect(
      await runner(3, 'strip').run(ref, new Uint8Array([0xef, 0xbb, 0xbf]), runOptions),
    ).toEqual({ ok: true, value: '' });
    expect(
      await runner(3, 'preserve').run(ref, new Uint8Array([0xef, 0xbb, 0xbf]), runOptions),
    ).toEqual({ ok: true, value: '\ufeff' });
  });

  it('uses one fresh fatal nonstreaming decoder per admitted call and only admits string output', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const definition = createUtf8DecodeDataOperation({ maxInputBytes: 4, bom: 'preserve' });
    const instance = createDataOperationRunner([definition]);
    await instance.run(ref, new Uint8Array([65]), runOptions);
    await instance.run(ref, new Uint8Array([66]), runOptions);
    expect(decode).toHaveBeenCalledTimes(2);
    expect(decode.mock.contexts[0]).not.toBe(decode.mock.contexts[1]);
    for (let index = 0; index < 2; index += 1) {
      const decoder = decode.mock.contexts[index] as TextDecoder;
      expect(decoder.encoding).toBe('utf-8');
      expect(decoder.fatal).toBe(true);
      expect(decoder.ignoreBOM).toBe(true);
      expect(decode.mock.calls[index][1]).toEqual({ stream: false });
    }
    for (const value of ['', '\0', 'text']) expect(definition.acceptsOutput(value)).toBe(true);
    for (const value of [null, undefined, 0, false, [], {}, Object('text')])
      expect(definition.acceptsOutput(value)).toBe(false);
  });

  it('leaves input bytes unchanged and completed strings independent of later mutations', async () => {
    const bytes = new Uint8Array([65, 66]);
    const instance = runner();
    const result = instance.run(ref, bytes, runOptions);
    expect([...bytes]).toEqual([65, 66]);
    bytes[0] = 67;
    expect(await result).toEqual({ ok: true, value: 'AB' });
    expect(await instance.run(ref, bytes, runOptions)).toEqual({ ok: true, value: 'CB' });
    expect([...bytes]).toEqual([67, 66]);
  });

  it('does not decode before aborted calls and preserves cancellation after synchronous decoding', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const instance = runner();
    const before = new AbortController();
    before.abort('before');
    expect(
      await instance.run(ref, new Uint8Array([65]), { ...runOptions, signal: before.signal }),
    ).toEqual({
      ok: false,
      diagnostic: { code: 'cancelled', operation: ref, location: [] },
      cause: 'before',
    });
    expect(decode).not.toHaveBeenCalled();
    const after = new AbortController();
    const result = instance.run(ref, new Uint8Array([65]), {
      ...runOptions,
      signal: after.signal,
      location: ['late'],
    });
    expect(decode).toHaveBeenCalledTimes(1);
    after.abort('after');
    expect(await result).toEqual({
      ok: false,
      diagnostic: { code: 'cancelled', operation: ref, location: ['late'] },
      cause: 'after',
    });
  });

  it('composes real UTF8 and JSON operations with shared budgets and child error locations', async () => {
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    const parent: DataOperationDefinition = {
      ref: { id: 'example:read-json', version: 1 },
      acceptsInput: () => true,
      acceptsOutput: () => true,
      execute: async (value, context) => {
        const text = await context.invoke(ref, value, 'decode');
        return context.invoke({ id: 'json:parse', version: 1 }, text, 'parse');
      },
    };
    const instance = createDataOperationRunner([
      createUtf8DecodeDataOperation({ maxInputBytes: 16, bom: 'strip' }),
      createJsonParseDataOperation({ maxInputCharacters: 16 }),
      parent,
    ]);
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 91, 49, 44, 110, 117, 108, 108, 93]);
    expect(
      await instance.run(parent.ref, bytes, { maxInvocations: 1, location: ['recipe'] }),
    ).toEqual({
      ok: false,
      diagnostic: { code: 'budget-exceeded', operation: ref, location: ['recipe', 'decode'] },
      cause: undefined,
    });
    expect(decode).not.toHaveBeenCalled();
    expect(
      await instance.run(parent.ref, bytes, { maxInvocations: 2, location: ['recipe'] }),
    ).toEqual({
      ok: false,
      diagnostic: {
        code: 'budget-exceeded',
        operation: { id: 'json:parse', version: 1 },
        location: ['recipe', 'parse'],
      },
      cause: undefined,
    });
    expect(await instance.run(parent.ref, bytes, { maxInvocations: 3 })).toEqual({
      ok: true,
      value: [1, null],
    });
    const malformed = await instance.run(parent.ref, new Uint8Array([0xff]), {
      maxInvocations: 3,
      location: ['recipe'],
    });
    expect(malformed).toMatchObject({
      ok: false,
      diagnostic: { code: 'execution-failed', operation: ref, location: ['recipe', 'decode'] },
    });
    if (!malformed.ok) expect(malformed.cause).toBeInstanceOf(TypeError);
    const syntax = await instance.run(parent.ref, new Uint8Array([123]), {
      maxInvocations: 3,
      location: ['recipe'],
    });
    expect(syntax).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'execution-failed',
        operation: { id: 'json:parse', version: 1 },
        location: ['recipe', 'parse'],
      },
    });
  });

  it('isolates concurrent cancellation and independently configured byte and BOM policies', async () => {
    const first = runner(4, 'strip');
    const second = runner(8, 'preserve');
    const controller = new AbortController();
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 65]);
    const cancelled = first.run(ref, bytes, { ...runOptions, signal: controller.signal });
    const success = first.run(ref, bytes, runOptions);
    const preserved = second.run(ref, bytes, runOptions);
    controller.abort('one run');
    expect(await cancelled).toMatchObject({ ok: false, diagnostic: { code: 'cancelled' } });
    expect(await success).toEqual({ ok: true, value: 'A' });
    expect(await preserved).toEqual({ ok: true, value: '\ufeffA' });
    expect(await first.run(ref, new Uint8Array(5), runOptions)).toMatchObject({
      ok: false,
      diagnostic: { code: 'invalid-input' },
    });
    expect(await second.run(ref, new Uint8Array(5), runOptions)).toEqual({
      ok: true,
      value: '\0\0\0\0\0',
    });
  });
});
