import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

type BadgeVariant = 'accent' | 'muted' | 'danger';

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'accent', ...props }: BadgeProps) {
  return <span className={cx('ui-badge', className)} data-variant={variant} {...props} />;
}
