export interface SafeStorageCipher {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Uint8Array;
  decryptString(payload: Uint8Array): string;
}

export interface EncryptedSecretVault {
  getSecret(id: string): Promise<string | null>;
  setSecret(id: string, value: string): Promise<void>;
  deleteSecret(id: string): Promise<void>;
}

export interface CreateEncryptedSecretVaultOptions {
  readonly cipher: SafeStorageCipher;
  readonly readVault: () => Promise<Uint8Array | null>;
  readonly writeVault: (bytes: Uint8Array) => Promise<void>;
}

export class EncryptionUnavailableError extends Error {
  readonly code = 'encryption_unavailable' as const;

  constructor(message = 'OS-backed encryption is unavailable; refusing plaintext vault.') {
    super(message);
    this.name = 'EncryptionUnavailableError';
  }
}

interface VaultDocument {
  readonly version: 1;
  readonly secrets: Record<string, string>;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseVault(bytes: Uint8Array | null): VaultDocument {
  if (bytes === null || bytes.byteLength === 0) {
    return { version: 1, secrets: {} };
  }
  const parsed = JSON.parse(textDecoder.decode(bytes)) as Partial<VaultDocument>;
  if (parsed.version !== 1 || typeof parsed.secrets !== 'object' || parsed.secrets === null) {
    throw new Error('Secret vault document is malformed.');
  }
  return { version: 1, secrets: { ...parsed.secrets } };
}

function serializeVault(document: VaultDocument): Uint8Array {
  return textEncoder.encode(`${JSON.stringify(document)}\n`);
}

function assertEncryptionAvailable(cipher: SafeStorageCipher): void {
  if (!cipher.isEncryptionAvailable()) {
    throw new EncryptionUnavailableError();
  }
}

/**
 * Opaque secret vault using an injected OS-backed cipher.
 * Fails closed when encryption is unavailable (no plaintext fallback).
 * Hosts own persistence via readVault/writeVault (compose with platform/node atomic write).
 */
export function createEncryptedSecretVault(
  options: CreateEncryptedSecretVaultOptions,
): EncryptedSecretVault {
  const { cipher, readVault, writeVault } = options;

  const load = async (): Promise<VaultDocument> => {
    assertEncryptionAvailable(cipher);
    return parseVault(await readVault());
  };

  const save = async (document: VaultDocument): Promise<void> => {
    assertEncryptionAvailable(cipher);
    await writeVault(serializeVault(document));
  };

  return {
    async getSecret(id: string): Promise<string | null> {
      const document = await load();
      const encoded = document.secrets[id];
      if (typeof encoded !== 'string') {
        return null;
      }
      return cipher.decryptString(fromBase64(encoded));
    },

    async setSecret(id: string, value: string): Promise<void> {
      const document = await load();
      const nextSecrets = {
        ...document.secrets,
        [id]: toBase64(cipher.encryptString(value)),
      };
      await save({ version: 1, secrets: nextSecrets });
    },

    async deleteSecret(id: string): Promise<void> {
      const document = await load();
      if (!(id in document.secrets)) {
        return;
      }
      const nextSecrets = { ...document.secrets };
      delete nextSecrets[id];
      await save({ version: 1, secrets: nextSecrets });
    },
  };
}
