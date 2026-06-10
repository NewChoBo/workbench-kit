import { useMemo } from 'react';
import type { WidgetPlacementAsset, WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  createWidgetAssetDocument,
  formatWidgetAssetJson,
  formatWidgetDocumentJson,
  type GenericWidget,
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
}: WidgetAssetEditorProps) {
  const document = useMemo(() => createWidgetAssetDocument(value), [value]);

  const commitAsset = (nextAsset: WidgetPlacementAsset) => {
    onChange(formatWidgetAssetJson(nextAsset));
  };

  if (viewMode === 'code') {
    return (
      <div className="widget-asset-editor widget-asset-editor--code" data-testid="widget-asset-editor">
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
    return (
      <div className="widget-asset-editor widget-asset-editor--error" data-testid="widget-asset-editor">
        <WorkbenchPropertyPanel>
          <WorkbenchPropertyHint>{document.parseError ?? 'Invalid asset document.'}</WorkbenchPropertyHint>
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

  return (
    <div className="widget-asset-editor widget-asset-editor--design" data-testid="widget-asset-editor">
      <div className="widget-asset-editor__design">
        <section className="widget-asset-editor__meta">
          <WidgetAssetMetadataForm
            asset={document.asset}
            readOnly={readOnly}
            registry={registry}
            onChange={commitAsset}
          />
        </section>
        <section className="widget-asset-editor__template">
          <WidgetInspectorPanel
            path={[]}
            readOnly={readOnly}
            widget={document.asset.defaultWidget as GenericWidget}
            widgetRegistry={registry}
            onPatch={(nextWidget) =>
              commitAsset({
                ...document.asset!,
                defaultWidget: nextWidget,
                widgetType: nextWidget.type,
              })
            }
          />
        </section>
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
