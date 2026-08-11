import { describe, expect, it } from 'vitest';

import {
  isSafeObjectPath,
  objectPathHasWildcard,
  parseObjectPath,
  UnsafeObjectPathError,
} from './objectPathSafety.js';

describe('objectPathSafety', () => {
  it('accepts identifier, dotted, index, and wildcard paths', () => {
    expect(isSafeObjectPath('city')).toBe(true);
    expect(isSafeObjectPath('a.b')).toBe(true);
    expect(isSafeObjectPath('a.b.c')).toBe(true);
    expect(isSafeObjectPath('items[0].name')).toBe(true);
    expect(isSafeObjectPath('items[*].meta.label')).toBe(true);
    expect(isSafeObjectPath('a-b')).toBe(false);
    expect(isSafeObjectPath('foo();')).toBe(false);
    expect(isSafeObjectPath('items[name]')).toBe(false);
  });

  it('parses typed segments', () => {
    expect(parseObjectPath('items[0].name')).toEqual([
      { kind: 'index', name: 'items', index: 0 },
      { kind: 'property', name: 'name' },
    ]);
    expect(parseObjectPath('items[*].label')).toEqual([
      { kind: 'wildcard', name: 'items' },
      { kind: 'property', name: 'label' },
    ]);
    expect(objectPathHasWildcard('items[*].name')).toBe(true);
    expect(objectPathHasWildcard('items[0].name')).toBe(false);
  });

  it('rejects dangerous object path segments', () => {
    const unsafePaths = [
      '__proto__.polluted',
      'constructor.prototype.polluted',
      'safe.prototype.value',
    ];

    for (const path of unsafePaths) {
      expect(isSafeObjectPath(path)).toBe(false);
      expect(() => parseObjectPath(path)).toThrow(UnsafeObjectPathError);
    }
  });

  it('reports the rejected path and segment', () => {
    let thrown: unknown;
    try {
      parseObjectPath('safe.__proto__.polluted');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      name: 'UnsafeObjectPathError',
      code: 'unsafe_object_path',
      path: 'safe.__proto__.polluted',
      segment: '__proto__',
    });
  });
});
