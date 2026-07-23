import { useCallback, useMemo } from 'react';
import { JdwPreviewViewport } from '@workbench-kit/react/jdw/preview-viewport';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';

import { useWorkbench } from '../shell/provider.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from '../workbench/workspace-view-state.js';

export interface JdwWidgetPreviewViewProps {
  readonly path: string;
  readonly content: string;
  readonly className?: string | undefined;
}

const EMPTY_WORKSPACE_FILES: readonly { readonly path: string; readonly content: string }[] = [];

/**
 * Preview viewport for JDW documents. Expands workspace `type: "ref"` imports
 * before layout/draw without rewriting the source buffer.
 */
export function JdwWidgetPreviewView({ path, content, className }: JdwWidgetPreviewViewProps) {
  const { workspaceHostPort } = useWorkbench();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const files =
    workspaceState?.files ?? workspaceService?.getState().files ?? EMPTY_WORKSPACE_FILES;

  const filesByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const file of files) {
      map.set(file.path.replace(/\\/g, '/'), file.content);
    }
    return map;
  }, [files]);

  const loadDocument = useCallback(
    (documentPath: string) => filesByPath.get(documentPath.replace(/\\/g, '/')) ?? null,
    [filesByPath],
  );

  return (
    <JdwPreviewViewport
      className={className}
      documentPath={path}
      json={content}
      loadDocument={loadDocument}
      registry={BUILTIN_JDW_REGISTRY}
    />
  );
}
