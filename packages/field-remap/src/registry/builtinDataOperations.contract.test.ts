import { describe, expect, it, vi } from 'vitest';
import { createBuiltinTextDataOperations } from '@workbench-kit/field-remap/data-operations';
import { createBuiltinValueTransformRegistry } from '@workbench-kit/field-remap';
import { createDataOperationRunner } from '../../../runtime/src/dataOperations.js';

const refs = [
  { id: 'string:trim', version: 1 },
  { id: 'string:upper', version: 1 },
  { id: 'string:lower', version: 1 },
] as const;
const options = { maxInvocations: 1 };

describe('strict builtin text adapter contract', () => {
  it('publishes exactly three frozen versioned text definitions', () => {
    const definitions = createBuiltinTextDataOperations();
    expect(definitions.map((definition) => definition.ref)).toEqual(refs);
    expect(Object.isFrozen(definitions)).toBe(true);
    for (const definition of definitions) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.ref)).toBe(true);
    }
  });

  it('admits primitive strings and rejects other input and output values', () => {
    const strings = ['', ' \t\n', 'Ada', 'Straße 한글 😀', '\ud800'];
    const nonStrings = [null, undefined, 0, false, 7n, Symbol('text'), [], {}, new Uint8Array()];
    for (const definition of createBuiltinTextDataOperations()) {
      for (const value of strings) {
        expect(definition.acceptsInput(value)).toBe(true);
        expect(definition.acceptsOutput(value)).toBe(true);
      }
      for (const value of nonStrings) {
        expect(definition.acceptsInput(value)).toBe(false);
        expect(definition.acceptsOutput(value)).toBe(false);
      }
    }
  });

  it('rejects boxed and hostile coercion inputs without invoking coercion', async () => {
    const coercion = vi.fn(() => {
      throw new Error('Coercion must not run');
    });
    const hostile = {
      [Symbol.toPrimitive]: coercion,
      toString: coercion,
      valueOf: coercion,
    };
    const boxed: unknown = Object(' boxed text ');
    const definitions = createBuiltinTextDataOperations();
    const runner = createDataOperationRunner(definitions);
    for (const definition of definitions) {
      for (const value of [boxed, hostile]) {
        expect(definition.acceptsInput(value)).toBe(false);
        expect(definition.acceptsOutput(value)).toBe(false);
      }
      for (const value of [boxed, hostile, null, undefined, 42, false, [], {}]) {
        expect(
          await runner.run(definition.ref, value, { ...options, location: ['input'] }),
        ).toEqual({
          ok: false,
          diagnostic: { code: 'invalid-input', operation: definition.ref, location: ['input'] },
          cause: undefined,
        });
      }
    }
    expect(coercion).not.toHaveBeenCalled();
  });

  it('preserves handwritten Unicode empty and whitespace results alongside legacy transforms', async () => {
    const runner = createDataOperationRunner(createBuiltinTextDataOperations());
    const legacy = createBuiltinValueTransformRegistry();
    const fixtures: readonly [string, string, string][] = [
      ['string:trim', '', ''],
      ['string:trim', ' \t\n', ''],
      ['string:trim', '\u00a0\ufeffAda 한글 😀 \u2003', 'Ada 한글 😀'],
      ['string:trim', '\u200bAda\u200b', '\u200bAda\u200b'],
      ['string:upper', '', ''],
      ['string:upper', ' \t\n', ' \t\n'],
      ['string:upper', 'Straße café 한글 😀', 'STRASSE CAFÉ 한글 😀'],
      ['string:upper', 'iıİ', 'IIİ'],
      ['string:lower', '', ''],
      ['string:lower', ' \t\n', ' \t\n'],
      ['string:lower', 'CAFÉ 한글 😀', 'café 한글 😀'],
      ['string:lower', 'İ', 'i\u0307'],
    ];
    for (const [id, input, expected] of fixtures) {
      expect(await runner.run({ id, version: 1 }, input, options)).toEqual({
        ok: true,
        value: expected,
      });
      expect(legacy.apply(id, input)).toBe(expected);
    }
  });

  it('keeps strict rejection separate from legacy coercion', async () => {
    const runner = createDataOperationRunner(createBuiltinTextDataOperations());
    const legacy = createBuiltinValueTransformRegistry();
    const fixtures: readonly [string, unknown, string][] = [
      ['string:trim', 42, '42'],
      ['string:upper', false, 'FALSE'],
      ['string:lower', ['A', 'B'], 'a,b'],
      ['string:trim', null, ''],
      ['string:upper', undefined, ''],
      ['string:lower', Object('BOXED'), 'boxed'],
    ];
    for (const [id, input, legacyExpected] of fixtures) {
      expect(await runner.run({ id, version: 1 }, input, options)).toEqual({
        ok: false,
        diagnostic: { code: 'invalid-input', operation: { id, version: 1 }, location: [] },
        cause: undefined,
      });
      expect(legacy.apply(id, input)).toBe(legacyExpected);
    }
  });

  it('isolates repeated factories and concurrent runner results', async () => {
    const firstDefinitions = createBuiltinTextDataOperations();
    const secondDefinitions = createBuiltinTextDataOperations();
    const first = createDataOperationRunner(firstDefinitions);
    const second = createDataOperationRunner(secondDefinitions);
    expect(firstDefinitions.map((definition) => definition.ref)).toEqual(refs);
    expect(secondDefinitions.map((definition) => definition.ref)).toEqual(refs);
    expect(
      await Promise.all([first.run(refs[1], 'Straße', options), second.run(refs[2], 'İ', options)]),
    ).toEqual([
      { ok: true, value: 'STRASSE' },
      { ok: true, value: 'i\u0307' },
    ]);
    expect(
      await Promise.all([
        first.run(refs[0], null, options),
        second.run(refs[0], ' second ', options),
      ]),
    ).toEqual([
      {
        ok: false,
        diagnostic: { code: 'invalid-input', operation: refs[0], location: [] },
        cause: undefined,
      },
      { ok: true, value: 'second' },
    ]);
    expect(await first.run(refs[0], ' first ', options)).toEqual({ ok: true, value: 'first' });
  });
});
