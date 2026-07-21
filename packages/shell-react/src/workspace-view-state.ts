import { useEffect, useState } from 'react';
import type {
  VirtualWorkspaceState,
  WorkspaceChangeEvent,
  WorkspaceResourceService,
} from '@workbench-kit/workspace';

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
