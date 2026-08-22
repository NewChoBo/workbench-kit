import { describe, expect, it } from 'vitest';

import {
  readLocalJsonStorage,
  readLocalJsonStorageResult,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
  writeLocalJsonStorageResult,
} from './local-json-storage.js';

describe('local-json-storage', () => {
  it('resolves injected storage without replacing it', () => {
    const storage = { getItem: () => null };

    expect(resolveLocalWorkbenchStorage(storage)).toBe(storage);
  });

  it('parses JSON and falls back for missing, invalid, or rejected values', () => {
    const values = new Map<string, string>([
      ['valid', '{"count":2}'],
      ['invalid', '{not-json'],
      ['rejected', '[]'],
    ]);
    const storage = { getItem: (key: string) => values.get(key) ?? null };
    const parseCount = (value: unknown): number => {
      if (typeof value !== 'object' || value === null || !('count' in value)) {
        throw new Error('Expected a count object.');
      }
      return Number((value as { count: unknown }).count);
    };

    expect(readLocalJsonStorage('valid', parseCount, () => -1, storage)).toBe(2);
    expect(readLocalJsonStorage('missing', parseCount, () => -1, storage)).toBe(-1);
    expect(readLocalJsonStorage('invalid', parseCount, () => -1, storage)).toBe(-1);
    expect(readLocalJsonStorage('rejected', parseCount, () => -1, storage)).toBe(-1);
  });

  it('reports safe read/decode diagnostics while keeping missing keys quiet', () => {
    const diagnostics: unknown[] = [];
    const options = { onDiagnostic: (diagnostic: unknown) => diagnostics.push(diagnostic) };

    expect(
      readLocalJsonStorageResult(
        'missing',
        (value) => value,
        () => 'fallback',
        {
          getItem: () => null,
        },
        options,
      ),
    ).toEqual({ value: 'fallback' });
    expect(diagnostics).toEqual([]);

    const empty = readLocalJsonStorageResult(
      'empty',
      (value) => value,
      () => 'fallback',
      { getItem: () => '' },
      options,
    );
    expect(empty.value).toBe('fallback');
    expect(empty.diagnostic?.code).toBe('decode_failed');

    const failed = readLocalJsonStorageResult(
      'failed',
      (value) => value,
      () => 'fallback',
      {
        getItem() {
          throw new Error('raw backend detail');
        },
      },
      options,
    );
    expect(failed.diagnostic?.code).toBe('read_failed');
    expect(diagnostics).toHaveLength(2);
    expect(JSON.stringify(diagnostics)).not.toContain('raw backend detail');
  });

  it('writes formatted JSON and keeps storage or serialization failures non-fatal', () => {
    const values = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => values.set(key, value) };

    writeLocalJsonStorage('settings', { enabled: true }, storage);
    expect(values.get('settings')).toBe('{\n  "enabled": true\n}');

    expect(() =>
      writeLocalJsonStorage(
        'settings',
        { enabled: true },
        {
          setItem() {
            throw new Error('quota exceeded');
          },
        },
      ),
    ).not.toThrow();
    expect(() =>
      writeLocalJsonStorage('settings', { enabled: true }, storage, {
        toStorageValue: () => {
          throw new Error('serialization failed');
        },
      }),
    ).not.toThrow();
  });

  it('reports whether a best-effort local JSON write committed', () => {
    const diagnostics: unknown[] = [];
    const result = writeLocalJsonStorageResult(
      'settings',
      { enabled: true },
      {
        setItem() {
          throw new Error('quota with backend details');
        },
      },
      { onDiagnostic: (diagnostic) => diagnostics.push(diagnostic) },
    );

    expect(result.committed).toBe(false);
    if (result.committed) {
      throw new Error('Expected the write to remain uncommitted.');
    }
    expect(result.diagnostic.code).toBe('write_failed');
    expect(diagnostics).toEqual([result.diagnostic]);
    expect(JSON.stringify(diagnostics)).not.toContain('backend details');
  });

  it('can preserve callers that intentionally surface write failures', () => {
    expect(() =>
      writeLocalJsonStorage(
        'settings',
        { enabled: true },
        {
          setItem() {
            throw new Error('quota exceeded');
          },
        },
        { errorMode: 'throw' },
      ),
    ).toThrow('quota exceeded');
  });
});
