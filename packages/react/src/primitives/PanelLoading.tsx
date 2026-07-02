import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface PanelLoadingProps extends ComponentPropsWithRef<'div'> {
  label: ReactNode;
  showSpinner?: boolean;
}

export function PanelLoading({
  className,
  label,
  showSpinner = true,
  ...props
}: PanelLoadingProps) {
  return (
    <div
      aria-live="polite"
      className={cx('ui-panel-loading', 'ui-panel-centered-state', className)}
      role="status"
      {...props}
    >
      {showSpinner ? (
        <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
      ) : null}
      <span>{label}</span>
    </div>
  );
}
