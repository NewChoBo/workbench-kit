import { useCallback, useMemo, useState } from 'react';
import { ViewEmptyState } from '@workbench-kit/react/primitives';
import { WorkspaceSearchPanel } from '@workbench-kit/react/workbench/workspace';
import { searchWorkspaceFiles, type WorkspaceSearchResult } from '@workbench-kit/workspace';

import { useWorkbench } from './provider.js';
import { useActiveWorkspacePath } from './use-active-workspace-path.js';
import { useActiveEditorTab } from './use-editor.js';
import {
  BUILTIN_SEARCH_VIEW_RENDER_KIND,
  isBuiltinSearchViewRenderData,
  type BuiltinSearchViewRenderData,
} from './search-view-data.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

export type { BuiltinSearchViewRenderData };
export { BUILTIN_SEARCH_VIEW_RENDER_KIND, isBuiltinSearchViewRenderData };

const WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;

export function BuiltinSearchView() {
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const [query, setQuery] = useState(workspaceState?.searchQuery ?? '');

  const activePath = useActiveWorkspacePath(activeTab?.resourceUri);

  const results = useMemo<WorkspaceSearchResult[]>(() => {
    if (!workspaceState) return [];
    return searchWorkspaceFiles(workspaceState.files, query);
  }, [query, workspaceState]);

  const openResult = useCallback(
    (result: WorkspaceSearchResult) => {
      void executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path: result.path });
    },
    [executeCommand],
  );

  if (!workspaceState) {
    return (
      <ViewEmptyState className="workbench-search-view">
        No virtual workspace is registered.
      </ViewEmptyState>
    );
  }

  return (
    <WorkspaceSearchPanel
      activePath={activePath}
      className="workbench-search-view"
      query={query}
      results={results}
      onActivateResult={openResult}
      onQueryChange={setQuery}
    />
  );
}
