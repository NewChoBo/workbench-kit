import type { ComponentPropsWithRef } from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  block?: boolean | undefined;
  compact?: boolean | undefined;
  icon?: string | undefined;
  secondary?: boolean | undefined;
  variant?: ButtonVariant;
}

export function Button({
  block = false,
  children,
  className,
  compact = false,
  icon,
  secondary: _secondary,
  type = 'button',
  variant = 'default',
  ...props
}: ButtonProps) {
  const iconClassName = cxCodicon(icon);

  return (
    <button
      className={cx(
        'ui-button',
        block && 'ui-button--block',
        compact && 'ui-button--compact',
        className,
      )}
      data-variant={variant}
      type={type}
      {...props}
    >
      {iconClassName ? <i className={iconClassName} aria-hidden /> : null}
      {children}
    </button>
  );
}
