import type { ChangeEvent, ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

export type ControlWidth = 'default' | 'wide' | 'full';

export interface TextInputProps extends ComponentPropsWithRef<'input'> {
  controlWidth?: ControlWidth;
  monospace?: boolean;
  onValueChange?: ((value: string, event: ChangeEvent<HTMLInputElement>) => void) | undefined;
}

export function TextInput({
  className,
  controlWidth = 'default',
  monospace = false,
  onChange,
  onValueChange,
  ...props
}: TextInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onValueChange?.(event.currentTarget.value, event);
  };

  return (
    <input
      className={cx('ui-input', monospace && 'ui-input--monospace', className)}
      data-width={controlWidth}
      onChange={handleChange}
      {...props}
    />
  );
}
