import { useEffect } from 'react';

import { createWorkspaceFileAvailabilityChecker } from './editor-workspace-file-availability.js';
import { useEditorService } from './use-editor.js';
import { useWorkbench } from './provider.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

/** Component-only module so Vite Fast Refresh can accept this boundary. */
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
