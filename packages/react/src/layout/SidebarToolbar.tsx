import type { ToolbarProps } from '../primitives/Toolbar';
import { Toolbar } from '../primitives/Toolbar';
import { cx } from '../utils/cx';

export type SidebarToolbarProps = ToolbarProps;

export function SidebarToolbar({ className, ...props }: SidebarToolbarProps) {
  return <Toolbar className={cx('ui-sidebar-toolbar', className)} {...props} />;
}
