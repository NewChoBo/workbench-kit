import { createContext, useContext, type ReactNode } from 'react';

const WorkbenchOverlaysContext = createContext<HTMLElement | null | undefined>(undefined);

export function WorkbenchOverlaysProvider({
  children,
  container,
}: {
  children: ReactNode;
  container: HTMLElement | null;
}): ReactNode {
  return (
    <WorkbenchOverlaysContext.Provider value={container}>
      {children}
    </WorkbenchOverlaysContext.Provider>
  );
}

export function useWorkbenchOverlaysContainer(): HTMLElement | null | undefined {
  return useContext(WorkbenchOverlaysContext);
}
