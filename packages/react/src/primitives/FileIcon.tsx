import type { ComponentPropsWithRef } from 'react';
import type { FileIconKind } from '../icons/file-icon';
import { cxCodicon } from '../utils/codicon';

export const UI_FILE_ICON_CLASS = 'ui-file-icon';

export interface FileIconProps extends Omit<ComponentPropsWithRef<'i'>, 'children'> {
  icon: string;
  kind?: FileIconKind | undefined;
}

export function FileIcon({ className, icon, kind, ...props }: FileIconProps) {
  return (
    <i
      aria-hidden
      className={cxCodicon(icon, UI_FILE_ICON_CLASS, className)}
      data-file-kind={kind}
      {...props}
    />
  );
}
