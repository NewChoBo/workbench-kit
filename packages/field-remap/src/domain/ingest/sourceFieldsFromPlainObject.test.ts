import { describe, expect, it } from 'vitest';
import { sourceFieldsFromPlainObject } from './sourceFieldsFromPlainObject.js';

describe('sourceFieldsFromPlainObject', () => {
  it('returns empty for non-objects', () => {
    expect(sourceFieldsFromPlainObject(null)).toEqual([]);
    expect(sourceFieldsFromPlainObject('x')).toEqual([]);
    expect(sourceFieldsFromPlainObject([1, 2])).toEqual([]);
  });

  it('infers nested fields and array item children', () => {
    const fields = sourceFieldsFromPlainObject(
      {
        clock: { now: new Date(2026, 0, 1), zone: 'UTC' },
        tempC: 22.5,
        tags: [{ name: 'wind', level: 2 }],
      },
      { idPrefix: 'demo' },
    );

    expect(fields.map((field) => field.id)).toEqual(['demo.clock', 'demo.tempC', 'demo.tags']);
    expect(fields[0]?.dataType).toBe('object');
    expect(fields[0]?.children?.map((child) => child.label)).toEqual(['now', 'zone']);
    expect(fields[0]?.children?.[0]?.dataType).toBe('datetime');
    expect(fields[1]?.dataType).toBe('number');
    expect(fields[2]?.dataType).toBe('array');
    expect(fields[2]?.children?.map((child) => child.path)).toEqual(['name', 'level']);
  });

  it('respects maxDepth', () => {
    const fields = sourceFieldsFromPlainObject({ a: { b: { c: 1 } } }, { maxDepth: 0 });
    expect(fields[0]?.children).toBeUndefined();
  });
});
