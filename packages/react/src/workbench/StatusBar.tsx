import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface StatusBarProps extends ComponentPropsWithRef<'footer'> {
  compact?: boolean;
}

export function StatusBar({
  'aria-label': ariaLabel = 'Status bar',
  children,
  className,
  compact,
  ...props
}: StatusBarProps) {
  return (
    <footer
      aria-label={ariaLabel}
      className={cx(
        'ui-workbench-status-bar',
        compact && 'ui-workbench-status-bar--compact',
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}

export interface StatusBarSectionProps extends ComponentPropsWithRef<'div'> {
  align?: 'start' | 'end';
}

export function StatusBarSection({ align = 'start', className, ...props }: StatusBarSectionProps) {
  return (
    <div
      className={cx(
        'ui-workbench-status-bar__section',
        align === 'end' && 'ui-workbench-status-bar__section--end',
        className,
      )}
      {...props}
    />
  );
}

export interface StatusBarItemProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
  icon?: ReactNode;
}

export function StatusBarItem({
  active,
  children,
  className,
  icon,
  type = 'button',
  ...props
}: StatusBarItemProps) {
  return (
    <button
      type={type}
      className={cx(
        'ui-workbench-status-bar__item',
        active && 'ui-workbench-status-bar__item--active',
        className,
      )}
      data-active={active ? 'true' : undefined}
      {...props}
    >
      {icon ? <span className="ui-workbench-status-bar__icon">{icon}</span> : null}
      <span className="ui-workbench-status-bar__label">{children}</span>
    </button>
  );
}
