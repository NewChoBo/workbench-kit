import type { ReactNode } from 'react';
import { SideBarViewFrame, SidebarToolbar, WorkbenchSidebarSection } from '../../layout/sidebar';
import { IconButton } from '../../primitives/icon-button';
import { cx } from '../../utils/cx';
import { WorkspaceExplorer, type WorkspaceExplorerProps } from './WorkspaceExplorer';

export interface WorkspaceExplorerPanelProps extends WorkspaceExplorerProps {
  'aria-label'?: string | undefined;
  className?: string | undefined;
  onNewFile?: (() => void) | undefined;
  onNewFolder?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  refreshLabel?: string;
  sectionTitle?: string;
  title?: string;
  toolbarLeading?: ReactNode;
  toolbarStatus?: ReactNode;
  toolbarTrailing?: ReactNode;
}

export function WorkspaceExplorerPanel({
  'aria-label': ariaLabel,
  className,
  onNewFile,
  onNewFolder,
  onRefresh,
  refreshLabel = 'Refresh Explorer',
  sectionTitle = 'Workspace',
  title = 'Explorer',
  toolbarLeading,
  toolbarStatus,
  toolbarTrailing,
  ...explorerProps
}: WorkspaceExplorerPanelProps) {
  const hasDefaultActions = Boolean(onNewFile || onNewFolder || onRefresh);
  const hasToolbarSlots = Boolean(toolbarLeading || toolbarTrailing || toolbarStatus);
  const headerActions =
    hasDefaultActions || hasToolbarSlots ? (
      <SidebarToolbar
        aria-label="Explorer actions"
        className="ui-explorer-action-bar"
        role="toolbar"
      >
        {toolbarLeading}
        {onNewFile ? (
          <IconButton compact icon="codicon-new-file" label="New file" onClick={onNewFile} />
        ) : null}
        {onNewFolder ? (
          <IconButton compact icon="codicon-new-folder" label="New folder" onClick={onNewFolder} />
        ) : null}
        {onRefresh ? (
          <IconButton compact icon="codicon-refresh" label={refreshLabel} onClick={onRefresh} />
        ) : null}
        {toolbarTrailing}
        {toolbarStatus ? (
          <span className="ui-explorer-action-bar__status">{toolbarStatus}</span>
        ) : null}
      </SidebarToolbar>
    ) : undefined;

  return (
    <SideBarViewFrame
      actions={headerActions}
      aria-label={ariaLabel}
      className={cx('workbench-explorer-view', 'ui-workspace-explorer-panel', className)}
      title={title}
    >
      <WorkbenchSidebarSection id="workspace-explorer-section" title={sectionTitle}>
        <WorkspaceExplorer {...explorerProps} />
      </WorkbenchSidebarSection>
    </SideBarViewFrame>
  );
}
