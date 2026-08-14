import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserWorkbenchStorage,
  createMemoryWorkbenchStorage,
  readWorkbenchStorageJsonResult,
  writeWorkbenchStorageJsonResult,
} from './storage-adapters.js';

const BACKEND_SENSITIVE_DETAIL = 'BACKEND_SENSITIVE_DETAIL';

describe('workbench storage adapters', () => {
  it('stores values in memory without touching web storage', () => {
    const adapter = createMemoryWorkbenchStorage();
    adapter.setItem('k', 'v');
    expect(adapter.getItem('k')).toBe('v');
    adapter.removeItem('k');
    expect(adapter.getItem('k')).toBeNull();
  });

  it('wraps an injected Storage implementation', () => {
    const backing = new Map<string, string>();
    const storage = {
      get length() {
        return backing.size;
      },
      clear() {
        backing.clear();
      },
      getItem(key: string) {
        return backing.has(key) ? (backing.get(key) ?? null) : null;
      },
      key() {
        return null;
      },
      removeItem(key: string) {
        backing.delete(key);
      },
      setItem(key: string, value: string) {
        backing.set(key, value);
      },
    } satisfies Storage;

    const adapter = createBrowserWorkbenchStorage({ storage });
    expect(adapter).toBeDefined();
    adapter!.setItem('layout', '{}');
    expect(adapter!.getItem('layout')).toBe('{}');
    adapter!.removeItem('layout');
    expect(adapter!.getItem('layout')).toBeNull();
  });

  it('distinguishes read and decode failures without exposing backend details', () => {
    const onReadDiagnostic = vi.fn();
    const readResult = readWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/read-test',
      (value) => value,
      () => 'fallback',
      {
        getItem() {
          throw new Error(BACKEND_SENSITIVE_DETAIL);
        },
      },
      { onDiagnostic: onReadDiagnostic },
    );

    expect(readResult).toEqual({
      diagnostic: {
        code: 'read_failed',
        message: 'Workbench storage could not be read.',
        operation: 'read',
        storageKey: 'workbench-kit/.workbench/read-test',
      },
      value: 'fallback',
    });
    expect(onReadDiagnostic).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(readResult.diagnostic)).not.toContain(BACKEND_SENSITIVE_DETAIL);

    const onDecodeDiagnostic = vi.fn();
    const decodeResult = readWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/decode-test',
      (value) => value,
      () => 'fallback',
      { getItem: () => '{not-json' },
      { onDiagnostic: onDecodeDiagnostic },
    );

    expect(decodeResult.diagnostic?.code).toBe('decode_failed');
    expect(onDecodeDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('treats only a null item as missing and diagnoses an empty stored value', () => {
    const onMissingDiagnostic = vi.fn();
    const missing = readWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/missing-test',
      (value) => value,
      () => 'fallback',
      { getItem: () => null },
      { onDiagnostic: onMissingDiagnostic },
    );
    expect(missing).toEqual({ value: 'fallback' });
    expect(onMissingDiagnostic).not.toHaveBeenCalled();

    const onEmptyDiagnostic = vi.fn();
    const empty = readWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/empty-test',
      (value) => value,
      () => 'fallback',
      { getItem: () => '' },
      { onDiagnostic: onEmptyDiagnostic },
    );
    expect(empty.value).toBe('fallback');
    expect(empty.diagnostic?.code).toBe('decode_failed');
    expect(onEmptyDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('distinguishes unavailable browser storage from an accessor failure', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: undefined,
      });
      const unavailable = readWorkbenchStorageJsonResult(
        'workbench-kit/.workbench/unavailable-test',
        (value) => value,
        () => 'fallback',
      );
      expect(unavailable).toEqual({ value: 'fallback' });

      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('backend accessor failure');
        },
      });
      const failed = readWorkbenchStorageJsonResult(
        'workbench-kit/.workbench/access-test',
        (value) => value,
        () => 'fallback',
      );
      expect(failed.diagnostic?.code).toBe('read_failed');
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }
  });

  it('returns committed status and safe diagnostics for recoverable writes', () => {
    const values = new Map<string, string>();
    expect(
      writeWorkbenchStorageJsonResult(
        'workbench-kit/.workbench/write-test',
        { enabled: true },
        { setItem: (key, value) => values.set(key, value) },
      ),
    ).toEqual({ committed: true });
    expect(values.get('workbench-kit/.workbench/write-test')).toContain('"enabled": true');

    const onDiagnostic = vi.fn();
    const failed = writeWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/write-test',
      { enabled: true },
      {
        setItem() {
          throw new Error(BACKEND_SENSITIVE_DETAIL);
        },
      },
      { onDiagnostic },
    );
    expect(failed.committed).toBe(false);
    expect(failed.diagnostic).toEqual({
      code: 'write_failed',
      message: 'Workbench storage value could not be written.',
      operation: 'write',
      storageKey: 'workbench-kit/.workbench/write-test',
    });
    expect(onDiagnostic).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(failed.diagnostic)).not.toContain(BACKEND_SENSITIVE_DETAIL);
  });

  it('keeps serialization failures recoverable without calling the writer', () => {
    let writes = 0;
    const result = writeWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/serialization-test',
      { value: BigInt(1) },
      {
        setItem() {
          writes += 1;
        },
      },
    );

    expect(result).toMatchObject({
      committed: false,
      diagnostic: {
        code: 'write_failed',
        operation: 'write',
        storageKey: 'workbench-kit/.workbench/serialization-test',
      },
    });
    expect(writes).toBe(0);
  });

  it('keeps diagnostic callbacks observational when the callback throws', () => {
    const onDiagnostic = () => {
      throw new Error('diagnostic sink failure');
    };
    const readResult = readWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/observational-read',
      (value) => value,
      () => 'fallback',
      {
        getItem() {
          throw new Error(BACKEND_SENSITIVE_DETAIL);
        },
      },
      { onDiagnostic },
    );
    expect(readResult.value).toBe('fallback');
    expect(readResult.diagnostic?.code).toBe('read_failed');

    const writeResult = writeWorkbenchStorageJsonResult(
      'workbench-kit/.workbench/observational-write',
      { enabled: true },
      {
        setItem() {
          throw new Error(BACKEND_SENSITIVE_DETAIL);
        },
      },
      { onDiagnostic },
    );
    expect(writeResult).toMatchObject({
      committed: false,
      diagnostic: { code: 'write_failed' },
    });
  });
});
