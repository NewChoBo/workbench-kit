import { useEffect } from 'react';
import { parseWorkspaceResourceUri } from '@workbench-kit/workspace';

import { useEditorService } from './use-editor.js';
import { useWorkbench } from './provider.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

export function createWorkspaceFileAvailabilityChecker(
  filePaths: ReadonlySet<string>,
): (resourceUri: string) => boolean {
  return (resourceUri) => {
    const parsed = parseWorkspaceResourceUri(resourceUri);
    if (!parsed || parsed.kind !== 'file') {
      return true;
    }

    return filePaths.has(parsed.path);
  };
}

export function EditorWorkspaceReconciler(): null {
  const { workspaceHostPort } = useWorkbench();
  const editorService = useEditorService();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);

  useEffect(() => {
    if (!workspaceService) {
      return;
    }

    const files = workspaceState?.files ?? workspaceService.getState().files;
    const filePaths = new Set(files.map((file) => file.path));
    editorService.reconcileWorkspaceFileTabs(createWorkspaceFileAvailabilityChecker(filePaths));
  }, [editorService, workspaceService, workspaceState]);

  return null;
}
