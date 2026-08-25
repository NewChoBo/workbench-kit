import {
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  writePersistedWorkbenchAppearance,
  type WorkbenchAppearanceSettings,
} from '@workbench-kit/shell-react';

import {
  SAMPLE_AUTH_BASIC_USERNAME,
  SAMPLE_AUTH_USERNAME,
  clearSampleAuthSession,
  resetSampleAuthSecretStorage,
  writeSampleAuthSession,
} from '../../dummy-backend/index.js';
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

export interface SampleAppearanceStorageWriteCounter {
  readonly count: number;
}

let restoreAppearanceStorageWriteCounter: (() => void) | undefined;

function stopSampleAppearanceStorageWriteCounter(): void {
  restoreAppearanceStorageWriteCounter?.();
  restoreAppearanceStorageWriteCounter = undefined;
}

/**
 * Deterministic storage reset for sample-host Storybook / future Playwright seeds.
 * Safe to call from story `render` (browser) only — no-ops when `window` is missing.
 *
 * Auth session seeds use in-memory {@link resetSampleAuthSecretStorage} /
 * {@link writeSampleAuthSession}, not `sessionStorage`.
 */
export function resetSampleHostStorage(account: SampleStoryAccount): void {
  if (typeof window === 'undefined') {
    return;
  }

  stopSampleAppearanceStorageWriteCounter();
  window.localStorage.removeItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY);
  window.localStorage.removeItem(DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY);
  window.localStorage.removeItem(SAMPLE_PERMISSION_ROLE_STORAGE_KEY);
  for (const storageAccount of ['anonymous', 'tester', 'basic']) {
    window.localStorage.removeItem(createSampleInstalledExtensionsStorageKey(storageAccount));
  }
  resetSampleAuthSecretStorage();

  if (account === 'none') {
    clearSampleAuthSession();
    return;
  }

  writeSampleAuthSession(account === 'tester' ? SAMPLE_AUTH_USERNAME : SAMPLE_AUTH_BASIC_USERNAME);
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

export function seedSampleWorkbenchAppearance(settings: WorkbenchAppearanceSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  writePersistedWorkbenchAppearance(settings);
}

/** Count actual appearance storage writes after a scenario has finished seeding. */
export function trackSampleAppearanceStorageWrites(): SampleAppearanceStorageWriteCounter {
  if (typeof window === 'undefined') {
    return Object.freeze({ count: 0 });
  }

  stopSampleAppearanceStorageWriteCounter();
  const storage = window.localStorage;
  const storagePrototype = Object.getPrototypeOf(storage) as object;
  const originalDescriptor = Object.getOwnPropertyDescriptor(storagePrototype, 'setItem');
  const originalSetItem = storage.setItem;
  const state = { count: 0 };

  Object.defineProperty(storagePrototype, 'setItem', {
    ...originalDescriptor,
    value(this: Storage, key: string, value: string) {
      if (this === storage && key === DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY) {
        state.count += 1;
      }
      return originalSetItem.call(this, key, value);
    },
  });

  restoreAppearanceStorageWriteCounter = () => {
    if (originalDescriptor === undefined) {
      Reflect.deleteProperty(storagePrototype, 'setItem');
    } else {
      Object.defineProperty(storagePrototype, 'setItem', originalDescriptor);
    }
  };

  return Object.freeze({
    get count() {
      return state.count;
    },
  });
}
