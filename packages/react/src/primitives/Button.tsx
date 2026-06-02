import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ className, type = 'button', variant = 'default', ...props }: ButtonProps) {
  return (
    <button className={cx('ui-button', className)} data-variant={variant} type={type} {...props} />
  );
}
