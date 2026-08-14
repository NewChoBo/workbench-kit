import { createContext, useContext } from 'react';
import type { WorkbenchPersistenceDiagnosticHandler } from '@workbench-kit/workbench-core';

export const WorkbenchPersistenceDiagnosticContext = createContext<
  WorkbenchPersistenceDiagnosticHandler | undefined
>(undefined);

export function useWorkbenchPersistenceDiagnosticHandler():
  WorkbenchPersistenceDiagnosticHandler | undefined {
  return useContext(WorkbenchPersistenceDiagnosticContext);
}
