import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  VirtualWorkspaceState,
  WorkspaceChangeEvent,
  WorkspaceResourceService,
} from '@workbench-kit/workspace';

const EMPTY_WORKSPACE_FILES: VirtualWorkspaceState['files'] = [];

export function isWorkspaceResourceService(value: unknown): value is WorkspaceResourceService {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WorkspaceResourceService).getState === 'function' &&
    typeof (value as WorkspaceResourceService).onDidChangeWorkspace === 'function'
  );
}

export function useWorkspaceResourceState(
  workspaceService: WorkspaceResourceService | undefined,
): VirtualWorkspaceState | undefined {
  const [state, setState] = useState(() => workspaceService?.getState());

  useEffect(() => {
    if (!workspaceService) {
      setState(undefined);
      return undefined;
    }

    setState(workspaceService.getState());
    return workspaceService.onDidChangeWorkspace((event: WorkspaceChangeEvent) => {
      setState(event.state);
    });
  }, [workspaceService]);

  return state;
}

export function useWorkspaceTextDocuments(workspaceService: WorkspaceResourceService | undefined) {
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const files =
    workspaceState?.files ?? workspaceService?.getState().files ?? EMPTY_WORKSPACE_FILES;
  const documentsByPath = useMemo(
    () => new Map(files.map((file) => [file.path.replace(/\\/g, '/'), file.content])),
    [files],
  );
  const loadDocument = useCallback(
    (documentPath: string) => documentsByPath.get(documentPath.replace(/\\/g, '/')) ?? null,
    [documentsByPath],
  );
  return { files, loadDocument };
}
