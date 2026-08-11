import type { ReactNode } from 'react';

export type ContextMenuItem =
  | {
      type: 'separator';
      id?: string | undefined;
    }
  | {
      type?: 'item';
      id?: string | undefined;
      label: ReactNode;
      icon?: string | undefined;
      shortcut?: ReactNode | undefined;
      disabled?: boolean | undefined;
      danger?: boolean | undefined;
      onSelect: () => void;
    };
