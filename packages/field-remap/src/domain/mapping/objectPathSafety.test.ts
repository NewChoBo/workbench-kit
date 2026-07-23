import { describe, expect, it } from 'vitest';

import {
  isSafeObjectPath,
  requireObjectPathParts,
  UnsafeObjectPathError,
} from './objectPathSafety.js';

describe('objectPathSafety', () => {
  it('accepts identifier and dotted paths', () => {
    expect(isSafeObjectPath('city')).toBe(true);
    expect(isSafeObjectPath('a.b')).toBe(true);
    expect(isSafeObjectPath('a.b.c')).toBe(true);
    expect(isSafeObjectPath('a-b')).toBe(false);
    expect(isSafeObjectPath('foo();')).toBe(false);
  });

  it('rejects dangerous object path segments', () => {
    const unsafePaths = [
      '__proto__.polluted',
      'constructor.prototype.polluted',
      'safe.prototype.value',
    ];

    for (const path of unsafePaths) {
      expect(isSafeObjectPath(path)).toBe(false);
      expect(() => requireObjectPathParts(path)).toThrow(UnsafeObjectPathError);
    }
  });

  it('reports the rejected path and segment', () => {
    let thrown: unknown;
    try {
      requireObjectPathParts('safe.__proto__.polluted');
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
