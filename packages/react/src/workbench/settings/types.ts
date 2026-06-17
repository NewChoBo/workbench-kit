import type { ReactNode } from 'react';

export interface WorkbenchSettingsCategory {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
  title?: string;
}

export interface WorkbenchSettingsScope {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
}
