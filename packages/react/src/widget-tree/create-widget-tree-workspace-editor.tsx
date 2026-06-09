import type { WidgetAssetCatalogContract, WidgetRegistryContract } from '@workbench-kit/contracts';

import type { WorkspaceEditorPanelRenderEditor } from '../workbench/workspace/WorkspaceEditorPanel.js';
import {
  createWidgetStudioWorkspaceEditorRenderer,
  type WidgetStudioRenderContext,
} from '../widget-studio/create-widget-studio-workspace-editor.js';

export interface CreateWidgetTreeWorkspaceEditorOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly assetCatalog?: WidgetAssetCatalogContract | undefined;
}

export function createWidgetTreeWorkspaceEditorRenderer(
  options: CreateWidgetTreeWorkspaceEditorOptions = {},
): WorkspaceEditorPanelRenderEditor {
  const { registry, assetCatalog } = options;
  const renderStudio = createWidgetStudioWorkspaceEditorRenderer({
    registry,
    ...(assetCatalog
      ? { resolveAssetCatalog: () => assetCatalog }
      : {}),
  });

  return (context) =>
    renderStudio(context as WidgetStudioRenderContext);
}
