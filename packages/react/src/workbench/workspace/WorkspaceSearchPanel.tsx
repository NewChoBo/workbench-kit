import { Panel, PanelBody, PanelHeader } from '../../layout/Panel';
import { Badge } from '../../primitives/Badge';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import { WorkspaceHighlightedText } from './WorkspaceHighlightedText';
import type { WorkspaceSearchResult } from './types';

export interface WorkspaceSearchPanelProps {
  activePath?: string;
  compactRows?: boolean;
  onActivateResult: (result: WorkspaceSearchResult) => void;
  query: string;
  results: WorkspaceSearchResult[];
}

export function WorkspaceSearchPanel({
  activePath,
  compactRows,
  onActivateResult,
  query,
  results,
}: WorkspaceSearchPanelProps) {
  return (
    <Panel style={{ minWidth: 0 }}>
      <PanelHeader
        actions={
          <Toolbar>
            <Badge variant="muted">{results.length} results</Badge>
            <IconButton icon="codicon-refresh" label="Refresh results" />
          </Toolbar>
        }
      >
        Search: {query || 'All files'}
      </PanelHeader>
      <PanelBody style={{ padding: 16 }}>
        {results.length ? (
          <div style={{ display: 'grid', gap: compactRows ? 8 : 12 }}>
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                className="workbench-search-card"
                data-active={result.path === activePath ? 'true' : undefined}
                style={{ minHeight: compactRows ? 56 : 72 }}
                onClick={() => onActivateResult(result)}
              >
                <span style={{ minWidth: 0 }}>
                  <strong>
                    <WorkspaceFileIcon mimeType={result.file.mimeType} path={result.path} />
                    <WorkspaceHighlightedText query={query} text={result.path} />
                  </strong>
                  <span>
                    <WorkspaceHighlightedText query={query} text={result.preview} />
                  </span>
                </span>
                <span className="workbench-search-card__meta">
                  <Badge variant="muted">{result.matchedBy}</Badge>
                  <Badge variant="muted">Line {result.line}</Badge>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState compact icon="codicon-search">
            No results
          </EmptyState>
        )}
      </PanelBody>
    </Panel>
  );
}
