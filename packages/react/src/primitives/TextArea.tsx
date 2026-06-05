import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { cx } from '../utils/cx';

type ControlWidth = 'default' | 'wide' | 'full';

export interface TextAreaProps extends ComponentPropsWithRef<'textarea'> {
  controlWidth?: ControlWidth;
  monospace?: boolean;
  resize?: CSSProperties['resize'] | undefined;
}

export function TextArea({
  className,
  controlWidth = 'default',
  monospace = false,
  resize,
  style,
  ...props
}: TextAreaProps) {
  const resolvedStyle =
    resize !== undefined
      ? {
          resize,
          ...style,
        }
      : style;

  return (
    <textarea
      className={cx('ui-textarea', monospace && 'ui-input--monospace', className)}
      data-width={controlWidth}
      style={resolvedStyle}
      {...props}
    />
  );
}
