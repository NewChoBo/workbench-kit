import { readWorkbenchStorageArray, writeWorkbenchStorageJson } from '../storage-adapters.js';
import type { WorkbenchStorageReader, WorkbenchStorageWriter } from '../storage.js';

export const DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY =
  'workbench-kit/.workbench/extension-install-trust' as const;

export interface ExtensionInstallTrustRecord {
  readonly extensionId: string;
  /** Stable fingerprint of approved permissions (sorted, unique). */
  readonly permissionFingerprint: string;
  readonly trustedAt: string;
}

export function createExtensionInstallPermissionFingerprint(
  permissions: readonly string[],
): string {
  return [...new Set(permissions.map((permission) => permission.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .join('\n');
}

export function isExtensionInstallTrusted(
  extensionId: string,
  permissions: readonly string[],
  trustRecords: readonly ExtensionInstallTrustRecord[],
): boolean {
  const fingerprint = createExtensionInstallPermissionFingerprint(permissions);
  if (!fingerprint) {
    return false;
  }

  return trustRecords.some(
    (record) => record.extensionId === extensionId && record.permissionFingerprint === fingerprint,
  );
}

export function recordExtensionInstallTrust(
  extensionId: string,
  permissions: readonly string[],
  currentRecords: readonly ExtensionInstallTrustRecord[],
  trustedAt: string = new Date().toISOString(),
): ExtensionInstallTrustRecord[] {
  const permissionFingerprint = createExtensionInstallPermissionFingerprint(permissions);
  if (!permissionFingerprint) {
    return [...currentRecords];
  }

  const nextRecord: ExtensionInstallTrustRecord = {
    extensionId,
    permissionFingerprint,
    trustedAt,
  };
  const without = currentRecords.filter(
    (record) =>
      !(
        record.extensionId === extensionId && record.permissionFingerprint === permissionFingerprint
      ),
  );
  return [...without, nextRecord];
}

export function revokeExtensionInstallTrust(
  extensionId: string,
  currentRecords: readonly ExtensionInstallTrustRecord[],
): ExtensionInstallTrustRecord[] {
  return currentRecords.filter((record) => record.extensionId !== extensionId);
}

export function loadExtensionInstallTrustRecords(
  storageKey: string = DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): ExtensionInstallTrustRecord[] {
  return readWorkbenchStorageArray(storageKey, normalizeTrustRecord, storage);
}

export function saveExtensionInstallTrustRecords(
  records: readonly ExtensionInstallTrustRecord[],
  storageKey: string = DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeWorkbenchStorageJson(storageKey, records, storage);
}

function normalizeTrustRecord(value: unknown): ExtensionInstallTrustRecord | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Partial<ExtensionInstallTrustRecord>;
  if (
    typeof record.extensionId !== 'string' ||
    typeof record.permissionFingerprint !== 'string' ||
    typeof record.trustedAt !== 'string' ||
    !record.extensionId ||
    !record.permissionFingerprint ||
    !record.trustedAt
  ) {
    return undefined;
  }

  return {
    extensionId: record.extensionId,
    permissionFingerprint: record.permissionFingerprint,
    trustedAt: record.trustedAt,
  };
}
