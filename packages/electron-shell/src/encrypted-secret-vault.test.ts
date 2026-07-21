import { describe, expect, it, vi } from 'vitest';

import {
  createEncryptedSecretVault,
  EncryptionUnavailableError,
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

describe('createEncryptedSecretVault', () => {
  it('round-trips secrets when encryption is available', async () => {
    let stored: Uint8Array | null = null;
    const vault = createEncryptedSecretVault({
      cipher: createFakeCipher(true),
      readVault: async () => stored,
      writeVault: async (bytes) => {
        stored = bytes;
      },
    });

    await expect(vault.getSecret('token')).resolves.toBeNull();
    await vault.setSecret('token', 'secret-value');
    await expect(vault.getSecret('token')).resolves.toBe('secret-value');
    await vault.deleteSecret('token');
    await expect(vault.getSecret('token')).resolves.toBeNull();
  });

  it('fails closed when encryption is unavailable', async () => {
    const writeVault = vi.fn(async () => undefined);
    const vault = createEncryptedSecretVault({
      cipher: createFakeCipher(false),
      readVault: async () => null,
      writeVault,
    });

    await expect(vault.setSecret('token', 'x')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    await expect(vault.getSecret('token')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    expect(writeVault).not.toHaveBeenCalled();
  });
});
