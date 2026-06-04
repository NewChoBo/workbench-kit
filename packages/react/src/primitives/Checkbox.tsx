import type { ChangeEvent, ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode | undefined;
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

export function Checkbox({ className, label, onChange, onCheckedChange, ...props }: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(event.currentTarget.checked, event);
  };

  return (
    <label className={cx('ui-checkbox', className)}>
      <input type="checkbox" onChange={handleChange} {...props} />
      {label !== undefined && label !== null && label !== '' ? <span>{label}</span> : null}
    </label>
  );
}
