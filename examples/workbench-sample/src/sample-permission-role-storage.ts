import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

export const SAMPLE_PERMISSION_ROLE_STORAGE_KEY = 'workbench-kit/.workbench/sample-permission-role';

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

export function isSamplePermissionRoleOverride(
  value: unknown,
): value is SamplePermissionRoleOverride {
  return value === null || isCanonicalSamplePermissionRole(value);
}

export function readPersistedSamplePermissionRoleOverride(
  storageKey = SAMPLE_PERMISSION_ROLE_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem'>,
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
    return isSamplePermissionRoleOverride(parsed) ? parsed : null;
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
