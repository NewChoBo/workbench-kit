import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface WorkbenchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AbsoluteBoxProps {
  background?: string | undefined;
  children?: ReactNode;
  className?: string | undefined;
  overflow?: CSSProperties['overflow'] | undefined;
  rect: WorkbenchRect;
  style?: CSSProperties | undefined;
}

export function AbsoluteBox({
  background,
  children,
  className,
  overflow = 'hidden',
  rect,
  style,
}: AbsoluteBoxProps) {
  return (
    <div
      className={cx('ui-absolute-box', className)}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        overflow,
        backgroundColor: background,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
