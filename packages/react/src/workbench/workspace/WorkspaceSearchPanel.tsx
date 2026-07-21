import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { SideBarHeaderControl, SideBarViewFrame, SidebarToolbar } from '../../layout/sidebar';
import { Badge } from '../../primitives/badge';
import { ClearableTextInput } from '../../primitives/clearable-text-input';
import { EmptyState } from '../../primitives/empty-state';
import { IconButton } from '../../primitives/icon-button';
import { cx } from '../../utils/cx';
import { WorkspaceSearchResults } from './WorkspaceSearchResults';
import type { WorkspaceSearchResult } from './types';

export interface WorkspaceSearchPanelProps {
  activePath?: string;
  'aria-label'?: string | undefined;
  className?: string | undefined;
  compactRows?: boolean;
  emptyQueryLabel?: ReactNode;
  noResultsLabel?: ReactNode;
  onActivateResult: (result: WorkspaceSearchResult) => void;
  onQueryChange: (query: string) => void;
  onRefresh?: () => void;
  onResultContextMenu?: (event: MouseEvent<HTMLElement>, result: WorkspaceSearchResult) => void;
  placeholder?: string;
  query: string;
  results: WorkspaceSearchResult[];
  searchLabel?: string;
  title?: ReactNode;
}

export function WorkspaceSearchPanel({
  activePath,
  'aria-label': ariaLabel = 'Workspace Search',
  className,
  compactRows,
  emptyQueryLabel = 'Type to search files',
  noResultsLabel = 'No results',
  onActivateResult,
  onQueryChange,
  onRefresh,
  onResultContextMenu,
  placeholder = 'Search',
  query,
  results,
  searchLabel = 'Search workspace',
  title = 'Search',
}: WorkspaceSearchPanelProps) {
  const hasQuery = Boolean(query.trim());
  const visibleResults = hasQuery ? results : [];
  const resultLabel = `${visibleResults.length} ${visibleResults.length === 1 ? 'result' : 'results'}`;

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (visibleResults[0]) {
        event.preventDefault();
        onActivateResult(visibleResults[0]);
      }
      return;
    }

    if (event.key === 'Escape' && query) {
      event.preventDefault();
      onQueryChange('');
      return;
    }
  };

  return (
    <SideBarViewFrame
      aria-label={ariaLabel}
      className={cx('ui-workspace-search-panel', className)}
      title={title}
      actions={
        <SidebarToolbar>
          <Badge variant="muted">{resultLabel}</Badge>
          {onRefresh ? (
            <IconButton icon="codicon-refresh" label="Refresh results" onClick={onRefresh} />
          ) : null}
        </SidebarToolbar>
      }
      headerAddon={
        <SideBarHeaderControl>
          <div className="workbench-search-control">
            <ClearableTextInput
              aria-label={searchLabel}
              clearLabel="Clear search"
              controlWidth="full"
              placeholder={placeholder}
              value={query}
              onClear={() => onQueryChange('')}
              onChange={(event) => onQueryChange(event.currentTarget.value)}
              onKeyDown={handleQueryKeyDown}
            />
          </div>
        </SideBarHeaderControl>
      }
    >
      {!hasQuery ? (
        <EmptyState compact icon="codicon-search">
          {emptyQueryLabel}
        </EmptyState>
      ) : visibleResults.length > 0 ? (
        <WorkspaceSearchResults
          activePath={activePath}
          compactRows={compactRows}
          query={query}
          results={visibleResults}
          onActivateResult={onActivateResult}
          onResultContextMenu={onResultContextMenu}
        />
      ) : (
        <EmptyState compact icon="codicon-search">
          {noResultsLabel}
        </EmptyState>
      )}
    </SideBarViewFrame>
  );
}
