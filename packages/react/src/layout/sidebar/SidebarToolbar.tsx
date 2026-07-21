import './sidebar-chrome.css';
import type { ToolbarProps } from '../../primitives/toolbar';
import { Toolbar } from '../../primitives/toolbar';
import { cx } from '../../utils/cx';

export type SidebarToolbarProps = ToolbarProps;

export function SidebarToolbar({ className, ...props }: SidebarToolbarProps) {
  return <Toolbar className={cx('ui-sidebar-toolbar', className)} {...props} />;
}
