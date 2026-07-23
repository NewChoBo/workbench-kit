import { describe, expect, it, vi } from 'vitest';

import {
  createEncryptedSecretVault,
  EncryptionUnavailableError,
  type EncryptedSecretVault,
  type SafeStorageCipher,
} from './encrypted-secret-vault.js';

function createFakeCipher(available: boolean): SafeStorageCipher {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plaintext) => encoder.encode(`enc:${plaintext}`),
    decryptString: (payload) => {
      const text = decoder.decode(payload);
      if (!text.startsWith('enc:')) {
        throw new Error('bad cipher payload');
      }
      return text.slice(4);
    },
  };
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function createMemoryVault(options?: {
  readonly available?: boolean;
  readonly readVault?: () => Promise<Uint8Array | null>;
  readonly writeVault?: (bytes: Uint8Array) => Promise<void>;
}): EncryptedSecretVault {
  let stored: Uint8Array | null = null;
  return createEncryptedSecretVault({
    cipher: createFakeCipher(options?.available ?? true),
    readVault:
      options?.readVault ??
      (async () => {
        return stored?.slice() ?? null;
      }),
    writeVault:
      options?.writeVault ??
      (async (bytes) => {
        stored = bytes;
      }),
  });
}

describe('createEncryptedSecretVault', () => {
  it('round-trips secrets when encryption is available', async () => {
    const vault = createMemoryVault();

    await expect(vault.getSecret('token')).resolves.toBeNull();
    await vault.setSecret('token', 'secret-value');
    await expect(vault.getSecret('token')).resolves.toBe('secret-value');
    await vault.deleteSecret('token');
    await expect(vault.getSecret('token')).resolves.toBeNull();
  });

  it('serializes concurrent read-modify-write mutations', async () => {
    let stored: Uint8Array | null = null;
    let readCount = 0;
    const firstReadStarted = createDeferred();
    const releaseFirstRead = createDeferred();
    const vault = createMemoryVault({
      readVault: async () => {
        const snapshot = stored?.slice() ?? null;
        readCount += 1;
        if (readCount === 1) {
          firstReadStarted.resolve();
          await releaseFirstRead.promise;
        }
        return snapshot;
      },
      writeVault: async (bytes) => {
        stored = bytes;
      },
    });

    const firstMutation = vault.setSecret('first', 'one');
    await firstReadStarted.promise;
    const secondMutation = vault.setSecret('second', 'two');
    await Promise.resolve();

    expect(readCount).toBe(1);
    releaseFirstRead.resolve();
    await Promise.all([firstMutation, secondMutation]);

    await expect(vault.getSecret('first')).resolves.toBe('one');
    await expect(vault.getSecret('second')).resolves.toBe('two');
  });

  it('applies mixed mutations in invocation order', async () => {
    const vault = createMemoryVault();

    await vault.setSecret('token', 'initial');
    await Promise.all([vault.setSecret('token', 'updated'), vault.deleteSecret('token')]);
    await expect(vault.getSecret('token')).resolves.toBeNull();

    await Promise.all([vault.deleteSecret('token'), vault.setSecret('token', 'final')]);
    await expect(vault.getSecret('token')).resolves.toBe('final');
  });

  it('continues processing mutations after a write failure', async () => {
    let stored: Uint8Array | null = null;
    let failNextWrite = true;
    const vault = createMemoryVault({
      readVault: async () => stored,
      writeVault: async (bytes) => {
        if (failNextWrite) {
          failNextWrite = false;
          throw new Error('write failed');
        }
        stored = bytes;
      },
    });

    await expect(vault.setSecret('first', 'one')).rejects.toThrow('write failed');
    await expect(vault.setSecret('second', 'two')).resolves.toBeUndefined();
    await expect(vault.getSecret('second')).resolves.toBe('two');
  });

  it('fails closed when encryption is unavailable', async () => {
    const writeVault = vi.fn(async () => undefined);
    const vault = createMemoryVault({
      available: false,
      readVault: async () => null,
      writeVault,
    });

    await expect(vault.setSecret('token', 'x')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    await expect(vault.getSecret('token')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    expect(writeVault).not.toHaveBeenCalled();
  });
});
