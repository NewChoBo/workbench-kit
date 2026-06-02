import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

type ControlWidth = 'default' | 'wide' | 'full';

export interface TextInputProps extends ComponentPropsWithRef<'input'> {
  controlWidth?: ControlWidth;
  monospace?: boolean;
}

export function TextInput({
  className,
  controlWidth = 'default',
  monospace = false,
  ...props
}: TextInputProps) {
  return (
    <input
      className={cx('ui-input', monospace && 'ui-input--monospace', className)}
      data-width={controlWidth}
      {...props}
    />
  );
}
