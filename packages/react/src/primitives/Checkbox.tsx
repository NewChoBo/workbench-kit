import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode | undefined;
}

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label className={cx('ui-checkbox', className)}>
      <input type="checkbox" {...props} />
      {label !== undefined && label !== null && label !== '' ? <span>{label}</span> : null}
    </label>
  );
}
