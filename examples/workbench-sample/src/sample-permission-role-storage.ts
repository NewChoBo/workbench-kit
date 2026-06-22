import {
  normalizeWorkbenchPermissionRole,
  type WorkbenchPermissionRole,
  type WorkbenchPermissionRoleInput,
} from '@workbench-kit/platform';

export const SAMPLE_PERMISSION_ROLE_STORAGE_KEY =
  'workbench-kit/.workbench/sample-permission-role';

/** `null` means follow the signed-in account role. */
export type SamplePermissionRoleOverride = WorkbenchPermissionRole | null;

const CANONICAL_SAMPLE_PERMISSION_ROLES = [
  'owner',
  'maintainer',
  'developer',
  'reporter',
  'viewer',
] as const satisfies readonly WorkbenchPermissionRole[];

function isCanonicalSamplePermissionRole(value: unknown): value is WorkbenchPermissionRole {
  return (
    typeof value === 'string' &&
    (CANONICAL_SAMPLE_PERMISSION_ROLES as readonly string[]).includes(value)
  );
}

function isDeprecatedSamplePermissionRoleAlias(
  value: unknown,
): value is WorkbenchPermissionRoleInput {
  return value === 'admin' || value === 'basic';
}

export function isSamplePermissionRoleOverride(
  value: unknown,
): value is SamplePermissionRoleOverride {
  return value === null || isCanonicalSamplePermissionRole(value);
}

export function migratePersistedSamplePermissionRoleOverride(
  value: unknown,
): SamplePermissionRoleOverride {
  if (value === null) {
    return null;
  }

  if (isCanonicalSamplePermissionRole(value)) {
    return value;
  }

  if (isDeprecatedSamplePermissionRoleAlias(value)) {
    return normalizeWorkbenchPermissionRole(value);
  }

  return null;
}

export function readPersistedSamplePermissionRoleOverride(
  storageKey = SAMPLE_PERMISSION_ROLE_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): SamplePermissionRoleOverride {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return null;
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    const migrated = migratePersistedSamplePermissionRoleOverride(parsed);
    if (!isSamplePermissionRoleOverride(migrated)) {
      return null;
    }

    if (isDeprecatedSamplePermissionRoleAlias(parsed) && migrated !== null) {
      resolvedStorage.setItem(storageKey, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return null;
  }
}

export function writePersistedSamplePermissionRoleOverride(
  roleOverride: SamplePermissionRoleOverride,
  storageKey = SAMPLE_PERMISSION_ROLE_STORAGE_KEY,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(roleOverride));
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
