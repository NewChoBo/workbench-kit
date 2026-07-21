import { describe, expect, it } from 'vitest';

import { createMemoryJsonDocumentStore } from './memory-json-document-store.js';

describe('createMemoryJsonDocumentStore', () => {
  it('returns not_found when empty', async () => {
    const store = createMemoryJsonDocumentStore<{ flag: boolean }>({
      kind: 'settings',
      schemaVersion: 1,
    });

    await expect(store.read()).resolves.toEqual({
      value: null,
      diagnostic: {
        code: 'not_found',
        message: 'Document is not present.',
      },
    });
  });

  it('round-trips typed data inside a versioned envelope', async () => {
    const store = createMemoryJsonDocumentStore<{ flag: boolean }>({
      kind: 'settings',
      schemaVersion: 1,
    });

    await store.write({ flag: true });

    await expect(store.read()).resolves.toEqual({ value: { flag: true } });
  });

  it('rejects unsupported kind and clears the document', async () => {
    const store = createMemoryJsonDocumentStore<{ flag: boolean }>({
      kind: 'settings',
      schemaVersion: 1,
      initial: {
        kind: 'other',
        schemaVersion: 1,
        data: { flag: false },
      },
    });

    await expect(store.read()).resolves.toMatchObject({
      value: null,
      diagnostic: { code: 'unsupported_kind' },
    });
    await expect(store.read()).resolves.toMatchObject({
      diagnostic: { code: 'not_found' },
    });
  });

  it('uses migrate when registered', async () => {
    const store = createMemoryJsonDocumentStore<{ flag: boolean }>({
      kind: 'settings',
      schemaVersion: 2,
      initial: {
        kind: 'settings',
        schemaVersion: 1,
        data: { flag: true },
      },
      migrate: (envelope) => {
        if (envelope.schemaVersion === 1) {
          return envelope.data as { flag: boolean };
        }
        return null;
      },
    });

    await expect(store.read()).resolves.toEqual({ value: { flag: true } });
  });
});
