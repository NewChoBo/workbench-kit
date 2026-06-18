import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { SideBarHeaderControl, SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { Badge } from '../../primitives/Badge';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { TextInput } from '../../primitives/TextInput';
import { Toolbar } from '../../primitives/Toolbar';
import { WorkspaceSearchResults } from './WorkspaceSearchResults';
import type { WorkspaceSearchResult } from './types';

export interface WorkspaceSearchPanelProps {
  activePath?: string;
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
    }
  };

  return (
    <SideBarViewFrame
      title={title}
      actions={
        <Toolbar>
          <Badge variant="muted">{resultLabel}</Badge>
          {onRefresh ? (
            <IconButton icon="codicon-refresh" label="Refresh results" onClick={onRefresh} />
          ) : null}
        </Toolbar>
      }
      headerAddon={
        <SideBarHeaderControl>
          <div className="workbench-search-control">
            <TextInput
              aria-label={searchLabel}
              className="workbench-search-control__input"
              controlWidth="full"
              placeholder={placeholder}
              value={query}
              onChange={(event) => onQueryChange(event.currentTarget.value)}
              onKeyDown={handleQueryKeyDown}
            />
            {query ? (
              <IconButton
                className="workbench-search-control__clear"
                compact
                icon="codicon-close"
                label="Clear search"
                onClick={() => onQueryChange('')}
              />
            ) : null}
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
