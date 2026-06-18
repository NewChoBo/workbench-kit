import type { MouseEvent } from 'react';
import { SideBarList, SideBarListItem } from '../../layout/SideBarViewFrame';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import { WorkspaceHighlightedText } from './WorkspaceHighlightedText';
import { formatWorkspacePathDisplay } from './path';
import type { WorkspaceSearchResult } from './types';

export interface WorkspaceSearchResultsProps {
  activePath?: string;
  compactRows?: boolean;
  onActivateResult: (result: WorkspaceSearchResult) => void;
  onResultContextMenu?: (event: MouseEvent<HTMLElement>, result: WorkspaceSearchResult) => void;
  query: string;
  results: WorkspaceSearchResult[];
}

export function WorkspaceSearchResults({
  activePath,
  compactRows,
  onActivateResult,
  onResultContextMenu,
  query,
  results,
}: WorkspaceSearchResultsProps) {
  return (
    <SideBarList fill aria-label="Search results">
      {results.map((result) => (
        <SideBarListItem
          key={result.id}
          active={activePath === result.path}
          style={compactRows ? { minHeight: 46 } : undefined}
          variant="stacked"
          onClick={() => onActivateResult(result)}
          onContextMenu={(event) => onResultContextMenu?.(event, result)}
        >
          <strong>
            <WorkspaceFileIcon mimeType={result.file.mimeType} path={result.path} />
            <WorkspaceHighlightedText
              query={query}
              text={formatWorkspacePathDisplay(result.path)}
            />
          </strong>
          <span>
            Line {result.line}: <WorkspaceHighlightedText query={query} text={result.preview} />
          </span>
        </SideBarListItem>
      ))}
      {results.length === 0 ? <SideBarListItem disabled>No results</SideBarListItem> : null}
    </SideBarList>
  );
}
