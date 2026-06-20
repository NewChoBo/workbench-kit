import type { ChangeEvent, ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode | undefined;
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

export function Checkbox({
  className,
  disabled,
  label,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(event.currentTarget.checked, event);
  };

  return (
    <label className={cx('ui-checkbox', className)} data-disabled={disabled ? 'true' : undefined}>
      <span className="ui-checkbox__control">
        <input
          className="ui-checkbox__input"
          disabled={disabled}
          type="checkbox"
          onChange={handleChange}
          {...props}
        />
        <span aria-hidden="true" className="ui-checkbox__indicator" />
      </span>
      {label !== undefined && label !== null && label !== '' ? (
        <span className="ui-checkbox__label">{label}</span>
      ) : null}
    </label>
  );
}
