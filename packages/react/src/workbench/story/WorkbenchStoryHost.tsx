import type { ReactNode } from 'react';

import { WorkbenchThemeProvider } from '../WorkbenchThemeProvider';

export interface WorkbenchStoryHostProps {
  children: ReactNode;
  className?: string | undefined;
  theme?: string | undefined;
}

export function WorkbenchStoryHost({
  children,
  className = 'ui-workbench-host-root',
  theme = 'dark',
}: WorkbenchStoryHostProps) {
  return (
    <WorkbenchThemeProvider syncDocumentElement className={className} theme={theme}>
      {children}
    </WorkbenchThemeProvider>
  );
}
