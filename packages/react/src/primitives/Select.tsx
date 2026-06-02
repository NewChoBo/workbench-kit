import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

type ControlWidth = 'default' | 'wide' | 'full';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  controlWidth?: ControlWidth;
}

export function Select({ className, controlWidth = 'default', ...props }: SelectProps) {
  return (
    <select
      className={cx('ui-select', className)}
      data-width={controlWidth}
      {...props}
    />
  );
}
