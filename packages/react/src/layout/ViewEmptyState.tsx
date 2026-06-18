import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface ViewEmptyStateProps extends ComponentPropsWithRef<'p'> {
  children: ReactNode;
}

export function ViewEmptyState({ children, className, ...props }: ViewEmptyStateProps) {
  return (
    <p className={cx('ui-view-empty-state', className)} {...props}>
      {children}
    </p>
  );
}
