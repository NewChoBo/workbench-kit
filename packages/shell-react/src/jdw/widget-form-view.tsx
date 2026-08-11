import { useMemo } from 'react';
import { resolveWidgetStudioAssetCatalog } from '@workbench-kit/react/widget-studio';
import { WidgetTreeLab } from '@workbench-kit/react/widget-tree';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';

import { useWorkbench } from '../shell/provider.js';
import {
  isWorkspaceResourceService,
  useWorkspaceTextDocuments,
} from '../workbench/workspace-view-state.js';

export interface JdwWidgetFormViewProps {
  readonly path: string;
  readonly content: string;
  readonly onContentChange: (content: string) => void;
}

/**
 * Form authoring surface for JDW widgets. Builds the Assets palette from built-in
 * assets, workspace asset packages, and other workspace `*.jdw.json` documents.
 * Preview expands `type: "ref"` via workspace documents without rewriting the
 * authored JSON outline.
 */
export function JdwWidgetFormView({ path, content, onContentChange }: JdwWidgetFormViewProps) {
  const { workspaceHostPort } = useWorkbench();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const { files, loadDocument } = useWorkspaceTextDocuments(workspaceService);

  const assetCatalog = useMemo(
    () =>
      resolveWidgetStudioAssetCatalog(files, {
        excludeDocumentPaths: [path],
      }),
    [files, path],
  );

  return (
    <WidgetTreeLab
      assetCatalog={assetCatalog}
      loadDocument={loadDocument}
      path={path}
      registry={BUILTIN_JDW_REGISTRY}
      showDesignSource={false}
      value={content}
      viewMode="design"
      onChange={onContentChange}
    />
  );
}
