import type { ChangeEvent, ComponentPropsWithRef } from 'react';
import type { ControlWidth } from './TextInput';
import { cx } from '../utils/cx';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  controlWidth?: ControlWidth;
  onValueChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
}

export function Select({
  className,
  controlWidth = 'default',
  onChange,
  onValueChange,
  ...props
}: SelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event);
    onValueChange?.(event.currentTarget.value, event);
  };

  return (
    <select
      className={cx('ui-select', className)}
      data-width={controlWidth}
      onChange={handleChange}
      {...props}
    />
  );
}
