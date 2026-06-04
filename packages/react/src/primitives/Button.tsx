import type { ComponentPropsWithRef } from 'react';
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
  const iconClassName = icon ? (icon.startsWith('codicon-') ? icon : `codicon-${icon}`) : null;

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
      {iconClassName ? <i className={`codicon ${iconClassName}`} aria-hidden /> : null}
      {children}
    </button>
  );
}
