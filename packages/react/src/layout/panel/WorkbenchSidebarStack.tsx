import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../utils/cx';

import './workbench-sidebar-stack.css';

export type WorkbenchSidebarStackProps = ComponentPropsWithRef<'div'>;

/**
 * Column stack for authoring sidebars (metadata + outline, etc.).
 * Last child fills remaining height; earlier siblings keep intrinsic size.
 */
export function WorkbenchSidebarStack({ className, ...props }: WorkbenchSidebarStackProps) {
  return <div className={cx('ui-workbench-sidebar-stack', className)} {...props} />;
}
