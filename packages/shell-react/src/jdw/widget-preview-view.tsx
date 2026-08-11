import { JdwPreviewViewport } from '@workbench-kit/react/jdw/preview-viewport';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';

import { useWorkbench } from '../shell/provider.js';
import {
  isWorkspaceResourceService,
  useWorkspaceTextDocuments,
} from '../workbench/workspace-view-state.js';

export interface JdwWidgetPreviewViewProps {
  readonly path: string;
  readonly content: string;
  readonly className?: string | undefined;
}

/**
 * Preview viewport for JDW documents. Expands workspace `type: "ref"` imports
 * before layout/draw without rewriting the source buffer.
 */
export function JdwWidgetPreviewView({ path, content, className }: JdwWidgetPreviewViewProps) {
  const { workspaceHostPort } = useWorkbench();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const { loadDocument } = useWorkspaceTextDocuments(workspaceService);

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
