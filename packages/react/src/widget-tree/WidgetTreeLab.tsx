import { useEffect, useMemo, useRef, useState } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  applyWidgetDocumentPatch,
  collectJsonWidgetListenBindings,
  createJdwDocumentJsonSchema,
  createWidgetDocument,
  firstSelectedWidgetPath,
  findLineAndColumnForPath,
  getWidgetAtPath,
  getWidgetChildren,
  materializeWidgetPlacementAsset,
  normalizeWidgetForParent,
  reflowGridChildren,
  ROOT_WIDGET_PATH,
  selectWidgetPath,
  validateJsonWidgetData,
  type GenericWidget,
  type JsonWidgetNode,
  type WidgetPatch,
  type WidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/jdw';

import { ResizablePanels } from '../primitives/WorkbenchEditor.js';
import type { WorkspaceEditorTheme } from '../workbench/workspace/WorkspaceEditor.js';
import type { JsonEditorProblem } from '../jdw/JsonCodeEditorPane.js';
import { WidgetAssetPalette } from './WidgetAssetPalette.js';
import { WidgetTreeCanvasPreview } from './WidgetTreeCanvasPreview.js';
import { WidgetInspectorPanel } from './WidgetInspectorPanel.js';
import { WidgetSourceEditor } from './WidgetSourceEditor.js';
import { WidgetTreeSidePanel, type WidgetTreeSidePanelDetailTab } from './WidgetTreeSidePanel.js';
import {
  WidgetTreeView,
  type WidgetTreeAssetDropOperation,
  type WidgetTreeMoveOperation,
} from './WidgetTreeView.js';
import { canAddChildren, insertedWidgetPathForParent } from './widget-tree-layout.js';
import {
  DEFAULT_WIDGET_TREE_VIEW_MODE,
  resolveWidgetTreeLabMode,
  type WidgetTreeViewMode,
} from './widget-tree-mode.js';

export function createWidgetTreeListenProblems(
  source: string,
  node: JsonWidgetNode,
): readonly JsonEditorProblem[] {
  return collectJsonWidgetListenBindings(node).flatMap((binding) => {
    const position = findLineAndColumnForPath(source, binding.widgetPath);
    const location = {
      startLineNumber: position.line,
      startColumn: position.column,
      endLineNumber: position.line,
      endColumn: position.column + 1,
    };
    return [
      ...binding.missingListen.map((dependency) => ({
        ...location,
        message: `${binding.nodePath}: listen is missing "${dependency}" for a dynamic value.`,
        severity: 4,
      })),
      ...binding.unusedListen.map((dependency) => ({
        ...location,
        message: `${binding.nodePath}: listen includes "${dependency}" but this node does not reference it.`,
        severity: 4,
      })),
    ];
  });
}

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

function widgetPathSegmentEquals(
  left: WidgetPath[number],
  right: WidgetPath[number] | undefined,
): boolean {
  if (!right || left.kind !== right.kind) return false;
  if (left.kind === 'child') return true;
  return right.kind === 'children' && left.index === right.index;
}

function adjustReparentTargetParentPath(
  fromPath: WidgetPath,
  toParentPath: WidgetPath,
): WidgetPath {
  const removedSegment = fromPath[fromPath.length - 1];
  if (!removedSegment || removedSegment.kind !== 'children') return toParentPath;

  const removedParentPath = fromPath.slice(0, -1);
  return toParentPath.map((segment, depth) => {
    if (segment.kind !== 'children' || depth !== removedParentPath.length) return segment;

    const sameParent = removedParentPath.every((parentSegment, index) =>
      widgetPathSegmentEquals(parentSegment, toParentPath[index]),
    );
    if (sameParent && removedSegment.index < segment.index) {
      return { kind: 'children', index: segment.index - 1 } as const;
    }

    return segment;
  });
}

function resolveReparentedSelectionPath(
  root: GenericWidget,
  patch: Extract<WidgetPatch, { type: 'reparent-widget' }>,
): WidgetPath | null {
  const targetParent = getWidgetAtPath(root, patch.toParentPath);
  if (!targetParent) return null;

  return insertedWidgetPathForParent(
    targetParent,
    adjustReparentTargetParentPath(patch.fromPath, patch.toParentPath),
    patch.insertIndex,
  );
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
      strictKnownTypes: true,
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
  const sourceProblems = useMemo<readonly JsonEditorProblem[]>(() => {
    if (!validation?.value || !validation.valid) {
      return [];
    }

    return createWidgetTreeListenProblems(value, validation.value);
  }, [validation, value]);

  const [selection, setSelection] = useState<WidgetSelectionState>({ pathKeys: new Set() });
  const [sidePanelDetailTab, setSidePanelDetailTab] =
    useState<WidgetTreeSidePanelDetailTab>('properties');
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState(0);
  const inspectorPanelRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (inspectorFocusRequest === 0 || sidePanelDetailTab !== 'properties') return;

    const panel = inspectorPanelRef.current;
    const focusTarget = panel?.querySelector<HTMLElement>(
      'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );

    (focusTarget ?? panel)?.focus();
  }, [inspectorFocusRequest, sidePanelDetailTab, selectedPath]);

  const focusPropertyDetailTab = () => {
    setSidePanelDetailTab('properties');
    setInspectorFocusRequest((current) => current + 1);
  };

  const handleSelectPath = (nextPath: WidgetPath) => {
    setSelection((current) => selectWidgetPath(current, nextPath));
  };

  const handleActivatePath = (nextPath: WidgetPath) => {
    setSelection((current) => selectWidgetPath(current, nextPath));
    focusPropertyDetailTab();
  };

  const handlePreviewSelectPath = (nextPath: WidgetPath) => {
    setSelection((current) => selectWidgetPath(current, nextPath));
    setSidePanelDetailTab('properties');
  };

  const applyPatch = (patch: WidgetPatch): boolean => {
    const nextSource = applyWidgetDocumentPatch(value, patch);
    if (nextSource !== null) {
      onChange(nextSource);
      return nextSource !== value;
    }

    return false;
  };

  const handleCanvasPatch = (patch: WidgetPatch): boolean => {
    const nextSelectionPath =
      patch.type === 'reparent-widget' && document.root
        ? resolveReparentedSelectionPath(document.root, patch)
        : null;
    const changed = applyPatch(patch);
    if (changed && nextSelectionPath) {
      setSelection((current) => selectWidgetPath(current, nextSelectionPath));
      focusPropertyDetailTab();
    }
    return changed;
  };

  const handleInspectorPatch = (nextWidget: GenericWidget) => {
    if (!selectedPath) return;
    const normalizedWidget =
      parentWidget !== null ? normalizeWidgetForParent(nextWidget, parentWidget) : nextWidget;
    const widget =
      selectedWidget?.type === 'grid' &&
      normalizedWidget.type === 'grid' &&
      selectedWidget.columns !== normalizedWidget.columns
        ? reflowGridChildren(normalizedWidget)
        : normalizedWidget;
    applyPatch({
      type: 'replace-widget',
      path: selectedPath,
      widget,
    });
  };

  const handleInsertChild = (child: GenericWidget) => {
    if (!selectedPath || !selectedWidget) return;
    const index = getWidgetChildren(selectedWidget).length;
    const insertedPath = insertedWidgetPathForParent(selectedWidget, selectedPath, index);
    const changed = applyPatch({
      type: 'insert-child',
      parentPath: selectedPath,
      index,
      child,
    });
    if (changed) {
      setSelection((current) => selectWidgetPath(current, insertedPath));
      focusPropertyDetailTab();
    }
  };

  const handlePlaceAsset = (asset: WidgetPlacementAsset) => {
    if (!selectedPath || !selectedWidget || !canAddChildren(selectedWidget)) return;
    handleInsertChild(materializeWidgetPlacementAsset(asset, selectedWidget));
  };

  const handlePlaceAssetPath = (operation: WidgetTreeAssetDropOperation) => {
    if (!document.root) return;

    const parent = getWidgetAtPath(document.root, operation.parentPath);
    if (!parent || !canAddChildren(parent)) return;

    const changed = applyPatch({
      type: 'insert-child',
      parentPath: operation.parentPath,
      index: operation.insertIndex,
      child: materializeWidgetPlacementAsset(operation.asset, parent),
    });
    if (changed) {
      setSelection((current) => selectWidgetPath(current, operation.nextPath));
      focusPropertyDetailTab();
    }
  };

  const handleRemovePath = (pathToRemove: WidgetPath) => {
    if (pathToRemove.length === 0) return;
    const parentPath = pathToRemove.slice(0, -1);
    applyPatch({
      type: 'remove-widget',
      path: pathToRemove,
    });
    setSelection((current) => selectWidgetPath(current, parentPath));
  };

  const handleRemove = () => {
    if (!selectedPath) return;
    handleRemovePath(selectedPath);
  };

  const handleMovePath = (operation: WidgetTreeMoveOperation) => {
    const changed =
      operation.kind === 'reorder'
        ? applyPatch({
            type: 'reorder-child',
            parentPath: operation.parentPath,
            fromIndex: operation.fromIndex,
            toIndex: operation.toIndex,
          })
        : applyPatch({
            type: 'reparent-widget',
            fromPath: operation.fromPath,
            toParentPath: operation.toParentPath,
            insertIndex: operation.insertIndex,
          });
    if (changed) {
      setSelection((current) => selectWidgetPath(current, operation.nextPath));
    }
  };

  const sourcePane = (
    <WidgetSourceEditor
      jsonSchema={jsonSchema}
      parseError={sourceValidationError}
      path={path}
      problems={sourceProblems}
      readOnly={readOnly}
      root={document.root}
      selectedPath={selectedPath}
      showProblemsPanel
      theme={theme}
      value={value}
      onChange={onChange}
      onSave={onSave}
      onSelectPath={handleSelectPath}
    />
  );

  const sidePanel = (
    <WidgetTreeSidePanel
      detailTab={sidePanelDetailTab}
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
          onActivatePath={handleActivatePath}
          onDeletePath={readOnly ? undefined : handleRemovePath}
          onMovePath={readOnly ? undefined : handleMovePath}
          onPlaceAssetPath={readOnly ? undefined : handlePlaceAssetPath}
          onSelectPath={handleSelectPath}
        />
      }
      properties={
        <WidgetInspectorPanel
          panelRef={inspectorPanelRef}
          parentWidget={parentWidget}
          path={selectedPath}
          readOnly={readOnly}
          widget={selectedWidget}
          widgetRegistry={registry}
          onPatch={handleInspectorPatch}
          onRemove={handleRemove}
        />
      }
      onDetailTabChange={setSidePanelDetailTab}
    />
  );

  const previewPane = (
    <section aria-label="Widget preview" className="widget-tree-lab__preview">
      <header className="widget-tree-lab__preview-header">Preview</header>
      <div className="widget-tree-lab__preview-body">
        <WidgetTreeCanvasPreview
          json={value}
          readOnly={readOnly}
          registry={registry}
          root={document.root}
          selectedPath={selectedPath}
          onPatch={handleCanvasPatch}
          onSelectPath={handlePreviewSelectPath}
        />
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
