import { createContext, useContext, type ReactNode } from 'react';

import {
  resolveWorkbenchHostPlatform,
  type WorkbenchHostPlatform,
} from './workbenchPlatformChrome';

const WorkbenchPlatformContext = createContext<WorkbenchHostPlatform | null>(null);

export interface WorkbenchPlatformProviderProps {
  children: ReactNode;
  platform?: WorkbenchHostPlatform | undefined;
}

export function WorkbenchPlatformProvider({
  children,
  platform,
}: WorkbenchPlatformProviderProps): ReactNode {
  const resolvedPlatform = resolveWorkbenchHostPlatform(platform ?? null);

  return (
    <WorkbenchPlatformContext.Provider value={resolvedPlatform}>
      {children}
    </WorkbenchPlatformContext.Provider>
  );
}

export function useWorkbenchHostPlatform(): WorkbenchHostPlatform {
  const platformFromContext = useContext(WorkbenchPlatformContext);
  return resolveWorkbenchHostPlatform(platformFromContext);
}
