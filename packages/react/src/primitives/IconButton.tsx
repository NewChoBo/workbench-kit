import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

type IconButtonVariant = 'default' | 'danger';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  icon: string;
  label: string;
  variant?: IconButtonVariant;
}

export function IconButton({
  className,
  icon,
  label,
  type = 'button',
  variant = 'default',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx('ui-icon-button', className)}
      data-variant={variant}
      title={label}
      type={type}
      {...props}
    >
      <i className={`codicon ${icon}`} />
    </button>
  );
}
