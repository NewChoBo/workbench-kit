import type { ComponentPropsWithRef } from 'react';
import { cxCodicon } from '../../utils/codicon';

export interface CodiconProps extends Omit<ComponentPropsWithRef<'i'>, 'children'> {
  icon: string;
  /** When set, exposes the icon to assistive tech instead of aria-hidden. */
  label?: string;
}

/** VS Code codicon glyph (`codicon` font). Requires `@vscode/codicons` CSS in the app entry. Prefer `WorkbenchIcon` for new code. */
export function Codicon({ className, icon, label, ...props }: CodiconProps) {
  return (
    <i
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cxCodicon(icon, className)}
      {...props}
    />
  );
}
