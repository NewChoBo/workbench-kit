import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { WorkbenchSidebarSection } from '../../layout/WorkbenchSidebarActions';
import { cx } from '../../utils/cx';
import { ExplorerActionBar, type ExplorerActionBarLayout } from './ExplorerActionBar';
import { WorkspaceExplorer, type WorkspaceExplorerProps } from './WorkspaceExplorer';
import { useWorkspaceExplorerFilter } from './useWorkspaceExplorerFilter';

export interface WorkspaceExplorerPanelProps extends WorkspaceExplorerProps {
  className?: string | undefined;
  filterLabel?: string;
  filterPlaceholder?: string;
  onFilterQueryChange?: (query: string) => void;
  onNewFile?: (() => void) | undefined;
  onNewFolder?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  refreshLabel?: string;
  sectionTitle?: string;
  showFilter?: boolean;
  showSection?: boolean;
  toolbarLayout?: ExplorerActionBarLayout | 'none';
}

export function WorkspaceExplorerPanel({
  className,
  filterLabel = 'Filter workspace',
  filterPlaceholder = 'Filter',
  filterQuery: filterQueryProp,
  onFilterQueryChange,
  onNewFile,
  onNewFolder,
  onRefresh,
  refreshLabel,
  sectionTitle = 'Workspace',
  showFilter = false,
  showSection = true,
  toolbarLayout = 'bar',
  ...explorerProps
}: WorkspaceExplorerPanelProps) {
  const uncontrolledFilter = useWorkspaceExplorerFilter();
  const filterQuery = filterQueryProp ?? uncontrolledFilter.filterQuery;
  const setFilterQuery = onFilterQueryChange ?? uncontrolledFilter.setFilterQuery;
  const clearFilter = onFilterQueryChange
    ? () => onFilterQueryChange('')
    : uncontrolledFilter.clearFilter;

  const showToolbar =
    toolbarLayout !== 'none' && (onNewFile || onNewFolder || onRefresh);
  const headerActions = showToolbar ? (
    <ExplorerActionBar
      layout="inline"
      onNewFile={onNewFile}
      onNewFolder={onNewFolder}
      onRefresh={onRefresh}
      refreshLabel={refreshLabel}
    />
  ) : undefined;

  const tree = <WorkspaceExplorer filterQuery={filterQuery} {...explorerProps} />;

  return (
    <div className={cx('ui-workspace-explorer-panel', className)}>
      {showToolbar && !showSection ? (
        <ExplorerActionBar
          layout={toolbarLayout}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onRefresh={onRefresh}
          refreshLabel={refreshLabel}
        />
      ) : null}
      {showFilter ? (
        <div className="ui-workspace-explorer-panel__filter">
          <ClearableTextInput
            aria-label={filterLabel}
            clearLabel={`Clear ${filterLabel.toLowerCase()}`}
            controlWidth="full"
            placeholder={filterPlaceholder}
            value={filterQuery}
            onClear={clearFilter}
            onChange={(event) => setFilterQuery(event.currentTarget.value)}
          />
        </div>
      ) : null}
      {showSection ? (
        <WorkbenchSidebarSection
          actions={headerActions}
          className="ui-workspace-explorer-panel__section"
          id="workspace-explorer-section"
          title={sectionTitle}
        >
          {tree}
        </WorkbenchSidebarSection>
      ) : (
        tree
      )}
    </div>
  );
}
