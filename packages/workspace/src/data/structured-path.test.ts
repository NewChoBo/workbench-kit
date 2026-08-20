import { describe, expect, it } from 'vitest';
import {
  asWorkbenchStructuredDataRecord,
  getWorkbenchStructuredDataArrayIndex,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathValue,
  setWorkbenchStructuredDataValue,
  type WorkbenchStructuredDataRecord,
} from './structured-path';

describe('structured data paths', () => {
  it('reads and writes reserved-looking keys as own data without changing prototypes', () => {
    const source = { profile: {} };
    const next = setWorkbenchStructuredDataValue(source, ['profile', '__proto__', 'name'], 'safe');
    const nextProfile = next.profile as WorkbenchStructuredDataRecord;

    expect(getWorkbenchStructuredDataValue(next, ['profile', '__proto__', 'name'])).toBe('safe');
    expect(Object.prototype.hasOwnProperty.call(nextProfile, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(nextProfile)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(source.profile)).toBe(Object.prototype);
    expect(getWorkbenchStructuredDataValue(source, ['profile', '__proto__', 'name'])).toBeUndefined();

    const inherited = Object.create({ hidden: 'inherited' }) as WorkbenchStructuredDataRecord;
    expect(getWorkbenchStructuredDataValue(inherited, ['hidden'])).toBeUndefined();
  });

  it('keeps source containers immutable and preserves supported container prototypes', () => {
    const nullPrototypeChild = Object.assign(Object.create(null), { value: 'old' });
    const nullPrototypeSource = Object.assign(Object.create(null), { child: nullPrototypeChild });
    const nullPrototypeNext = setWorkbenchStructuredDataValue(
      nullPrototypeSource,
      ['child', 'value'],
      'new',
    );
    const arraySource = { rows: [{ name: 'first' }] };
    const arrayNext = setWorkbenchStructuredDataValue(arraySource, ['rows', '1', 'name'], 'second');

    expect(Object.getPrototypeOf(nullPrototypeNext)).toBeNull();
    expect(Object.getPrototypeOf(nullPrototypeNext.child)).toBeNull();
    expect(nullPrototypeSource.child).toEqual({ value: 'old' });
    expect(arrayNext.rows).toEqual([{ name: 'first' }, { name: 'second' }]);
    expect(arraySource.rows).toEqual([{ name: 'first' }]);
  });

  it('treats only plain and null-prototype objects as records', () => {
    class Example {
      value = 'source';
    }

    const instance = new Example();
    const date = new Date();
    const map = new Map([['value', 'source']]);

    expect(isWorkbenchStructuredDataRecord({ value: 'plain' })).toBe(true);
    expect(isWorkbenchStructuredDataRecord(Object.create(null))).toBe(true);
    expect(isWorkbenchStructuredDataRecord(instance)).toBe(false);
    expect(isWorkbenchStructuredDataRecord(date)).toBe(false);
    expect(isWorkbenchStructuredDataRecord(map)).toBe(false);
    expect(asWorkbenchStructuredDataRecord(instance)).toBeNull();
    expect(getWorkbenchStructuredDataValue(instance, ['value'])).toBeUndefined();
    expect(setWorkbenchStructuredDataPathValue(instance, ['value'], 'replacement')).toEqual({
      value: 'replacement',
    });
    expect(instance.value).toBe('source');
  });

  it('accepts only canonical JavaScript array-index segments for reads and writes', () => {
    expect(getWorkbenchStructuredDataArrayIndex(0)).toBe(0);
    expect(getWorkbenchStructuredDataArrayIndex('0')).toBe(0);
    expect(getWorkbenchStructuredDataArrayIndex('42')).toBe(42);
    expect(getWorkbenchStructuredDataArrayIndex('4294967294')).toBe(4_294_967_294);
    expect(getWorkbenchStructuredDataArrayIndex(4_294_967_294)).toBe(4_294_967_294);

    for (const segment of ['', ' ', '01', '1e2', '-1', '1.5', '4294967295']) {
      expect(getWorkbenchStructuredDataArrayIndex(segment)).toBeNull();
      expect(getWorkbenchStructuredDataValue(['zero', 'one'], [segment])).toBeUndefined();
      expect(setWorkbenchStructuredDataPathValue(['zero', 'one'], [segment], 'changed')).toEqual([
        'zero',
        'one',
      ]);
    }

    expect(getWorkbenchStructuredDataArrayIndex(-1)).toBeNull();
    expect(getWorkbenchStructuredDataArrayIndex(1.5)).toBeNull();
    expect(getWorkbenchStructuredDataArrayIndex(4_294_967_295)).toBeNull();
  });
});
