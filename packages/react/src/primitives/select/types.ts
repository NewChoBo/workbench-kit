import type { ReactNode } from 'react';

export interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export type ListboxPlacement = 'bottom' | 'top';

export interface OverlayPosition {
  left: number;
  maxHeight: number;
  placement: ListboxPlacement;
  triggerBottom: number;
  triggerTop: number;
  width: number;
}
