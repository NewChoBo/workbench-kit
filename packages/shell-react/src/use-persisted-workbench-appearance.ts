import { useEffect, useState } from 'react';
import type { WorkbenchStorageAdapter } from '@workbench-kit/workbench-core';

import {
  readPersistedWorkbenchAppearance,
  writePersistedWorkbenchAppearance,
  type WorkbenchAppearanceSettings,
} from './workbench-appearance-storage.js';

export interface UsePersistedWorkbenchAppearanceOptions {
  persist?: boolean | undefined;
  storage?: WorkbenchStorageAdapter | undefined;
  storageKey?: string | undefined;
}

export function usePersistedWorkbenchAppearance(
  options: UsePersistedWorkbenchAppearanceOptions = {},
): [WorkbenchAppearanceSettings, (settings: WorkbenchAppearanceSettings) => void] {
  const { persist = true, storage, storageKey } = options;
  const [appearance, setAppearance] = useState(() =>
    readPersistedWorkbenchAppearance(storageKey, storage),
  );

  useEffect(() => {
    if (!persist) {
      return;
    }

    writePersistedWorkbenchAppearance(appearance, storageKey, storage);
  }, [appearance, persist, storage, storageKey]);

  return [appearance, setAppearance];
}
