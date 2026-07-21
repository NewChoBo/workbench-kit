import { createContext, useContext, type ReactNode } from 'react';
import type { WorkbenchIconResolver } from './types';

export interface WorkbenchIconProviderProps {
  children: ReactNode;
  /**
   * When set, maps string icon ids to render output.
   * Unhandled ids should fall back to codicon rendering (see `WorkbenchIcon`).
   */
  resolveStringIcon?: WorkbenchIconResolver | undefined;
}

const WorkbenchIconContext = createContext<WorkbenchIconResolver | undefined>(undefined);

export function WorkbenchIconProvider({ children, resolveStringIcon }: WorkbenchIconProviderProps) {
  return (
    <WorkbenchIconContext.Provider value={resolveStringIcon}>
      {children}
    </WorkbenchIconContext.Provider>
  );
}

export function useWorkbenchIconResolver(): WorkbenchIconResolver | undefined {
  return useContext(WorkbenchIconContext);
}
