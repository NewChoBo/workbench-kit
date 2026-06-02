import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';

export type ToolbarProps = ComponentPropsWithRef<'div'>;

export function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cx('ui-toolbar', className)} {...props} />;
}
