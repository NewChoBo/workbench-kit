import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

export type StatusBarSeverity = 'error' | 'normal' | 'warning';

export interface StatusBarProps extends ComponentPropsWithRef<'footer'> {
  severity?: StatusBarSeverity;
}

export function StatusBar({ className, severity = 'normal', ...props }: StatusBarProps) {
  return (
    <footer
      className={cx(
        'ui-status-bar',
        severity !== 'normal' && `ui-status-bar--${severity}`,
        className,
      )}
      data-severity={severity}
      {...props}
    />
  );
}
