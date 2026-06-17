import { useEffect, useMemo, useState } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  applyWidgetDocumentPatch,
  createJdwDocumentJsonSchema,
  createWidgetDocument,
  firstSelectedWidgetPath,
  getWidgetAtPath,
  getWidgetChildren,
  materializeWidgetPlacementAsset,
  normalizeWidgetForParent,
  ROOT_WIDGET_PATH,
  selectWidgetPath,
  validateJsonWidgetData,
  type GenericWidget,
  type WidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/jdw';

import { ResizablePanels } from '../primitives/WorkbenchEditor.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import { JdwPreview } from '../jdw/JdwPreview.js';
import { WidgetAssetPalette } from './WidgetAssetPalette.js';
import { WidgetInspectorPanel } from './WidgetInspectorPanel.js';
import { WidgetSourceEditor } from './WidgetSourceEditor.js';
import { WidgetTreeSidePanel } from './WidgetTreeSidePanel.js';
import { WidgetTreeView } from './WidgetTreeView.js';
import { canAddChildren } from './widget-tree-layout.js';
import {
  DEFAULT_WIDGET_TREE_VIEW_MODE,
  resolveWidgetTreeLabMode,
  type WidgetTreeViewMode,
} from './widget-tree-mode.js';

export interface WidgetTreeLabProps {
  readonly path?: string | undefined;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSave?: (() => void) | undefined;
  readonly registry?: WidgetRegistryContract<unknown>;
  readonly assetCatalog?: WidgetAssetCatalogContract | undefined;
  readonly readOnly?: boolean;
  readonly theme?: WorkspaceEditorTheme | undefined;
  readonly viewMode?: WidgetTreeViewMode;
}

export function WidgetTreeLab({
  path,
  value,
  onChange,
  onSave,
  registry,
  assetCatalog,
  readOnly = false,
  theme = 'dark',
  viewMode = DEFAULT_WIDGET_TREE_VIEW_MODE,
}: WidgetTreeLabProps) {
  const resolvedMode = resolveWidgetTreeLabMode(viewMode);
  const document = useMemo(() => createWidgetDocument(value), [value]);
  const jsonSchema = useMemo(() => createJdwDocumentJsonSchema(), []);
  const registeredTypes = useMemo(
    () => registry?.definitions().map((definition) => definition.type),
    [registry],
  );
  const validation = useMemo(() => {
    if (document.parseError !== null) {
      return null;
    }

    return validateJsonWidgetData(value, {
      registeredTypes,
      strictKnownTypes: Boolean(registry),
    });
  }, [document.parseError, registry, registeredTypes, value]);
  const sourceValidationError = useMemo(() => {
    if (document.parseError !== null) {
      return document.parseError;
    }

    if (!validation || validation.valid || validation.issues.length === 0) {
      return null;
    }

    const [firstIssue] = validation.issues;
    return firstIssue ? `${firstIssue.path}: ${firstIssue.message}` : null;
  }, [document.parseError, validation]);

  const [selection, setSelection] = useState<WidgetSelectionState>({ pathKeys: new Set() });

  useEffect(() => {
    if (document.parseError !== null || document.root === null) {
      setSelection({ pathKeys: new Set() });
      return;
    }

    setSelection((current) => {
      const selectedPath = firstSelectedWidgetPath(current);
      if (selectedPath !== null && getWidgetAtPath(document.root!, selectedPath)) {
        return current;
      }

      return selectWidgetPath(current, ROOT_WIDGET_PATH);
    });
  }, [document.parseError, document.root, value]);

  const selectedPath = firstSelectedWidgetPath(selection);
  const selectedWidget = useMemo(() => {
    if (!document.root || selectedPath === null) return null;
    return getWidgetAtPath(document.root, selectedPath);
  }, [document.root, selectedPath]);

  const parentWidget = useMemo(() => {
    if (!document.root || !selectedPath || selectedPath.length === 0) return null;
    return getWidgetAtPath(document.root, selectedPath.slice(0, -1));
  }, [document.root, selectedPath]);

  const handleSelectPath = (nextPath: WidgetPath) => {
    setSelection((current) => selectWidgetPath(current, nextPath));
  };

  const applyPatch = (patch: Parameters<typeof applyWidgetDocumentPatch>[1]) => {
    const nextSource = applyWidgetDocumentPatch(value, patch);
    if (nextSource !== null) {
      onChange(nextSource);
    }
  };

  const handleInspectorPatch = (nextWidget: GenericWidget) => {
    if (!selectedPath) return;
    const widget =
      parentWidget !== null ? normalizeWidgetForParent(nextWidget, parentWidget) : nextWidget;
    applyPatch({
      type: 'replace-widget',
      path: selectedPath,
      widget,
    });
  };

  const handleInsertChild = (child: GenericWidget) => {
    if (!selectedPath || !selectedWidget) return;
    const index = getWidgetChildren(selectedWidget).length;
    applyPatch({
      type: 'insert-child',
      parentPath: selectedPath,
      index,
      child,
    });
  };

  const handlePlaceAsset = (asset: WidgetPlacementAsset) => {
    if (!selectedPath || !selectedWidget || !canAddChildren(selectedWidget)) return;
    handleInsertChild(materializeWidgetPlacementAsset(asset, selectedWidget));
  };

  const handleRemove = () => {
    if (!selectedPath || selectedPath.length === 0) return;
    applyPatch({
      type: 'remove-widget',
      path: selectedPath,
    });
    setSelection((current) => selectWidgetPath(current, ROOT_WIDGET_PATH));
  };

  const sourcePane = (
    <WidgetSourceEditor
      jsonSchema={jsonSchema}
      parseError={sourceValidationError}
      path={path}
      readOnly={readOnly}
      showProblemsPanel
      theme={theme}
      value={value}
      onChange={onChange}
      onSave={onSave}
    />
  );

  const sidePanel = (
    <WidgetTreeSidePanel
      assets={
        assetCatalog ? (
          <WidgetAssetPalette
            assetsByCategory={assetCatalog.assetsByCategory()}
            readOnly={readOnly}
            selectedContainer={canAddChildren(selectedWidget) ? selectedWidget : null}
            onPlaceAsset={handlePlaceAsset}
          />
        ) : (
          <div className="widget-tree-asset-palette widget-tree-asset-palette--empty">
            No asset catalog configured.
          </div>
        )
      }
      outline={
        <WidgetTreeView
          parseError={document.parseError}
          root={document.root}
          selection={selection}
          onSelectPath={handleSelectPath}
        />
      }
      properties={
        <WidgetInspectorPanel
          parentWidget={parentWidget}
          path={selectedPath}
          readOnly={readOnly}
          widget={selectedWidget}
          widgetRegistry={registry}
          onPatch={handleInspectorPatch}
          onRemove={handleRemove}
        />
      }
    />
  );

  const previewPane = (
    <section aria-label="Widget preview" className="widget-tree-lab__preview">
      <header className="widget-tree-lab__preview-header">Preview</header>
      <div className="widget-tree-lab__preview-body">
        <JdwPreview json={value} registry={registry} />
      </div>
    </section>
  );

  if (resolvedMode === 'code') {
    return (
      <div
        className="widget-tree-lab widget-tree-lab--code"
        data-mode="code"
        data-testid="widget-tree-lab"
      >
        {sourcePane}
      </div>
    );
  }

  return (
    <div
      className="widget-tree-lab widget-tree-lab--design"
      data-mode="design"
      data-testid="widget-tree-lab"
    >
      <ResizablePanels
        className="widget-tree-lab__design"
        data-testid="widget-tree-workspace"
        defaultFirstSize={560}
        minFirstSize={360}
        minSecondSize={280}
        style={{ height: '100%', minHeight: 0 }}
        first={
          <ResizablePanels
            className="widget-tree-lab__design-data"
            data-testid="widget-tree-lab-data-pane"
            defaultFirstSize={320}
            direction="vertical"
            minFirstSize={160}
            minSecondSize={180}
            style={{ height: '100%', minHeight: 0 }}
            first={<div className="widget-tree-lab__design-source">{sourcePane}</div>}
            second={<div className="widget-tree-lab__design-tools">{sidePanel}</div>}
          />
        }
        second={
          <div className="widget-tree-lab__design-render" data-testid="widget-tree-lab-render-pane">
            {previewPane}
          </div>
        }
      />
    </div>
  );
}
