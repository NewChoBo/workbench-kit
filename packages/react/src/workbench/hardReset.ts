import { clearBrowserStorageByPrefixes, type BrowserStorageKind } from '@workbench-kit/platform';

export const DEFAULT_WORKBENCH_STORAGE_PREFIX = 'workbench-kit';

export const DEFAULT_WORKBENCH_HARD_RESET_CONFIRM_MESSAGE =
  'Clears persisted workbench browser storage and reloads the page.\n\nContinue?';

export interface WorkbenchHardResetOptions {
  /** Storage key prefixes to remove. Defaults to [DEFAULT_WORKBENCH_STORAGE_PREFIX]. */
  storagePrefixes?: readonly string[];
  /** Which browser storages to scan. Defaults to local + session. */
  storageKinds?: readonly BrowserStorageKind[];
  /** When true (default), asks for confirmation before clearing. */
  confirm?: boolean;
  confirmMessage?: string;
  /** Host hook for in-memory caches before storage is cleared. */
  beforeReset?: () => void | Promise<void>;
  /** Reload after reset. Defaults to true. */
  reload?: boolean;
}

function confirmHardReset(message: string): boolean {
  if (typeof globalThis.confirm !== 'function') {
    return true;
  }

  return globalThis.confirm(message);
}

function reloadHostPage(): void {
  if (typeof globalThis.location?.reload === 'function') {
    globalThis.location.reload();
  }
}

/**
 * Clears browser storage for the configured prefixes and reloads the host page
 * so workbench state rehydrates from defaults.
 */
export async function performWorkbenchHardReset(
  options: WorkbenchHardResetOptions = {},
): Promise<boolean> {
  const {
    storagePrefixes = [DEFAULT_WORKBENCH_STORAGE_PREFIX],
    storageKinds,
    confirm = true,
    confirmMessage = DEFAULT_WORKBENCH_HARD_RESET_CONFIRM_MESSAGE,
    beforeReset,
    reload = true,
  } = options;

  if (confirm && !confirmHardReset(confirmMessage)) {
    return false;
  }

  await beforeReset?.();
  clearBrowserStorageByPrefixes(storagePrefixes, { kinds: storageKinds });

  if (reload) {
    reloadHostPage();
  }

  return true;
}
