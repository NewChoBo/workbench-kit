import type { WorkbenchSecretStorageNamespace, WorkbenchSecretStorageService } from './types.js';

/**
 * In-memory {@link WorkbenchSecretStorageService} for tests and ephemeral hosts.
 *
 * Secrets stay in process memory only — never written to `localStorage` /
 * `sessionStorage`. Prefer `@workbench-kit/electron-shell`
 * `createEncryptedSecretVault` (or a host vault adapter) for durable secrets.
 */
export function createMemorySecretStorage(): WorkbenchSecretStorageService {
  const byExtension = new Map<string, Map<string, string>>();

  return {
    forExtension(extensionId: string): WorkbenchSecretStorageNamespace {
      const resolvedExtensionId = extensionId.trim();
      if (!resolvedExtensionId) {
        throw new Error('Secret storage extension id must be a non-empty string.');
      }

      return {
        get(key: string) {
          return byExtension.get(resolvedExtensionId)?.get(key);
        },
        set(key: string, value: string) {
          let bag = byExtension.get(resolvedExtensionId);
          if (!bag) {
            bag = new Map();
            byExtension.set(resolvedExtensionId, bag);
          }
          bag.set(key, value);
        },
        delete(key: string) {
          byExtension.get(resolvedExtensionId)?.delete(key);
        },
      };
    },
  };
}
