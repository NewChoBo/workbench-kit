import type { ComponentPropsWithRef } from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

type IconButtonVariant = 'default' | 'danger';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  compact?: boolean | undefined;
  icon: string;
  label: string;
  variant?: IconButtonVariant;
}

export function IconButton({
  className,
  compact = false,
  icon,
  label,
  type = 'button',
  variant = 'default',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx('ui-icon-button', compact && 'ui-icon-button--compact', className)}
      data-variant={variant}
      title={label}
      type={type}
      {...props}
    >
      <i className={cxCodicon(icon)} />
    </button>
  );
}
