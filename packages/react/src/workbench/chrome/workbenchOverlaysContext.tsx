import { createContext, useContext, type ReactNode } from 'react';

const WorkbenchOverlaysContext = createContext<HTMLElement | null>(null);

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

export function useWorkbenchOverlaysContainer(): HTMLElement | null {
  return useContext(WorkbenchOverlaysContext);
}
