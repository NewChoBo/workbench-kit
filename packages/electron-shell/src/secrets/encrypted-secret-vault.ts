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

type VaultMutation = (document: VaultDocument) => VaultDocument | null;

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
 * Fails closed when encryption is unavailable; serializes mutations per vault instance.
 * Hosts own persistence (and multi-instance coordination) via readVault/writeVault.
 */
export function createEncryptedSecretVault(
  options: CreateEncryptedSecretVaultOptions,
): EncryptedSecretVault {
  const { cipher, readVault, writeVault } = options;
  let mutationQueue: Promise<void> = Promise.resolve();

  const load = async (): Promise<VaultDocument> => {
    assertEncryptionAvailable(cipher);
    return parseVault(await readVault());
  };

  const save = async (document: VaultDocument): Promise<void> => {
    assertEncryptionAvailable(cipher);
    await writeVault(serializeVault(document));
  };

  const mutateVault = (mutation: VaultMutation): Promise<void> => {
    const result = mutationQueue.then(async () => {
      const document = await load();
      const nextDocument = mutation(document);
      if (nextDocument !== null) {
        await save(nextDocument);
      }
    });
    mutationQueue = result.catch(() => undefined);
    return result;
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
      await mutateVault((document) => ({
        version: 1,
        secrets: {
          ...document.secrets,
          [id]: toBase64(cipher.encryptString(value)),
        },
      }));
    },

    async deleteSecret(id: string): Promise<void> {
      await mutateVault((document) => {
        if (!(id in document.secrets)) {
          return null;
        }
        const nextSecrets = { ...document.secrets };
        delete nextSecrets[id];
        return { version: 1, secrets: nextSecrets };
      });
    },
  };
}
