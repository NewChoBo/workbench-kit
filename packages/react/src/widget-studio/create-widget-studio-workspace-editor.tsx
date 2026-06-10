import type { WidgetAssetCatalogContract, WidgetRegistryContract } from '@workbench-kit/contracts';

import { WorkspaceEditor } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceEditorPanelRenderEditorContext } from '../workbench/workspace/WorkspaceEditorPanel.js';
import type { WorkspaceFile } from '../workbench/workspace/types.js';
import { WidgetAssetWorkbench } from '../widget-asset/WidgetAssetWorkbench.js';
import { isWidgetAssetDocument } from '../widget-asset/widget-asset-document.js';
import { WidgetTreeWorkbench } from '../widget-tree/WidgetTreeWorkbench.js';
import { isWidgetTreeDocument } from '../widget-tree/widget-tree-document.js';
import { resolveWidgetStudioAssetCatalog } from './resolve-widget-studio-asset-catalog.js';

export interface WidgetStudioRenderContext extends WorkspaceEditorPanelRenderEditorContext {
  readonly workspaceFiles?: readonly WorkspaceFile[] | undefined;
}

export interface CreateWidgetStudioWorkspaceEditorOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly resolveAssetCatalog?: ((
    files: readonly WorkspaceFile[],
  ) => WidgetAssetCatalogContract) | undefined;
}

export function createWidgetStudioWorkspaceEditorRenderer(
  options: CreateWidgetStudioWorkspaceEditorOptions = {},
) {
  const { registry, resolveAssetCatalog = resolveWidgetStudioAssetCatalog } = options;

  return (context: WidgetStudioRenderContext) => {
    const workspaceFiles = context.workspaceFiles ?? [];
    const assetCatalog = resolveAssetCatalog(workspaceFiles);

    if (isWidgetAssetDocument(context.file)) {
      return (
        <WidgetAssetWorkbench
          dirty={context.isDirty}
          path={context.file.path}
          readOnly={false}
          registry={registry}
          theme={context.theme}
          value={context.content}
          workspaceFiles={workspaceFiles}
          onChange={context.onChange}
          onDiscard={context.onDiscard}
          onSave={() => context.onSave(context.content)}
        />
      );
    }

    if (isWidgetTreeDocument(context.file)) {
      return (
        <WidgetTreeWorkbench
          assetCatalog={assetCatalog}
          dirty={context.isDirty}
          path={context.file.path}
          readOnly={false}
          registry={registry}
          theme={context.theme}
          value={context.content}
          onChange={context.onChange}
          onDiscard={context.onDiscard}
          onSave={() => context.onSave(context.content)}
        />
      );
    }

    return (
      <WorkspaceEditor
        key={context.file.path}
        file={context.file}
        readOnly={false}
        showHeader={false}
        theme={context.theme}
        value={context.content}
        onChange={context.onChange}
        onSave={(content) => context.onSave(content)}
      />
    );
  };
}
