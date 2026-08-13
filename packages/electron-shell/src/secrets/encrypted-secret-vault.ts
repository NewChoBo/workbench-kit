export interface SafeStorageCipher {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Uint8Array;
  decryptString(payload: Uint8Array): string;
}

export interface EncryptedSecretVault {
  getSecret(id: string): Promise<string | null>;
  getSecrets(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
  hasSecret(id: string): Promise<boolean>;
  setSecret(id: string, value: string): Promise<void>;
  setSecrets(values: ReadonlyMap<string, string>): Promise<void>;
  deleteSecret(id: string): Promise<void>;
}

export interface CreateEncryptedSecretVaultOptions {
  readonly cipher: SafeStorageCipher;
  readonly documentCodec?: SecretVaultDocumentCodec;
  readonly readVault: () => Promise<Uint8Array | null>;
  readonly writeVault: (bytes: Uint8Array, metadata: SecretVaultCommitMetadata) => Promise<void>;
}

export interface SecretVaultDocumentCodec {
  parse(plaintext: string): Readonly<Record<string, string>>;
  serialize(secrets: Readonly<Record<string, string>>): string;
}

export interface SecretVaultCommitMetadata {
  readonly secretIds: readonly string[];
}

export class EncryptionUnavailableError extends Error {
  readonly code = 'encryption_unavailable' as const;

  constructor(message = 'OS-backed encryption is unavailable; refusing plaintext vault.') {
    super(message);
    this.name = 'EncryptionUnavailableError';
  }
}

interface VaultDocument {
  readonly version: 2;
  readonly secrets: Record<string, string>;
}

interface LegacyVaultDocument {
  readonly version: 1;
  readonly secrets: Record<string, string>;
}

type VaultMutation = (document: VaultDocument) => VaultDocument | null;

const textDecoder = new TextDecoder();

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseSecretRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Secret vault document is malformed.');
  }
  const secrets = createSecretRecord();
  for (const [id, secret] of Object.entries(value)) {
    if (typeof secret !== 'string') {
      throw new Error('Secret vault document is malformed.');
    }
    secrets[id] = secret;
  }
  return secrets;
}

function createSecretRecord(
  entries: Iterable<readonly [string, string]> = [],
): Record<string, string> {
  const secrets = Object.create(null) as Record<string, string>;
  for (const [id, secret] of entries) {
    secrets[id] = secret;
  }
  return secrets;
}

function hasOwnSecret(secrets: Readonly<Record<string, string>>, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(secrets, id);
}

function parseDefaultVaultPlaintext(plaintext: string): Record<string, string> {
  const parsed = JSON.parse(plaintext) as {
    readonly version?: unknown;
    readonly secrets?: unknown;
  };
  if (parsed.version !== 2) {
    throw new Error('Secret vault document is malformed.');
  }
  return parseSecretRecord(parsed.secrets);
}

const defaultDocumentCodec: SecretVaultDocumentCodec = {
  parse: parseDefaultVaultPlaintext,
  serialize: (secrets) => JSON.stringify({ version: 2, secrets }),
};

function parseLegacyVault(bytes: Uint8Array): LegacyVaultDocument {
  const parsed = JSON.parse(textDecoder.decode(bytes)) as {
    readonly version?: unknown;
    readonly secrets?: unknown;
  };
  if (parsed.version !== 1) {
    throw new Error('Secret vault document is malformed.');
  }
  return { version: 1, secrets: parseSecretRecord(parsed.secrets) };
}

function assertEncryptionAvailable(cipher: SafeStorageCipher): void {
  if (!cipher.isEncryptionAvailable()) {
    throw new EncryptionUnavailableError();
  }
}

function decryptVault(
  cipher: SafeStorageCipher,
  bytes: Uint8Array,
  documentCodec: SecretVaultDocumentCodec,
): VaultDocument {
  try {
    return {
      version: 2,
      secrets: parseSecretRecord(documentCodec.parse(cipher.decryptString(bytes))),
    };
  } catch (encryptedDocumentError) {
    try {
      const legacy = parseLegacyVault(bytes);
      const secrets: Record<string, string> = {};
      for (const [id, encoded] of Object.entries(legacy.secrets)) {
        secrets[id] = cipher.decryptString(fromBase64(encoded));
      }
      return { version: 2, secrets };
    } catch {
      throw encryptedDocumentError;
    }
  }
}

/**
 * Opaque whole-document secret vault using an injected OS-backed cipher.
 *
 * The encrypted payload hides secret identifiers as well as values. Operations are
 * processed in invocation order so reads observe earlier pending writes. Version 1
 * entry-encrypted documents remain readable and are rewritten by the next mutation.
 * Hosts own the plaintext envelope through an optional codec, atomic persistence,
 * references derived from commit metadata, and multi-instance coordination.
 */
export function createEncryptedSecretVault(
  options: CreateEncryptedSecretVaultOptions,
): EncryptedSecretVault {
  const { cipher, readVault, writeVault } = options;
  const documentCodec = options.documentCodec ?? defaultDocumentCodec;
  let operationQueue: Promise<void> = Promise.resolve();

  const load = async (): Promise<VaultDocument> => {
    assertEncryptionAvailable(cipher);
    const bytes = await readVault();
    if (bytes === null || bytes.byteLength === 0) {
      return { version: 2, secrets: createSecretRecord() };
    }
    return decryptVault(cipher, bytes, documentCodec);
  };

  const save = async (document: VaultDocument): Promise<void> => {
    assertEncryptionAvailable(cipher);
    const secretIds = Object.keys(document.secrets).sort((left, right) =>
      left.localeCompare(right),
    );
    await writeVault(cipher.encryptString(documentCodec.serialize(document.secrets)), {
      secretIds,
    });
  };

  const runOperation = <TResult>(operation: () => Promise<TResult>): Promise<TResult> => {
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const mutateVault = (mutation: VaultMutation): Promise<void> =>
    runOperation(async () => {
      const document = await load();
      const nextDocument = mutation(document);
      if (nextDocument !== null) {
        await save(nextDocument);
      }
    });

  return {
    getSecret(id: string): Promise<string | null> {
      return runOperation(async () => {
        const document = await load();
        return hasOwnSecret(document.secrets, id) ? document.secrets[id]! : null;
      });
    },

    getSecrets(ids: readonly string[]): Promise<ReadonlyMap<string, string>> {
      const requestedIds = [...ids];
      return runOperation(async () => {
        const document = await load();
        const result = new Map<string, string>();
        for (const id of requestedIds) {
          if (hasOwnSecret(document.secrets, id)) {
            result.set(id, document.secrets[id]!);
          }
        }
        return result;
      });
    },

    hasSecret(id: string): Promise<boolean> {
      return runOperation(async () => {
        const document = await load();
        return hasOwnSecret(document.secrets, id);
      });
    },

    setSecret(id: string, value: string): Promise<void> {
      return mutateVault((document) => {
        const secrets = createSecretRecord(Object.entries(document.secrets));
        secrets[id] = value;
        return { version: 2, secrets };
      });
    },

    setSecrets(values: ReadonlyMap<string, string>): Promise<void> {
      const snapshot = [...values];
      return mutateVault((document) => ({
        version: 2,
        secrets: createSecretRecord([...Object.entries(document.secrets), ...snapshot]),
      }));
    },

    deleteSecret(id: string): Promise<void> {
      return mutateVault((document) => {
        if (!hasOwnSecret(document.secrets, id)) {
          return null;
        }
        const nextSecrets = createSecretRecord(Object.entries(document.secrets));
        delete nextSecrets[id];
        return { version: 2, secrets: nextSecrets };
      });
    },
  };
}
