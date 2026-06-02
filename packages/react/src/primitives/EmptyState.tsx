import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface EmptyStateProps extends ComponentPropsWithRef<'div'> {
  compact?: boolean;
  icon: string;
  children: ReactNode;
}

export function EmptyState({
  children,
  className,
  compact = false,
  icon,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cx('ui-empty-state', compact && 'ui-empty-state--compact', className)} {...props}>
      <i className={`codicon ${icon}`} />
      <span>{children}</span>
    </div>
  );
}
