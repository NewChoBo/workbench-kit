import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

export type StatusBarSeverity = 'error' | 'normal' | 'warning';
export type StatusBarSectionAlign = 'end' | 'start';

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

export interface StatusBarSectionProps extends ComponentPropsWithRef<'span'> {
  align?: StatusBarSectionAlign;
}

export function StatusBarSection({ align = 'start', className, ...props }: StatusBarSectionProps) {
  return (
    <span
      className={cx(
        'ui-status-bar__section',
        align === 'end' && 'ui-status-bar__section--end',
        className,
      )}
      {...props}
    />
  );
}

export type StatusBarLabelProps = ComponentPropsWithRef<'span'>;

export function StatusBarLabel({ className, ...props }: StatusBarLabelProps) {
  return <span className={cx('ui-status-bar__label', className)} {...props} />;
}
