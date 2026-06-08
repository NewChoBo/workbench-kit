import { useCallback, useMemo, useState } from 'react';
import { createPlaygroundWidgetJsonSchema } from '@workbench-kit/json-widget';
import type { GenericWidget, WidgetPath, WidgetSelectionState } from '@workbench-kit/json-widget';
import { selectedWidgetPaths } from '@workbench-kit/json-widget';
import { getWidgetAtPath, parseWidgetJson } from '@workbench-kit/json-widget';

import { Button } from '../../primitives/Button';
import { ButtonGroup } from '../../primitives/WorkbenchEditor';
import type { AuthoringDropPayload } from '../../authoring/authoring-drop.js';
import {
  CANVAS_SIZE_PRESETS,
  DEFAULT_CANVAS_PRESET_ID,
  resolveCanvasPreset,
} from '../../authoring/canvas-presets.js';
import { ComponentPalettePanel } from '../../authoring/ComponentPalettePanel.js';
import type { InspectorAssetOption } from '../../authoring/InspectorAssetPickerRow.js';
import type { WidgetEditorSidePanelTab } from '../../authoring/WidgetEditorSidePanel.js';
import { JsonWidgetEditor, type JsonWidgetEditorProps } from '../JsonWidgetEditor.js';
import {
  PLAYGROUND_WIDGET_TEMPLATES,
  WELCOME_PLAYGROUND_DOCUMENT,
  playgroundWidgetRegistry,
  type PlaygroundWidgetTemplate,
} from './demo-registry.js';
import {
  deletePlaygroundWidgets,
  duplicatePlaygroundWidget,
  duplicatePlaygroundWidgets,
} from './playground-ops.js';
import {
  insertPlaygroundWidget,
  resolveGridCellFromCanvasPoint,
  resolveInsertTarget,
  resolveStackPositionFromCanvasPoint,
} from './playground-insert.js';

const playgroundJsonSchema = createPlaygroundWidgetJsonSchema(
  playgroundWidgetRegistry.definitions(),
);

const EMPTY_CANVAS_QUICK_TEMPLATES = PLAYGROUND_WIDGET_TEMPLATES.filter((template) =>
  ['text', 'image', 'button', 'box'].includes(template.id),
);

export interface WidgetAuthoringToolbarProps {
  canDelete: boolean;
  canDuplicate: boolean;
  canvasPresetId: string;
  exportFilename: string;
  jsonValue: string;
  onCanvasPresetChange: (presetId: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopyJson?: () => void;
  onDownloadJson?: () => void;
}

export function WidgetAuthoringToolbar({
  canDelete,
  canDuplicate,
  canvasPresetId,
  exportFilename,
  jsonValue,
  onCanvasPresetChange,
  onDelete,
  onDuplicate,
  onCopyJson,
  onDownloadJson,
}: WidgetAuthoringToolbarProps) {
  const handleCopyJson = async () => {
    if (onCopyJson) {
      onCopyJson();
      return;
    }
    await navigator.clipboard.writeText(jsonValue);
  };

  const handleDownloadJson = () => {
    if (onDownloadJson) {
      onDownloadJson();
      return;
    }
    const blob = new Blob([jsonValue], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFilename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-widget-authoring-toolbar">
      <div className="ui-widget-authoring-toolbar__group" aria-label="Selection actions">
        <ButtonGroup ariaLabel="Selection actions">
          <Button
            compact
            data-testid="duplicate-widget"
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            Duplicate
          </Button>
          <Button
            compact
            data-testid="delete-widget"
            disabled={!canDelete}
            variant="danger"
            onClick={onDelete}
          >
            Delete
          </Button>
        </ButtonGroup>
      </div>
      <span className="ui-widget-authoring-toolbar__divider" aria-hidden />
      <div className="ui-widget-authoring-toolbar__group" aria-label="Export JSON">
        <ButtonGroup ariaLabel="Export JSON">
          <Button compact data-testid="export-json-copy" onClick={() => void handleCopyJson()}>
            Copy JSON
          </Button>
          <Button compact data-testid="export-json-download" onClick={handleDownloadJson}>
            Download
          </Button>
        </ButtonGroup>
      </div>
      <span className="ui-widget-authoring-toolbar__divider" aria-hidden />
      <label className="ui-widget-authoring-toolbar__canvas-size">
        <span className="ui-widget-authoring-toolbar__canvas-size-label">Canvas size</span>
        <select
          className="ui-widget-authoring-toolbar__canvas-size-select"
          data-testid="canvas-size-preset"
          value={canvasPresetId}
          onChange={(event) => onCanvasPresetChange(event.target.value)}
        >
          {CANVAS_SIZE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label} ({preset.width}×{preset.height})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export interface WidgetAuthoringWorkbenchProps extends Omit<
  JsonWidgetEditorProps,
  | 'value'
  | 'onChange'
  | 'headerActions'
  | 'widgetRegistry'
  | 'jsonSchema'
  | 'interactivePreview'
  | 'leftPanelTabs'
  | 'renderRightSidebar'
  | 'canvasWidth'
  | 'canvasHeight'
  | 'onAuthoringDrop'
  | 'onEmptyInsertTemplate'
  | 'emptyStateQuickTemplates'
  | 'previewToolbarExtras'
> {
  exportFilename?: string;
  initialCanvasPresetId?: string | undefined;
  initialValue?: string;
  onDocumentChange?: (value: string) => void;
  onSaveDocument?: (value: string) => void;
  imageSrcAssets?: readonly InspectorAssetOption[] | undefined;
  resolveAssetSrc?: ((src: string) => string) | undefined;
  leftPanelTabs?: readonly WidgetEditorSidePanelTab[] | undefined;
  onSidebarPlacementChange?: JsonWidgetEditorProps['onSidebarPlacementChange'];
  renderRightSidebar?: JsonWidgetEditorProps['renderRightSidebar'];
  showSidebarMoveControls?: boolean | undefined;
  sidebarPlacement?: JsonWidgetEditorProps['sidebarPlacement'];
  value?: string;
}

function findWidgetTemplate(templateId: string): PlaygroundWidgetTemplate | undefined {
  return PLAYGROUND_WIDGET_TEMPLATES.find((template) => template.id === templateId);
}

export function WidgetAuthoringWorkbench({
  baselineValue,
  exportFilename = 'widget-layout.json',
  initialCanvasPresetId = DEFAULT_CANVAS_PRESET_ID,
  initialValue = WELCOME_PLAYGROUND_DOCUMENT,
  onDocumentChange,
  onSaveDocument,
  imageSrcAssets,
  resolveAssetSrc,
  leftPanelTabs: extraLeftPanelTabs,
  onSidebarPlacementChange,
  renderRightSidebar,
  showSidebarMoveControls,
  sidebarPlacement,
  value: controlledValue,
  onSave,
  readOnly,
  ...editorProps
}: WidgetAuthoringWorkbenchProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const [baseline, setBaseline] = useState(baselineValue ?? initialValue);
  const [selectedPath, setSelectedPath] = useState<WidgetPath | null>(null);
  const [selectionState, setSelectionState] = useState<WidgetSelectionState>({
    pathKeys: new Set(),
  });
  const [canvasPresetId, setCanvasPresetId] = useState(initialCanvasPresetId);

  const value = controlledValue ?? uncontrolledValue;
  const canvasPreset = resolveCanvasPreset(canvasPresetId);

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(next);
      }
      onDocumentChange?.(next);
    },
    [controlledValue, onDocumentChange],
  );

  const handleAddWidget = useCallback(
    (
      template: PlaygroundWidgetTemplate,
      options?: {
        gridPosition?: { col: number; row: number };
        stackPosition?: { left: number; top: number };
        childOverride?: GenericWidget;
      },
    ) => {
      const next = insertPlaygroundWidget(value, template, selectedPath, options);
      if (next) setValue(next);
    },
    [selectedPath, setValue, value],
  );

  const handleAuthoringDrop = useCallback(
    (payload: AuthoringDropPayload, position: { x: number; y: number }) => {
      const parsed = parseWidgetJson<GenericWidget>(value);
      const root = parsed.value && parsed.parseError === null ? parsed.value : null;
      const gridPosition = root
        ? (resolveGridCellFromCanvasPoint(root, position, {
            width: canvasPreset.width,
            height: canvasPreset.height,
          }) ?? undefined)
        : undefined;

      const insertTarget = root ? resolveInsertTarget(root, selectedPath) : null;
      const insertParent =
        root && insertTarget ? getWidgetAtPath(root, insertTarget.parentPath) : null;
      const stackPosition =
        insertParent?.type === 'stack' && !gridPosition
          ? resolveStackPositionFromCanvasPoint(position)
          : undefined;

      const placementOptions = { gridPosition, stackPosition };

      if (payload.kind === 'template') {
        const template = findWidgetTemplate(payload.templateId);
        if (template) handleAddWidget(template, placementOptions);
        return;
      }

      if (
        payload.kind === 'asset' &&
        (payload.assetType === 'image' || payload.assetType === 'icon')
      ) {
        const imageTemplate = findWidgetTemplate('image');
        if (!imageTemplate) return;
        const assetRef = `asset:${payload.assetId}`;
        const assetSrc = resolveAssetSrc ? resolveAssetSrc(assetRef) : assetRef;
        handleAddWidget(imageTemplate, {
          ...placementOptions,
          childOverride: {
            type: 'image',
            src: assetSrc,
            fit: payload.assetType === 'icon' ? 'contain' : 'cover',
            borderRadius: payload.assetType === 'icon' ? 0 : 8,
            col: gridPosition?.col ?? 0,
            row: gridPosition?.row ?? 0,
            left: stackPosition?.left,
            top: stackPosition?.top,
          },
        });
      }
    },
    [
      canvasPreset.height,
      canvasPreset.width,
      handleAddWidget,
      resolveAssetSrc,
      selectedPath,
      value,
    ],
  );

  const handleDeleteWidget = useCallback(() => {
    const paths = selectedWidgetPaths(selectionState);
    const next = deletePlaygroundWidgets(
      value,
      paths.length > 0 ? paths : selectedPath ? [selectedPath] : [],
    );
    if (next) {
      setValue(next);
      setSelectedPath(null);
      setSelectionState({ pathKeys: new Set() });
    }
  }, [selectedPath, selectionState, setValue, value]);

  const handleDuplicateWidget = useCallback(() => {
    const paths = selectedWidgetPaths(selectionState).filter((path) => path.length > 0);
    const targets =
      paths.length > 0 ? paths : selectedPath && selectedPath.length > 0 ? [selectedPath] : [];
    if (targets.length === 0) return;

    const next =
      targets.length > 1
        ? duplicatePlaygroundWidgets(value, targets)
        : duplicatePlaygroundWidget(value, targets[0] ?? null);
    if (next) setValue(next);
  }, [selectedPath, selectionState, setValue, value]);

  const canDelete =
    selectedWidgetPaths(selectionState).some((path) => path.length > 0) ||
    (selectedPath !== null && selectedPath.length > 0);
  const canDuplicate = canDelete;

  const toolbarProps = useMemo<WidgetAuthoringToolbarProps>(
    () => ({
      canDelete,
      canDuplicate,
      canvasPresetId,
      exportFilename,
      jsonValue: value,
      onCanvasPresetChange: setCanvasPresetId,
      onDelete: handleDeleteWidget,
      onDuplicate: handleDuplicateWidget,
    }),
    [
      canDelete,
      canDuplicate,
      canvasPresetId,
      exportFilename,
      handleDeleteWidget,
      handleDuplicateWidget,
      value,
    ],
  );

  const leftPanelTabs = useMemo<WidgetEditorSidePanelTab[]>(
    () => [
      {
        id: 'components',
        label: 'Components',
        content: (
          <ComponentPalettePanel
            readOnly={readOnly}
            onInsert={(template) => handleAddWidget(template)}
          />
        ),
      },
      ...(extraLeftPanelTabs ?? []),
    ],
    [extraLeftPanelTabs, handleAddWidget, readOnly],
  );

  const canvasSizeBadge = (
    <span className="ui-widget-authoring-canvas-badge" data-testid="canvas-size-label">
      {canvasPreset.width}×{canvasPreset.height}
    </span>
  );

  return (
    <JsonWidgetEditor
      baselineValue={baseline}
      canvasHeight={canvasPreset.height}
      canvasWidth={canvasPreset.width}
      defaultMode="preview"
      emptyStateQuickTemplates={EMPTY_CANVAS_QUICK_TEMPLATES}
      headerActions={() => <WidgetAuthoringToolbar {...toolbarProps} />}
      imageSrcAssets={imageSrcAssets}
      inspectorMode="simple"
      interactivePreview
      onDeleteSelected={canDelete ? handleDeleteWidget : undefined}
      jsonSchema={playgroundJsonSchema}
      path="widget-layout.json"
      previewToolbarExtras={canvasSizeBadge}
      leftPanelTabs={leftPanelTabs}
      onSidebarPlacementChange={onSidebarPlacementChange}
      readOnly={readOnly}
      renderRightSidebar={renderRightSidebar}
      showSidebarMoveControls={showSidebarMoveControls}
      sidebarPlacement={sidebarPlacement}
      title="Layout & widget authoring"
      value={value}
      widgetRegistry={playgroundWidgetRegistry}
      onAuthoringDrop={handleAuthoringDrop}
      onChange={setValue}
      onDiscard={() => setValue(baseline)}
      onEmptyInsertTemplate={(template) => handleAddWidget(template)}
      onSave={() => {
        setBaseline(value);
        onSave?.();
        onSaveDocument?.(value);
      }}
      onSelectionChange={(path, selection) => {
        setSelectedPath(path);
        setSelectionState(selection);
      }}
      resolveAssetSrc={resolveAssetSrc}
      {...editorProps}
    />
  );
}
