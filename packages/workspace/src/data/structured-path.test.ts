import { describe, expect, it } from 'vitest';
import {
  asWorkbenchStructuredDataRecord,
  getWorkbenchStructuredDataArrayIndex,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathValue,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
  type WorkbenchStructuredDataRecord,
} from './structured-path';

describe('structured data paths', () => {
  it('keeps each setter empty-path contract', () => {
    const source = { value: 'old' };
    const replacement = { value: 'new' };

    expect(getWorkbenchStructuredDataValue(source, [])).toBe(source);
    expect(setWorkbenchStructuredDataValue(source, [], replacement)).toBe(source);
    expect(setWorkbenchStructuredDataPathValue(source, [], replacement)).toBe(replacement);
    expect(
      setWorkbenchStructuredDataPathOrRootValue({ data: source, path: [], value: replacement }),
    ).toBe(replacement);
    expect(source.value).toBe('old');
  });

  it('writes numeric zero and empty-string object keys in a nested immutable copy', () => {
    const source = { settings: { '0': { '': 'old' }, other: 'keep' } };

    const next = setWorkbenchStructuredDataValue(source, ['settings', 0, ''], 'new');

    expect(getWorkbenchStructuredDataValue(next, ['settings', 0, ''])).toBe('new');
    expect(getWorkbenchStructuredDataValue(next, ['settings', 'other'])).toBe('keep');
    expect(next).not.toBe(source);
    expect(getWorkbenchStructuredDataValue(next, ['settings'])).not.toBe(source.settings);
    expect(getWorkbenchStructuredDataValue(next, ['settings', 0])).not.toBe(source.settings['0']);
    expect(getWorkbenchStructuredDataValue(source, ['settings', 0, ''])).toBe('old');
  });

  it('ignores an absent root path segment without cloning or writing an undefined key', () => {
    const absentHead = new Array<string | number>(1);
    const objectSource = { value: 'old' };
    const arraySource = ['old'];

    expect(0 in absentHead).toBe(false);
    expect(setWorkbenchStructuredDataPathValue(objectSource, absentHead, 'new')).toBe(objectSource);
    expect(setWorkbenchStructuredDataValue(objectSource, absentHead, 'new')).toBe(objectSource);
    expect(
      setWorkbenchStructuredDataPathOrRootValue({
        data: objectSource,
        path: absentHead,
        value: 'new',
      }),
    ).toBe(objectSource);
    expect(setWorkbenchStructuredDataPathValue(arraySource, absentHead, 'new')).toBe(arraySource);
    expect(Object.prototype.hasOwnProperty.call(objectSource, 'undefined')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(arraySource, 'undefined')).toBe(false);
    expect(objectSource).toEqual({ value: 'old' });
    expect(arraySource).toEqual(['old']);
  });

  it('reads and writes reserved-looking keys as own data without changing prototypes', () => {
    const source = { profile: {} };
    const next = setWorkbenchStructuredDataValue(source, ['profile', '__proto__', 'name'], 'safe');
    const nextProfile = next.profile as WorkbenchStructuredDataRecord;

    expect(getWorkbenchStructuredDataValue(next, ['profile', '__proto__', 'name'])).toBe('safe');
    expect(Object.prototype.hasOwnProperty.call(nextProfile, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(nextProfile)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(source.profile)).toBe(Object.prototype);
    expect(
      getWorkbenchStructuredDataValue(source, ['profile', '__proto__', 'name']),
    ).toBeUndefined();

    const inherited = Object.create({ hidden: 'inherited' }) as WorkbenchStructuredDataRecord;
    expect(getWorkbenchStructuredDataValue(inherited, ['hidden'])).toBeUndefined();
  });

  it('reads own accessors and replaces them with data properties without invoking setters', () => {
    let getterCalls = 0;
    let setterCalls = 0;
    const source: WorkbenchStructuredDataRecord = {};
    const getter = () => {
      getterCalls += 1;
      return 'from getter';
    };
    const setter = () => {
      setterCalls += 1;
    };
    const sourcePrototype = Object.getPrototypeOf(source);

    Object.defineProperty(source, 'value', {
      configurable: true,
      enumerable: true,
      get: getter,
      set: setter,
    });

    expect(getWorkbenchStructuredDataValue(source, ['value'])).toBe('from getter');
    expect(getterCalls).toBe(1);

    const next = setWorkbenchStructuredDataValue(source, ['value'], 'replacement');
    const nextDescriptor = Object.getOwnPropertyDescriptor(next, 'value');
    const sourceDescriptor = Object.getOwnPropertyDescriptor(source, 'value');

    expect(next).not.toBe(source);
    expect(nextDescriptor).toMatchObject({
      configurable: true,
      enumerable: true,
      value: 'replacement',
      writable: true,
    });
    expect(nextDescriptor?.get).toBeUndefined();
    expect(nextDescriptor?.set).toBeUndefined();
    expect(setterCalls).toBe(0);
    expect(getterCalls).toBeGreaterThan(1);
    expect(sourceDescriptor?.get).toBe(getter);
    expect(sourceDescriptor?.set).toBe(setter);
    expect(getWorkbenchStructuredDataValue(source, ['value'])).toBe('from getter');
    expect(Object.getPrototypeOf(next)).toBe(sourcePrototype);
    expect(Object.getPrototypeOf(source)).toBe(sourcePrototype);
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

    for (const segment of ['', ' ', '01', '1e2', '-0', '-1', '1.5', '4294967295']) {
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
