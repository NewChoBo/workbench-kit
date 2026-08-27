import { useEffect } from 'react';
import type { EditorService } from '@workbench-kit/workbench-core';

import { createWorkspaceFileAvailabilityChecker } from './workspace-file-availability.js';
import {
  isWorkspaceResourceService,
  useWorkspaceResourceState,
} from '../workbench/workspace-view-state.js';

interface EditorWorkspaceReconcilerProps {
  readonly editorService: EditorService;
  readonly workspaceHostService?: unknown;
}

/** Component-only module so Vite Fast Refresh can accept this boundary. */
export function EditorWorkspaceReconciler({
  editorService,
  workspaceHostService,
}: EditorWorkspaceReconcilerProps): null {
  const workspaceService = isWorkspaceResourceService(workspaceHostService)
    ? workspaceHostService
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
