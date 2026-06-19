import type { ComponentPropsWithRef } from 'react';
import { SidebarToolbar } from '../../layout/SidebarToolbar';
import { IconButton } from '../../primitives/IconButton';
import { cx } from '../../utils/cx';

export interface ExplorerActionBarProps extends ComponentPropsWithRef<'div'> {
  onNewFile?: (() => void) | undefined;
  onNewFolder?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  refreshLabel?: string;
  toolbarLabel?: string;
}

export function ExplorerActionBar({
  className,
  onNewFile,
  onNewFolder,
  onRefresh,
  refreshLabel = 'Refresh Explorer',
  toolbarLabel = 'Explorer actions',
  ...props
}: ExplorerActionBarProps) {
  return (
    <SidebarToolbar
      aria-label={toolbarLabel}
      className={cx('ui-explorer-action-bar', className)}
      role="toolbar"
      {...props}
    >
      {onNewFile ? (
        <IconButton compact icon="codicon-new-file" label="New file" onClick={onNewFile} />
      ) : null}
      {onNewFolder ? (
        <IconButton compact icon="codicon-new-folder" label="New folder" onClick={onNewFolder} />
      ) : null}
      {onRefresh ? (
        <IconButton compact icon="codicon-refresh" label={refreshLabel} onClick={onRefresh} />
      ) : null}
    </SidebarToolbar>
  );
}
