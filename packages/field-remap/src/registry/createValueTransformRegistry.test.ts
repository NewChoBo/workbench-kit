import { describe, expect, it } from 'vitest';
import { BUILTIN_TRANSFORM_IDS, createBuiltinValueTransformRegistry } from './builtinTransforms.js';
import {
  areFieldTypesCompatible,
  arePortsCompatible,
  createValueTransformRegistry,
  isTransformChainCompatible,
  isTransformCompatible,
} from './createValueTransformRegistry.js';

describe('createValueTransformRegistry', () => {
  it('lists, gets, and applies registered transforms', () => {
    const registry = createValueTransformRegistry([
      {
        id: 'upper',
        label: 'Uppercase',
        apply: (value) => String(value).toUpperCase(),
      },
    ]);

    expect(registry.list().map((item) => item.id)).toEqual(['upper']);
    expect(registry.get('upper')?.label).toBe('Uppercase');
    expect(registry.apply('upper', 'hello')).toBe('HELLO');
  });

  it('ships identity, array, string, and date/time builtins', () => {
    const registry = createBuiltinValueTransformRegistry();
    const ids = registry.list().map((item) => item.id);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.identity);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.arrayFirst);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.arrayJoin);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.stringTrim);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.stringUpper);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.stringTemplate);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.dateReformat);
    expect(ids).toContain(BUILTIN_TRANSFORM_IDS.datetimeCombine);
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.identity, 42)).toBe(42);
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.arrayFirst, ['a', 'b'])).toBe('a');
    expect(
      registry.apply(BUILTIN_TRANSFORM_IDS.arrayJoin, ['a', 'b'], {
        options: { separator: '-' },
      }),
    ).toBe('a-b');
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.stringTrim, '  Ada  ')).toBe('Ada');
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.stringUpper, 'Ada')).toBe('ADA');
    expect(
      registry.apply(BUILTIN_TRANSFORM_IDS.stringPrefix, 'Ada', {
        options: { value: 'Ms. ' },
      }),
    ).toBe('Ms. Ada');
    expect(
      registry.apply(
        BUILTIN_TRANSFORM_IDS.stringTemplate,
        { FIRST_NM: 'Ada', LAST_NM: 'Lovelace' },
        { options: { template: '{FIRST_NM} {LAST_NM}' } },
      ),
    ).toBe('Ada Lovelace');
    expect(
      registry.apply(BUILTIN_TRANSFORM_IDS.dateReformat, '20260720', {
        options: { inputFormat: 'YYYYMMDD', outputFormat: 'YYYY.MM.DD' },
      }),
    ).toBe('2026.07.20');
    expect(
      registry.apply(
        BUILTIN_TRANSFORM_IDS.datetimeCombine,
        { date: '2026-07-20', time: '14:30:00' },
        {},
      ),
    ).toBe('2026-07-20T14:30:00');
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.datetimeDate, '2026-07-21T09:15:00')).toBe(
      '2026-07-21',
    );
    expect(registry.apply(BUILTIN_TRANSFORM_IDS.datetimeTime, '2026-07-21T09:15:00')).toBe(
      '09:15:00',
    );
  });

  it('throws for unknown transform ids', () => {
    const registry = createValueTransformRegistry();
    expect(() => registry.apply('missing', 1)).toThrow(/Unknown value transform/);
  });

  it('checks chain compatibility for host-registered transforms', () => {
    const registry = createValueTransformRegistry([
      {
        id: 'n2s',
        label: 'Number to string',
        inputTypes: ['number'],
        outputType: 'string',
        apply: (value) => String(value),
      },
      {
        id: 'upper',
        label: 'Uppercase',
        inputTypes: ['string'],
        outputType: 'string',
        apply: (value) => String(value).toUpperCase(),
      },
    ]);
    expect(isTransformCompatible(registry.get('n2s')!, 'number', 'string')).toBe(true);
    expect(isTransformChainCompatible(registry, ['n2s', 'upper'], 'number', 'string')).toBe(true);
    expect(isTransformChainCompatible(registry, ['upper', 'n2s'], 'number', 'string')).toBe(false);
  });
});

describe('areFieldTypesCompatible / arePortsCompatible', () => {
  const registry = createValueTransformRegistry([
    {
      id: 'n2s',
      label: 'Number to string',
      inputTypes: ['number'],
      outputType: 'string',
      apply: (value) => String(value),
    },
    {
      id: 'upper',
      label: 'Uppercase',
      inputTypes: ['string'],
      outputType: 'string',
      apply: (value) => String(value).toUpperCase(),
    },
  ]);

  it('treats missing and unknown types as permissive for identity links', () => {
    expect(areFieldTypesCompatible(undefined, 'string')).toBe(true);
    expect(areFieldTypesCompatible('number', undefined)).toBe(true);
    expect(areFieldTypesCompatible('unknown', 'string')).toBe(true);
    expect(areFieldTypesCompatible('string', 'unknown')).toBe(true);
    expect(areFieldTypesCompatible('string', 'string')).toBe(true);
    expect(areFieldTypesCompatible('string', 'number')).toBe(false);
    expect(areFieldTypesCompatible('object', 'array')).toBe(false);
  });

  it('uses identity type match when transformIds is empty or omitted', () => {
    expect(arePortsCompatible({ sourceType: 'string', targetType: 'string' })).toBe(true);
    expect(
      arePortsCompatible({
        sourceType: 'string',
        targetType: 'number',
        transformIds: [],
      }),
    ).toBe(false);
    expect(
      arePortsCompatible({
        sourceType: 'number',
        targetType: 'string',
        transformIds: [],
        registry,
      }),
    ).toBe(false);
  });

  it('delegates non-empty chains to isTransformChainCompatible', () => {
    expect(
      arePortsCompatible({
        sourceType: 'number',
        targetType: 'string',
        transformIds: ['n2s'],
        registry,
      }),
    ).toBe(true);
    expect(
      arePortsCompatible({
        sourceType: 'number',
        targetType: 'string',
        transformIds: ['n2s', 'upper'],
        registry,
      }),
    ).toBe(true);
    expect(
      arePortsCompatible({
        sourceType: 'number',
        targetType: 'string',
        transformIds: ['upper'],
        registry,
      }),
    ).toBe(false);
  });

  it('rejects non-empty chains when registry is missing', () => {
    expect(
      arePortsCompatible({
        sourceType: 'number',
        targetType: 'string',
        transformIds: ['n2s'],
      }),
    ).toBe(false);
  });
});
