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
    await expect(vault.hasSecret('token')).resolves.toBe(true);
    await vault.setSecrets(
      new Map([
        ['clientId', 'client'],
        ['clientSecret', 'credential'],
      ]),
    );
    await expect(vault.getSecrets(['clientSecret', 'missing', 'clientId'])).resolves.toEqual(
      new Map([
        ['clientSecret', 'credential'],
        ['clientId', 'client'],
      ]),
    );
    await vault.deleteSecret('token');
    await expect(vault.getSecret('token')).resolves.toBeNull();
  });

  it('encrypts the whole document so persisted bytes do not expose secret ids', async () => {
    let stored: Uint8Array | null = null;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const vault = createEncryptedSecretVault({
      cipher: {
        decryptString: (payload) => atob(decoder.decode(payload)),
        encryptString: (plaintext) => encoder.encode(btoa(plaintext)),
        isEncryptionAvailable: () => true,
      },
      readVault: async () => stored,
      writeVault: async (bytes) => {
        stored = bytes;
      },
    });

    await vault.setSecret('private-token-id', 'secret-value');

    expect(new TextDecoder().decode(stored!)).not.toContain('private-token-id');
  });

  it('treats prototype property names as ordinary secret ids', async () => {
    const vault = createMemoryVault();

    await vault.setSecrets(
      new Map([
        ['__proto__', 'prototype-secret'],
        ['toString', 'string-secret'],
      ]),
    );

    await expect(vault.getSecret('__proto__')).resolves.toBe('prototype-secret');
    await expect(vault.getSecret('toString')).resolves.toBe('string-secret');
    await expect(vault.hasSecret('constructor')).resolves.toBe(false);
    await vault.deleteSecret('__proto__');
    await expect(vault.hasSecret('__proto__')).resolves.toBe(false);
  });

  it('reads legacy entry-encrypted documents and rewrites on mutation', async () => {
    const encoder = new TextEncoder();
    let stored: Uint8Array | null = encoder.encode(
      JSON.stringify({
        version: 1,
        secrets: { token: btoa('enc:legacy-secret') },
      }),
    );
    const vault = createEncryptedSecretVault({
      cipher: createFakeCipher(true),
      readVault: async () => stored,
      writeVault: async (bytes) => {
        stored = bytes;
      },
    });

    await expect(vault.getSecret('token')).resolves.toBe('legacy-secret');
    await vault.setSecret('next', 'new-secret');
    expect(new TextDecoder().decode(stored)).toMatch(/^enc:/u);
    await expect(vault.getSecrets(['token', 'next'])).resolves.toEqual(
      new Map([
        ['token', 'legacy-secret'],
        ['next', 'new-secret'],
      ]),
    );
  });

  it('preserves prototype-like legacy ids when rewriting as an encrypted document', async () => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const legacySecrets = Object.create(null) as Record<string, string>;
    legacySecrets['__proto__'] = btoa('enc:legacy-prototype-secret');
    legacySecrets['constructor'] = btoa('enc:legacy-constructor-secret');
    let stored: Uint8Array | null = encoder.encode(
      JSON.stringify({ version: 1, secrets: legacySecrets }),
    );
    const vault = createEncryptedSecretVault({
      cipher: createFakeCipher(true),
      readVault: async () => stored,
      writeVault: async (bytes) => {
        stored = bytes;
      },
    });

    await expect(vault.getSecret('__proto__')).resolves.toBe('legacy-prototype-secret');
    await expect(vault.getSecret('constructor')).resolves.toBe('legacy-constructor-secret');

    await vault.setSecret('next', 'new-secret');

    const rewritten = JSON.parse(decoder.decode(stored).slice('enc:'.length)) as {
      readonly version: number;
      readonly secrets: Record<string, string>;
    };
    expect(rewritten.version).toBe(2);
    expect(Object.prototype.hasOwnProperty.call(rewritten.secrets, '__proto__')).toBe(true);
    expect(rewritten.secrets['__proto__']).toBe('legacy-prototype-secret');
    await expect(vault.getSecrets(['__proto__', 'constructor', 'next'])).resolves.toEqual(
      new Map([
        ['__proto__', 'legacy-prototype-secret'],
        ['constructor', 'legacy-constructor-secret'],
        ['next', 'new-secret'],
      ]),
    );
  });

  it('preserves a host-owned encrypted envelope and exposes sorted commit ids', async () => {
    const encoder = new TextEncoder();
    let stored: Uint8Array | null = encoder.encode(
      'enc:{"kind":"host.secretVault","secrets":{"token":"legacy-secret"}}',
    );
    const commits: string[][] = [];
    const vault = createEncryptedSecretVault({
      cipher: createFakeCipher(true),
      documentCodec: {
        parse: (plaintext) => {
          const parsed = JSON.parse(plaintext) as {
            kind?: unknown;
            secrets?: Readonly<Record<string, string>>;
          };
          if (parsed.kind !== 'host.secretVault' || !parsed.secrets) {
            throw new Error('invalid host vault');
          }
          return parsed.secrets;
        },
        serialize: (secrets) => JSON.stringify({ kind: 'host.secretVault', secrets }),
      },
      readVault: async () => stored,
      writeVault: async (bytes, metadata) => {
        stored = bytes;
        commits.push([...metadata.secretIds]);
      },
    });

    await expect(vault.getSecret('token')).resolves.toBe('legacy-secret');
    await vault.setSecrets(
      new Map([
        ['zeta', 'z'],
        ['alpha', 'a'],
      ]),
    );

    expect(new TextDecoder().decode(stored)).toContain('"kind":"host.secretVault"');
    expect(commits).toEqual([['alpha', 'token', 'zeta']]);

    await vault.deleteSecret('token');
    await vault.deleteSecret('zeta');
    await vault.deleteSecret('alpha');
    expect(commits[commits.length - 1]).toEqual([]);
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

  it('queues reads behind pending writes', async () => {
    let stored: Uint8Array | null = null;
    const writeStarted = createDeferred();
    const releaseWrite = createDeferred();
    const vault = createMemoryVault({
      readVault: async () => stored,
      writeVault: async (bytes) => {
        writeStarted.resolve();
        await releaseWrite.promise;
        stored = bytes;
      },
    });

    const write = vault.setSecret('token', 'new-value');
    await writeStarted.promise;
    let readSettled = false;
    const read = vault.getSecret('token').then((value) => {
      readSettled = true;
      return value;
    });
    await Promise.resolve();
    expect(readSettled).toBe(false);

    releaseWrite.resolve();
    await expect(write).resolves.toBeUndefined();
    await expect(read).resolves.toBe('new-value');
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
