import { useMemo } from 'react';
import type { WidgetPlacementAsset, WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  createWidgetAssetDocument,
  formatWidgetAssetContent,
  formatWidgetAssetManifest,
  formatWidgetDocumentJson,
  isWidgetAssetContentPath,
  isWidgetAssetManifestPath,
  type GenericWidget,
  type WorkspaceAssetFileRef,
} from '@workbench-kit/json-widget';

import { JsonWidgetPreview } from '../json-widget/JsonWidgetPreview.js';
import { WidgetAssetSourceEditor } from './WidgetAssetSourceEditor.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import { WorkbenchPropertyHint, WorkbenchPropertyPanel } from '../layout/WorkbenchPropertyPanel';
import { WidgetInspectorPanel } from '../widget-tree/WidgetInspectorPanel.js';
import { WidgetAssetMetadataForm } from './WidgetAssetMetadataForm.js';
import type { WidgetAssetViewMode } from './widget-asset-mode.js';

export interface WidgetAssetEditorProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly readOnly?: boolean | undefined;
  readonly theme?: WorkspaceEditorTheme | undefined;
  readonly viewMode?: WidgetAssetViewMode | undefined;
  readonly workspaceFiles?: readonly WorkspaceAssetFileRef[] | undefined;
}

export function WidgetAssetEditor({
  path,
  value,
  onChange,
  onSave,
  registry,
  readOnly = false,
  theme = 'dark',
  viewMode = 'design',
  workspaceFiles,
}: WidgetAssetEditorProps) {
  const document = useMemo(
    () =>
      createWidgetAssetDocument(value, {
        ...(path ? { path } : {}),
        ...(workspaceFiles ? { workspaceFiles } : {}),
      }),
    [path, value, workspaceFiles],
  );

  const commitAssetMetadata = (nextAsset: WidgetPlacementAsset) => {
    onChange(formatWidgetAssetManifest(nextAsset));
  };

  const commitAssetContent = (nextWidget: GenericWidget) => {
    onChange(formatWidgetAssetContent(nextWidget));
  };

  if (viewMode === 'code') {
    return (
      <div
        className="widget-asset-editor widget-asset-editor--code"
        data-testid="widget-asset-editor"
      >
        <WidgetAssetSourceEditor
          parseError={document.parseError}
          path={path}
          readOnly={readOnly}
          theme={theme}
          value={value}
          onChange={onChange}
          onSave={onSave}
        />
      </div>
    );
  }

  if (document.parseError !== null || document.asset === null) {
    const hint =
      document.parseError ??
      'Open manifest.json with a sibling content.json in the workspace to use design mode.';

    return (
      <div
        className="widget-asset-editor widget-asset-editor--error"
        data-testid="widget-asset-editor"
      >
        <WorkbenchPropertyPanel>
          <WorkbenchPropertyHint>{hint}</WorkbenchPropertyHint>
        </WorkbenchPropertyPanel>
        <WidgetAssetSourceEditor
          parseError={document.parseError}
          path={path}
          readOnly={readOnly}
          theme={theme}
          value={value}
          onChange={onChange}
          onSave={onSave}
        />
      </div>
    );
  }

  const previewJson = formatWidgetDocumentJson(document.asset.defaultWidget as GenericWidget);
  const editingManifest = path ? isWidgetAssetManifestPath(path) : true;
  const editingContent = path ? isWidgetAssetContentPath(path) : false;

  return (
    <div
      className="widget-asset-editor widget-asset-editor--design"
      data-testid="widget-asset-editor"
    >
      <div className="widget-asset-editor__design">
        {editingManifest ? (
          <section className="widget-asset-editor__meta">
            <WidgetAssetMetadataForm
              asset={document.asset}
              readOnly={readOnly}
              registry={registry}
              onChange={commitAssetMetadata}
            />
          </section>
        ) : null}
        {editingContent ? (
          <section className="widget-asset-editor__template">
            <WidgetInspectorPanel
              path={[]}
              readOnly={readOnly}
              widget={document.asset.defaultWidget as GenericWidget}
              widgetRegistry={registry}
              onPatch={commitAssetContent}
            />
          </section>
        ) : null}
        <section aria-label="Asset preview" className="widget-asset-editor__preview">
          <header className="widget-asset-editor__preview-header">Placement preview</header>
          <div className="widget-asset-editor__preview-body">
            <JsonWidgetPreview json={previewJson} registry={registry} />
          </div>
        </section>
      </div>
    </div>
  );
}
