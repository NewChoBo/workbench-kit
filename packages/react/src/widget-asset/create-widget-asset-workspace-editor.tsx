import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import { WorkspaceEditor } from '../workbench/workspace/WorkspaceEditor.js';
import type { WorkspaceEditorPanelRenderEditor } from '../workbench/workspace/WorkspaceEditorPanel.js';
import { WidgetAssetWorkbench } from './WidgetAssetWorkbench.js';
import { isWidgetAssetDocument } from './widget-asset-document.js';

export interface CreateWidgetAssetWorkspaceEditorOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
}

export function createWidgetAssetWorkspaceEditorRenderer(
  options: CreateWidgetAssetWorkspaceEditorOptions = {},
): WorkspaceEditorPanelRenderEditor {
  const { registry } = options;

  return (context) => {
    if (!isWidgetAssetDocument(context.file)) {
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
    }

    return (
      <WidgetAssetWorkbench
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
  };
}
