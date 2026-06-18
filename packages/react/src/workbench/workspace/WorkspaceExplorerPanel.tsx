import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { cx } from '../../utils/cx';
import { ExplorerActionBar, type ExplorerActionBarLayout } from './ExplorerActionBar';
import { WorkspaceExplorer, type WorkspaceExplorerProps } from './WorkspaceExplorer';
import { useWorkspaceExplorerFilter } from './useWorkspaceExplorerFilter';

export interface WorkspaceExplorerPanelProps extends WorkspaceExplorerProps {
  className?: string;
  filterLabel?: string;
  filterPlaceholder?: string;
  onFilterQueryChange?: (query: string) => void;
  onNewFile?: (() => void) | undefined;
  onNewFolder?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  refreshLabel?: string;
  showFilter?: boolean;
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
  showFilter = true,
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

  return (
    <div className={cx('ui-workspace-explorer-panel', className)}>
      {showToolbar ? (
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
      <div className="ui-workspace-explorer-panel__tree">
        <WorkspaceExplorer filterQuery={filterQuery} {...explorerProps} />
      </div>
    </div>
  );
}
