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

  const sourceEditor = (
    <WidgetAssetSourceEditor
      parseError={document.parseError}
      path={path}
      readOnly={readOnly}
      theme={theme}
      value={value}
      onChange={onChange}
      onSave={onSave}
    />
  );

  if (viewMode === 'code') {
    return (
      <div
        className="widget-asset-editor widget-asset-editor--code"
        data-testid="widget-asset-editor"
      >
        {sourceEditor}
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
        {sourceEditor}
      </div>
    );
  }

  const asset = document.asset;
  const editingManifest = Boolean(path && isWidgetAssetManifestPath(path));
  const editingContent = Boolean(path && isWidgetAssetContentPath(path));
  const previewJson =
    editingContent && path
      ? value
      : formatWidgetDocumentJson(asset.content as GenericWidget);

  const commitAssetMetadata = (nextAsset: WidgetPlacementAsset) => {
    onChange(formatWidgetAssetManifest(nextAsset));
  };

  return (
    <div
      className="widget-asset-editor widget-asset-editor--design"
      data-testid="widget-asset-editor"
    >
      <div className="widget-asset-editor__design">
        {editingManifest ? (
          <section className="widget-asset-editor__meta">
            <WidgetAssetMetadataForm
              asset={asset}
              readOnly={readOnly}
              onChange={commitAssetMetadata}
            />
          </section>
        ) : null}
        {editingContent ? (
          <section className="widget-asset-editor__template">
            <WidgetInspectorPanel
              path={[]}
              readOnly={readOnly}
              widget={asset.content as GenericWidget}
              widgetRegistry={registry}
              onPatch={(nextWidget) => onChange(formatWidgetAssetContent(nextWidget))}
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
