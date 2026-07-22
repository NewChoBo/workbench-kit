import {
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
} from '@workbench-kit/shell-react';

import { SAMPLE_AUTH_SESSION_KEY, SAMPLE_AUTH_USERNAME } from '../../dummy-backend/index.js';
import { createSampleInstalledExtensionsStorageKey } from '../../sample-installed-extension-storage.js';
import { SAMPLE_PERMISSION_ROLE_STORAGE_KEY } from '../../sample-permission-role-storage.js';

export type SampleStoryAccount = 'none' | 'tester' | 'basic';

export interface SampleInstalledExtensionSeed {
  readonly category: string;
  readonly enabled: boolean;
  readonly id: string;
  readonly installedAt: string;
  readonly manifestUrl: string;
}

/**
 * Deterministic storage reset for sample-host Storybook / future Playwright seeds.
 * Safe to call from story `render` (browser) only — no-ops when `window` is missing.
 */
export function resetSampleHostStorage(account: SampleStoryAccount): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY);
  window.localStorage.removeItem(DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY);
  window.localStorage.removeItem(SAMPLE_PERMISSION_ROLE_STORAGE_KEY);
  for (const storageAccount of ['anonymous', 'tester', 'basic']) {
    window.localStorage.removeItem(createSampleInstalledExtensionsStorageKey(storageAccount));
  }

  if (account === 'none') {
    window.sessionStorage.removeItem(SAMPLE_AUTH_SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(
    SAMPLE_AUTH_SESSION_KEY,
    account === 'tester' ? SAMPLE_AUTH_USERNAME : 'basic',
  );
}

export function seedSampleInstalledExtension(
  account: Exclude<SampleStoryAccount, 'none'>,
  record: SampleInstalledExtensionSeed,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    createSampleInstalledExtensionsStorageKey(account),
    JSON.stringify([record], null, 2),
  );
}
