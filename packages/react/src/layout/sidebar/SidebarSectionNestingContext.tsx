import { createContext, useContext, type ReactNode } from 'react';

const SidebarSectionNestingContext = createContext(0);

export function useSidebarSectionBaseDepth(): number {
  return useContext(SidebarSectionNestingContext);
}

export function SidebarSectionNestingProvider({
  baseDepth,
  children,
}: {
  baseDepth: number;
  children: ReactNode;
}) {
  return (
    <SidebarSectionNestingContext.Provider value={baseDepth}>
      {children}
    </SidebarSectionNestingContext.Provider>
  );
}
