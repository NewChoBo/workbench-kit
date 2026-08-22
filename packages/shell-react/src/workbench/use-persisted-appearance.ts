import { useCallback, useEffect, useState } from 'react';
import type {
  WorkbenchPersistenceDiagnosticHandler,
  WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';

import {
  readPersistedWorkbenchAppearanceResult,
  writePersistedWorkbenchAppearanceResult,
  type WorkbenchAppearanceSettings,
} from './appearance-storage.js';
import {
  reportPersistenceWriteResult,
  usePersistenceDiagnosticHandlerRef,
  useReportPersistenceReadDiagnostic,
} from '../storage/persistence-diagnostics.js';

export interface UsePersistedWorkbenchAppearanceOptions {
  onPersistenceDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
  persist?: boolean | undefined;
  storage?: WorkbenchStorageAdapter | undefined;
  storageKey?: string | undefined;
}

interface PersistedWorkbenchAppearanceState {
  readonly appearance: WorkbenchAppearanceSettings;
  readonly writeEligible: boolean;
}

export function usePersistedWorkbenchAppearance(
  options: UsePersistedWorkbenchAppearanceOptions = {},
): [WorkbenchAppearanceSettings, (settings: WorkbenchAppearanceSettings) => void] {
  const { onPersistenceDiagnostic, persist = true, storage, storageKey } = options;
  const [initialRead] = useState(() => readPersistedWorkbenchAppearanceResult(storageKey, storage));
  const [state, setState] = useState<PersistedWorkbenchAppearanceState>(() => ({
    appearance: initialRead.value,
    writeEligible: initialRead.diagnostic === undefined,
  }));
  const diagnosticHandlerRef = usePersistenceDiagnosticHandlerRef(onPersistenceDiagnostic);

  useReportPersistenceReadDiagnostic(initialRead.diagnostic, [], diagnosticHandlerRef);

  useEffect(() => {
    if (!persist || !state.writeEligible) {
      return;
    }

    reportPersistenceWriteResult(
      writePersistedWorkbenchAppearanceResult(state.appearance, storageKey, storage),
      diagnosticHandlerRef,
    );
  }, [diagnosticHandlerRef, persist, state, storage, storageKey]);

  const setAppearance = useCallback((appearance: WorkbenchAppearanceSettings) => {
    setState({ appearance, writeEligible: true });
  }, []);

  return [state.appearance, setAppearance];
}
