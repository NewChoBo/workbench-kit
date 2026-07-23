import './icon-button.css';
import type { ComponentPropsWithRef } from 'react';
import { WorkbenchIcon } from '../../icons/WorkbenchIcon';
import type { WorkbenchIconInput } from '../../icons/types';
import { cx } from '../../utils/cx';

type IconButtonVariant = 'default' | 'danger';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  compact?: boolean;
  icon: WorkbenchIconInput;
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
      <WorkbenchIcon icon={icon} />
    </button>
  );
}
