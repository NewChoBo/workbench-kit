import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '../index.js';

describe('legacy builtin transforms', () => {
  const registry = createBuiltinValueTransformRegistry();

  it('covers the exact builtin inventory', () => {
    expect(
      registry
        .list()
        .map((item) => item.id)
        .sort(),
    ).toEqual([
      'array:first',
      'array:join',
      'date:reformat',
      'datetime:combine',
      'datetime:date',
      'datetime:time',
      'identity',
      'string:lower',
      'string:prefix',
      'string:suffix',
      'string:template',
      'string:trim',
      'string:upper',
    ]);
  });

  it('preserves identity and distinguishes undefined from null', () => {
    const record = Object.freeze({ label: 'Ada' });
    const array = Object.freeze([record]);
    for (const value of [record, array, undefined, null, false, 0, '']) {
      expect(registry.apply('identity', value)).toBe(value);
    }
  });

  it('reduces empty singleton and multiple arrays without mutation', () => {
    expect(registry.apply('array:first', Object.freeze([]))).toBeUndefined();
    expect(registry.apply('array:first', Object.freeze(['a']))).toBe('a');
    expect(registry.apply('array:first', Object.freeze(['a', 'b']))).toBe('a');
    expect(registry.apply('array:first', null)).toBeNull();
    expect(registry.apply('array:first', 'scalar')).toBe('scalar');
    expect(registry.apply('array:join', Object.freeze([]))).toBe('');
    expect(registry.apply('array:join', Object.freeze(['a']))).toBe('a');
    expect(registry.apply('array:join', Object.freeze(['a', 'b']))).toBe('a, b');
  });

  it('preserves join coercion and separator defaults', () => {
    const input = Object.freeze([null, undefined, 0, false, Object.freeze({})]);
    expect(
      registry.apply('array:join', input, { options: Object.freeze({ separator: '|' }) }),
    ).toBe('||0|false|[object Object]');
    expect(registry.apply('array:join', ['a', 'b'], { options: { separator: 7 } })).toBe('a, b');
    expect(registry.apply('array:join', ['a', 'b'], { options: { separator: '' } })).toBe('ab');
    expect(registry.apply('array:join', false)).toBe('false');
    expect(registry.apply('array:join', null)).toBe('');
  });

  it('preserves string coercion case whitespace and affixes', () => {
    const fixtures: readonly [string, unknown, string][] = [
      ['string:trim', ' \t한글\n ', '한글'],
      ['string:trim', null, ''],
      ['string:trim', undefined, ''],
      ['string:trim', 0, '0'],
      ['string:trim', false, 'false'],
      ['string:trim', ['a', 'b'], 'a,b'],
      ['string:upper', 'aBc 한글', 'ABC 한글'],
      ['string:lower', 'aBc 한글', 'abc 한글'],
      ['string:prefix', null, ''],
      ['string:suffix', 42, '42'],
    ];
    for (const [id, value, expected] of fixtures) expect(registry.apply(id, value)).toBe(expected);
    expect(registry.apply('string:prefix', 'Ada', { options: { value: 'Dr. ' } })).toBe('Dr. Ada');
    expect(registry.apply('string:suffix', 'Ada', { options: { value: '!' } })).toBe('Ada!');
    expect(registry.apply('string:prefix', 'Ada', { options: { value: 1 } })).toBe('Ada');
    expect(registry.apply('string:suffix', 'Ada', { options: { value: false } })).toBe('Ada');
  });

  it('resolves safe scalar placeholders and leaves unsupported syntax literal', () => {
    const record = Object.freeze({
      user: Object.freeze({ name: 'Ada' }),
      count: 0,
      active: false,
      empty: null,
      object: Object.freeze({}),
      list: Object.freeze(['a']),
    });
    expect(
      registry.apply('string:template', record, {
        options: {
          template:
            '{user.name}|{count}|{active}|{empty}|{missing}|{object}|{list}|{__proto__}|{list[0]}',
        },
      }),
    ).toBe('Ada|0|false||||||{list[0]}');
    expect(
      registry.apply('string:template', 'Ada', {
        record: { name: 'ignored' },
        options: { template: '{name}' },
      }),
    ).toBe('');
  });

  it('preserves template fallback and serialization failures', () => {
    expect(registry.apply('string:template', Object.freeze({ name: 'Ada' }))).toBe(
      '{"name":"Ada"}',
    );
    expect(registry.apply('string:template', ['a', 'b'])).toBe('a,b');
    expect(registry.apply('string:template', null)).toBe('');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => registry.apply('string:template', circular)).toThrow(TypeError);
  });

  it('reformats date tokens without adding calendar validation', () => {
    expect(registry.apply('date:reformat', '20260919')).toBe('2026-09-19');
    expect(registry.apply('date:reformat', ' 20260919 ')).toBe('2026-09-19');
    expect(registry.apply('date:reformat', '20269999')).toBe('2026-99-99');
    expect(registry.apply('date:reformat', 'invalid')).toBe('invalid');
    expect(
      registry.apply('date:reformat', '19/09/2026', {
        options: { inputFormat: 'DD/MM/YYYY', outputFormat: 'YYYY.MM.DD' },
      }),
    ).toBe('2026.09.19');
    expect(registry.apply('date:reformat', null)).toBe('');
  });

  it('combines configured fields and preserves missing values', () => {
    expect(
      registry.apply('datetime:combine', Object.freeze({ date: '2026-09-19', time: '12:30' })),
    ).toBe('2026-09-19T12:30');
    expect(registry.apply('datetime:combine', {})).toBe('T');
    expect(
      registry.apply(
        'datetime:combine',
        { d: 'today', t: 0 },
        { options: { dateKey: 'd', timeKey: 't', separator: ' ' } },
      ),
    ).toBe('today 0');
    expect(registry.apply('datetime:combine', null)).toBe('');
  });

  it('splits datetime text without timezone or calendar normalization', () => {
    expect(registry.apply('datetime:date', ' 2026-09-19T12:30:00Z ')).toBe('2026-09-19');
    expect(registry.apply('datetime:time', '2026-09-19T12:30:00Z')).toBe('12:30:00Z');
    expect(registry.apply('datetime:time', '2026-09-19 12:30')).toBe('12:30');
    expect(registry.apply('datetime:date', '20260919')).toBe('20260919');
    expect(registry.apply('datetime:time', '20260919')).toBe('');
    expect(registry.apply('datetime:date', 'invalid')).toBe('invalid');
    expect(registry.apply('datetime:time', 'invalid')).toBe('');
  });
});
