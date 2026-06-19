import { SidebarToolbar } from '../../layout/SidebarToolbar';
import { WorkbenchSidebarSection } from '../../layout/WorkbenchSidebarActions';
import { IconButton } from '../../primitives/IconButton';
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
}

export function WorkspaceExplorerPanel({
  'aria-label': ariaLabel,
  className,
  onNewFile,
  onNewFolder,
  onRefresh,
  refreshLabel = 'Refresh Explorer',
  sectionTitle = 'Workspace',
  ...explorerProps
}: WorkspaceExplorerPanelProps) {
  const headerActions =
    onNewFile || onNewFolder || onRefresh ? (
      <SidebarToolbar aria-label="Explorer actions" className="ui-explorer-action-bar" role="toolbar">
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
    ) : undefined;

  return (
    <WorkbenchSidebarSection
      actions={headerActions}
      aria-label={ariaLabel}
      className={cx('workbench-explorer-view', 'ui-workspace-explorer-panel', className)}
      id="workspace-explorer-section"
      title={sectionTitle}
    >
      <WorkspaceExplorer {...explorerProps} />
    </WorkbenchSidebarSection>
  );
}
