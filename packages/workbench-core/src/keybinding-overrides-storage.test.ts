import { describe, expect, it, vi } from 'vitest';

import {
  readWorkbenchKeybindingOverridesStorageResult,
  writeWorkbenchKeybindingOverridesStorageResult,
} from './keybinding-overrides-storage.js';

const STORAGE_KEY = 'workbench-kit/.workbench/keybindings';

describe('keybinding override storage', () => {
  it('reports a missing value as an empty write-eligible state without writing', () => {
    const setItem = vi.fn();
    const storage = { getItem: () => null, setItem };

    expect(
      readWorkbenchKeybindingOverridesStorageResult({
        platform: 'windows',
        storage,
        storageKey: STORAGE_KEY,
      }),
    ).toEqual({
      entries: [],
      format: 'missing',
      writeEligible: true,
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('canonicalizes supported legacy records and preserves unsupported records', () => {
    const entries = [
      { command: 'save', key: ' CTRL + S ' },
      { command: 'conditional', key: ' CTRL + K ', when: 'editorFocus' },
      { args: ['draft'], command: 'with-args', key: ' CTRL + D ' },
    ];

    const result = readWorkbenchKeybindingOverridesStorageResult({
      platform: 'windows',
      storage: { getItem: () => JSON.stringify(entries) },
      storageKey: STORAGE_KEY,
    });

    expect(result).toEqual({
      entries: [
        { command: 'save', key: 'ctrl+s' },
        { command: 'conditional', key: 'CTRL + K', when: 'editorFocus' },
        { args: ['draft'], command: 'with-args', key: 'CTRL + D' },
      ],
      format: 'legacy-v0',
      writeEligible: true,
    });
  });

  it('migrates only supported macOS legacy ctrl records to the compatibility token', () => {
    const result = readWorkbenchKeybindingOverridesStorageResult({
      platform: 'mac',
      storage: {
        getItem: () =>
          JSON.stringify([
            { command: 'legacy-ctrl', key: 'ctrl+k' },
            { command: 'legacy-meta', key: 'meta+k' },
            { command: 'legacy-primary-alias', key: 'Ctrl/Cmd+P' },
            { args: [], command: 'empty-args', key: 'ctrl+e' },
            { command: 'conditional', key: 'ctrl+k', when: 'editorFocus' },
            { args: ['draft'], command: 'with-args', key: 'ctrl+d' },
          ]),
      },
      storageKey: STORAGE_KEY,
    });

    expect(result).toEqual({
      entries: [
        { command: 'legacy-ctrl', key: 'legacy-primary-or-control+k' },
        { command: 'legacy-meta', key: 'meta+k' },
        { command: 'legacy-primary-alias', key: 'meta+p' },
        { args: [], command: 'empty-args', key: 'legacy-primary-or-control+e' },
        { command: 'conditional', key: 'ctrl+k', when: 'editorFocus' },
        { args: ['draft'], command: 'with-args', key: 'ctrl+d' },
      ],
      format: 'legacy-v0',
      writeEligible: true,
    });
  });

  it('canonicalizes supported v1 records while keeping macOS ctrl and meta distinct', () => {
    const result = readWorkbenchKeybindingOverridesStorageResult({
      platform: 'mac',
      storage: {
        getItem: () =>
          JSON.stringify({
            kind: 'workbench.keybindingOverrides',
            version: 1,
            entries: [
              { command: 'physical-control', key: 'ctrl+k' },
              { command: 'command-key', key: 'meta+k' },
              { command: 'primary-alias', key: ' Ctrl/Cmd + P ' },
              { command: 'conditional', key: ' Ctrl/Cmd + U ', when: 'editorFocus' },
            ],
          }),
      },
      storageKey: STORAGE_KEY,
    });

    expect(result).toEqual({
      entries: [
        { command: 'physical-control', key: 'ctrl+k' },
        { command: 'command-key', key: 'meta+k' },
        { command: 'primary-alias', key: 'meta+p' },
        { command: 'conditional', key: 'Ctrl/Cmd + U', when: 'editorFocus' },
      ],
      format: 'v1',
      writeEligible: true,
    });
  });

  it('locks an unsupported future envelope and reports one bounded diagnostic', () => {
    const onDiagnostic = vi.fn();
    const setItem = vi.fn();
    const storage = {
      getItem: () =>
        JSON.stringify({
          kind: 'workbench.keybindingOverrides',
          version: 2,
          entries: [{ command: 'future', key: 'meta+f' }],
          futureState: 'preserve-me',
        }),
      setItem,
    };

    const result = readWorkbenchKeybindingOverridesStorageResult({
      options: { onDiagnostic },
      platform: 'mac',
      storage,
      storageKey: STORAGE_KEY,
    });

    expect(result).toEqual({
      diagnostic: {
        code: 'decode_failed',
        message: 'Workbench storage value could not be decoded.',
        operation: 'read',
        storageKey: STORAGE_KEY,
      },
      entries: [],
      format: 'unsupported-future',
      writeEligible: false,
    });
    expect(onDiagnostic).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', '{not-json'],
    [
      'malformed v1 entries',
      JSON.stringify({
        kind: 'workbench.keybindingOverrides',
        version: 1,
        entries: [{ command: 'missing-key' }],
      }),
    ],
    [
      'unexpected v1 fields',
      JSON.stringify({
        kind: 'workbench.keybindingOverrides',
        version: 1,
        entries: [],
        unknown: true,
      }),
    ],
    [
      'a supported v1 modifier-only chord',
      JSON.stringify({
        kind: 'workbench.keybindingOverrides',
        version: 1,
        entries: [{ command: 'modifier-only', key: 'ctrl' }],
      }),
    ],
    [
      'multiple candidates in one supported v1 record',
      JSON.stringify({
        kind: 'workbench.keybindingOverrides',
        version: 1,
        entries: [{ command: 'multiple', key: 'ctrl+k, ctrl+s' }],
      }),
    ],
  ])('locks %s without exposing stored details', (_label, storedValue) => {
    const result = readWorkbenchKeybindingOverridesStorageResult({
      platform: 'linux',
      storage: { getItem: () => storedValue },
      storageKey: STORAGE_KEY,
    });

    expect(result).toMatchObject({
      diagnostic: {
        code: 'decode_failed',
        operation: 'read',
        storageKey: STORAGE_KEY,
      },
      entries: [],
      format: 'decode-failed',
      writeEligible: false,
    });
    expect(JSON.stringify(result.diagnostic)).not.toContain('missing-key');
  });

  it('locks a read failure with a bounded diagnostic', () => {
    const backendDetail = 'BACKEND_SENSITIVE_DETAIL';
    const result = readWorkbenchKeybindingOverridesStorageResult({
      platform: 'unknown',
      storage: {
        getItem() {
          throw new Error(backendDetail);
        },
      },
      storageKey: STORAGE_KEY,
    });

    expect(result).toMatchObject({
      diagnostic: {
        code: 'read_failed',
        operation: 'read',
        storageKey: STORAGE_KEY,
      },
      entries: [],
      format: 'read-failed',
      writeEligible: false,
    });
    expect(JSON.stringify(result.diagnostic)).not.toContain(backendDetail);
  });

  it('writes the v1 envelope without changing entry records', () => {
    const values = new Map<string, string>();
    const entries = [
      { command: 'save', key: 'meta+s' },
      { args: ['draft'], command: 'with-args', key: 'meta+d', when: 'editorFocus' },
    ];

    expect(
      writeWorkbenchKeybindingOverridesStorageResult({
        entries,
        storage: { setItem: (key, value) => values.set(key, value) },
        storageKey: STORAGE_KEY,
      }),
    ).toEqual({ committed: true });
    expect(JSON.parse(values.get(STORAGE_KEY) ?? '')).toEqual({
      kind: 'workbench.keybindingOverrides',
      version: 1,
      entries,
    });
  });

  it.each([
    ['modifier-only', 'ctrl'],
    ['multiple candidates', 'ctrl+k, ctrl+s'],
    ['non-canonical alias', 'Ctrl/Cmd+K'],
  ])('refuses to write a supported %s record that its reader would lock', (_label, key) => {
    const setItem = vi.fn();
    const result = writeWorkbenchKeybindingOverridesStorageResult({
      entries: [{ command: 'invalid', key }],
      storage: { setItem },
      storageKey: STORAGE_KEY,
    });

    expect(result).toMatchObject({
      committed: false,
      diagnostic: { code: 'write_failed', operation: 'write', storageKey: STORAGE_KEY },
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('preserves unsupported records without applying canonical write validation', () => {
    const values = new Map<string, string>();
    const entries = [
      { command: 'conditional', key: 'Ctrl/Cmd+K, Alt+K', when: 'editorFocus' },
    ] as const;

    expect(
      writeWorkbenchKeybindingOverridesStorageResult({
        entries,
        storage: { setItem: (key, value) => values.set(key, value) },
        storageKey: STORAGE_KEY,
      }),
    ).toEqual({ committed: true });
    expect(JSON.parse(values.get(STORAGE_KEY) ?? '{}').entries).toEqual(entries);
  });

  it('returns a bounded write diagnostic when persistence fails', () => {
    const backendDetail = 'BACKEND_SENSITIVE_DETAIL';
    const result = writeWorkbenchKeybindingOverridesStorageResult({
      entries: [],
      storage: {
        setItem() {
          throw new Error(backendDetail);
        },
      },
      storageKey: STORAGE_KEY,
    });

    expect(result).toMatchObject({
      committed: false,
      diagnostic: {
        code: 'write_failed',
        operation: 'write',
        storageKey: STORAGE_KEY,
      },
    });
    expect(JSON.stringify(result)).not.toContain(backendDetail);
  });
});
