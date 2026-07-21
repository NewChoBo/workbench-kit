import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertPathInsideRoot, resolvePathUnderRoot } from './path-under-root.js';

describe('path-under-root', () => {
  const rootPath = path.join(os.tmpdir(), 'wbk-path-root');

  it('resolves relative segments under the root', () => {
    const resolved = resolvePathUnderRoot(rootPath, 'data', 'store.json');
    expect(resolved).toBe(path.resolve(rootPath, 'data', 'store.json'));
  });

  it('allows resolving to the root itself', () => {
    expect(resolvePathUnderRoot(rootPath)).toBe(path.resolve(rootPath));
    expect(assertPathInsideRoot(rootPath, rootPath)).toBe(path.resolve(rootPath));
  });

  it('rejects parent-directory escapes', () => {
    expect(() => resolvePathUnderRoot(rootPath, '..', 'outside.json')).toThrow(
      'Path escapes the configured root directory.',
    );
    expect(() => assertPathInsideRoot(rootPath, path.join(rootPath, '..', 'outside.json'))).toThrow(
      'Path escapes the configured root directory.',
    );
  });

  it('rejects absolute segments that leave the root', () => {
    const absoluteEscape = path.resolve(os.tmpdir(), 'wbk-path-escape', 'secret.json');
    expect(() => resolvePathUnderRoot(rootPath, absoluteEscape)).toThrow(
      'Path escapes the configured root directory.',
    );
    expect(() => assertPathInsideRoot(rootPath, absoluteEscape)).toThrow(
      'Path escapes the configured root directory.',
    );
  });

  it('accepts candidates that stay inside the root', () => {
    const candidate = path.join(rootPath, 'nested', 'file.txt');
    expect(assertPathInsideRoot(rootPath, candidate)).toBe(path.resolve(candidate));
  });
});
