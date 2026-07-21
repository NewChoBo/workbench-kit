import {
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  type WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';

const SAMPLE_INSTALLED_EXTENSIONS_STORAGE_SCOPE = 'workbench-sample';
const ANONYMOUS_SAMPLE_ACCOUNT_ID = 'anonymous';

export function createSampleInstalledExtensionsStorageKey(accountId: string | undefined): string {
  const normalizedAccountId =
    typeof accountId === 'string' && accountId.trim().length > 0
      ? accountId.trim()
      : ANONYMOUS_SAMPLE_ACCOUNT_ID;

  return [
    DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
    SAMPLE_INSTALLED_EXTENSIONS_STORAGE_SCOPE,
    encodeURIComponent(normalizedAccountId),
  ].join('/');
}

export function getSampleInstalledExtensionsStorage(): WorkbenchStorageAdapter | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
