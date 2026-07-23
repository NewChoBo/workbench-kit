import { describe, expect, it } from 'vitest';
import {
  applyStringTemplate,
  isPlainObject,
  isSafeObjectPath,
  listArrayItemProjectionOptions,
  projectCollectionItems,
  readObjectPath,
  UnsafeObjectPathError,
  writeObjectPath,
} from './pathUtils.js';

describe('pathUtils', () => {
  it('reads dotted object paths', () => {
    expect(readObjectPath({ meta: { label: 'A' } }, 'meta.label')).toBe('A');
    expect(readObjectPath({ name: 'wind' }, 'name')).toBe('wind');
    expect(readObjectPath(null, 'name')).toBeUndefined();
  });

  it('writes dotted object paths immutably', () => {
    const root = { display: { timeText: 'old' } };
    const next = writeObjectPath(root, 'display.condition', 'Clear');
    expect(next).toEqual({ display: { timeText: 'old', condition: 'Clear' } });
    expect(root).toEqual({ display: { timeText: 'old' } });
    expect(writeObjectPath(null, 'a.b', 1)).toEqual({ a: { b: 1 } });
  });

  it('rejects dangerous object path segments on read and write', () => {
    const unsafePaths = [
      '__proto__.polluted',
      'constructor.prototype.polluted',
      'safe.prototype.value',
    ];

    for (const path of unsafePaths) {
      expect(isSafeObjectPath(path)).toBe(false);
      expect(() => readObjectPath({}, path)).toThrow(UnsafeObjectPathError);
      expect(() => writeObjectPath({}, path, true)).toThrow(UnsafeObjectPathError);
    }

    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it('fills safe {path} templates without eval', () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([1])).toBe(false);
    expect(isSafeObjectPath('city')).toBe(true);
    expect(isSafeObjectPath('a.b')).toBe(true);
    expect(isSafeObjectPath('a.b.c')).toBe(true);
    expect(isSafeObjectPath('a-b')).toBe(false);
    expect(isSafeObjectPath('foo();')).toBe(false);

    expect(applyStringTemplate('{city} · {temp}', { city: 'Seoul', temp: 22 })).toBe('Seoul · 22');
    expect(applyStringTemplate('{meta.label}', { meta: { label: 'A' } })).toBe('A');
    expect(applyStringTemplate('{missing}', { city: 'X' })).toBe('');
    expect(applyStringTemplate('{foo bar}', { 'foo bar': 'nope' })).toBe('{foo bar}');
  });

  it('projects array items through itemSourcePath', () => {
    expect(
      projectCollectionItems(
        [
          { name: 'wind', level: 2 },
          { name: 'fog', level: 1 },
        ],
        'name',
      ),
    ).toEqual(['wind', 'fog']);
    expect(projectCollectionItems(['a', 'b'], 'name')).toEqual([undefined, undefined]);
    expect(projectCollectionItems({ not: 'array' }, 'name')).toEqual({ not: 'array' });
  });

  it('lists projection options from children or sample keys', () => {
    expect(
      listArrayItemProjectionOptions({
        children: [
          { label: 'name', path: 'name', dataType: 'string' },
          { label: 'level', path: 'level', dataType: 'number' },
        ],
      }),
    ).toEqual([
      { path: 'name', label: 'name', dataType: 'string' },
      { path: 'level', label: 'level', dataType: 'number' },
    ]);

    expect(
      listArrayItemProjectionOptions({
        sampleValue: [{ code: 'x', severity: 1 }],
      }),
    ).toEqual([
      { path: 'code', label: 'code' },
      { path: 'severity', label: 'severity' },
    ]);
  });
});
