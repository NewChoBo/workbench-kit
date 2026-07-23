import { createBrowserWorkbenchStorage } from '../storage-adapters.js';
import type {
  WorkbenchStorageAdapter,
  WorkbenchStorageReader,
  WorkbenchStorageWriter,
} from '../storage.js';
import {
  assertExtensionAllowlisted,
  type ExtensionEnterpriseAllowlistPolicy,
} from './enterprise-allowlist.js';

export const DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY =
  'workbench-kit/.workbench/installed-extensions' as const;

export type InstalledExtensionCategory = 'theme' | 'locale' | 'editor' | 'utility' | string;

export interface InstalledExtensionRecord {
  readonly category: InstalledExtensionCategory;
  readonly enabled: boolean;
  readonly id: string;
  readonly installedAt: string;
  readonly manifestUrl: string;
}

export interface ApplyExtensionInstallPlanToRecordsInput {
  /** Required when `plan.requiresApproval` is true; otherwise install is refused. */
  readonly approved?: boolean | undefined;
  /**
   * Optional enterprise id allowlist. When `allowedExtensionIds` is set, every
   * install/enable action (and the plan target) must pass
   * {@link assertExtensionAllowlisted}.
   */
  readonly allowlistPolicy?: ExtensionEnterpriseAllowlistPolicy | undefined;
  readonly currentRecords: readonly InstalledExtensionRecord[];
  readonly installSources: readonly ExtensionInstallPlanRecordSource[];
  readonly installedAt?: string | undefined;
  readonly plan: ExtensionInstallPlanRecordPlan;
}

export class ExtensionInstallApprovalRequiredError extends Error {
  readonly code = 'extension_install_approval_required' as const;

  constructor(message = 'Extension install requires explicit approval.') {
    super(message);
    this.name = 'ExtensionInstallApprovalRequiredError';
  }
}

export interface ExtensionInstallPlanRecordSource {
  readonly category: InstalledExtensionCategory;
  readonly id: string;
  readonly manifestUrl: string;
}

interface ExtensionInstallPlanRecordPlan {
  readonly actions: readonly {
    readonly extensionId: string;
    readonly kind: 'already-enabled' | 'enable' | 'install';
  }[];
  readonly blocked: boolean;
  readonly requiresApproval?: boolean | undefined;
}

export function isInstalledExtensionPersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadInstalledExtensions(
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): InstalledExtensionRecord[] {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return [];
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      const record = normalizeInstalledExtensionRecord(entry);
      return record ? [record] : [];
    });
  } catch {
    return [];
  }
}

export function saveInstalledExtensions(
  records: readonly InstalledExtensionRecord[],
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(records, null, 2));
}

/**
 * Privileged host/test helper: upserts an install record without an install plan
 * or approval gate.
 *
 * Marketplace and management UI installs must use
 * {@link applyExtensionInstallPlanToRecords} (with `approved` when the plan
 * requires approval). Prefer that path unless the host intentionally seeds or
 * migrates install state outside the catalog review flow.
 */
export function installExtensionRecord(
  record: Omit<InstalledExtensionRecord, 'installedAt'> & { installedAt?: string },
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: WorkbenchStorageAdapter,
): InstalledExtensionRecord[] {
  const current = loadInstalledExtensions(storageKey, storage);
  const nextRecord: InstalledExtensionRecord = {
    ...record,
    installedAt: record.installedAt ?? new Date().toISOString(),
  };
  const without = current.filter((entry) => entry.id !== nextRecord.id);
  const next = [...without, nextRecord];
  saveInstalledExtensions(next, storageKey, storage);
  return next;
}

export function applyExtensionInstallPlanToRecords({
  approved = false,
  allowlistPolicy,
  currentRecords,
  installSources,
  installedAt = new Date().toISOString(),
  plan,
}: ApplyExtensionInstallPlanToRecordsInput): InstalledExtensionRecord[] {
  if (plan.blocked) {
    return [...currentRecords];
  }

  if (plan.requiresApproval && !approved) {
    throw new ExtensionInstallApprovalRequiredError();
  }

  if (allowlistPolicy?.allowedExtensionIds !== undefined) {
    for (const action of plan.actions) {
      if (action.kind === 'already-enabled') {
        continue;
      }
      assertExtensionAllowlisted(action.extensionId, allowlistPolicy);
    }
  }

  const nextById = new Map(currentRecords.map((record) => [record.id, record]));
  const installSourcesById = new Map(installSources.map((source) => [source.id, source]));

  for (const action of plan.actions) {
    if (action.kind === 'already-enabled') {
      continue;
    }

    const current = nextById.get(action.extensionId);
    if (current) {
      nextById.set(action.extensionId, {
        ...current,
        enabled: true,
      });
      continue;
    }

    const source = installSourcesById.get(action.extensionId);
    if (!source) {
      continue;
    }

    nextById.set(action.extensionId, {
      category: source.category,
      enabled: true,
      id: source.id,
      installedAt,
      manifestUrl: source.manifestUrl,
    });
  }

  return [...nextById.values()];
}

export function toggleInstalledExtensionEnabled(
  extensionId: string,
  enabled: boolean,
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: WorkbenchStorageAdapter,
): InstalledExtensionRecord[] {
  const current = loadInstalledExtensions(storageKey, storage);
  const index = current.findIndex((entry) => entry.id === extensionId);
  if (index < 0) {
    return current;
  }

  const next = [...current];
  next[index] = { ...next[index], enabled };
  saveInstalledExtensions(next, storageKey, storage);
  return next;
}

export function getInstalledExtensionRecord(
  extensionId: string,
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): InstalledExtensionRecord | undefined {
  return loadInstalledExtensions(storageKey, storage).find((entry) => entry.id === extensionId);
}

function normalizeInstalledExtensionRecord(value: unknown): InstalledExtensionRecord | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Partial<InstalledExtensionRecord>;
  if (
    typeof record.id !== 'string' ||
    typeof record.manifestUrl !== 'string' ||
    typeof record.category !== 'string' ||
    typeof record.enabled !== 'boolean' ||
    typeof record.installedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    category: record.category,
    enabled: record.enabled,
    id: record.id,
    installedAt: record.installedAt,
    manifestUrl: record.manifestUrl,
  };
}

