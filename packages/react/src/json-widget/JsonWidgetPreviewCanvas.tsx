import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import type {
  GenericWidget,
  WidgetPath,
  WidgetPatch,
  WidgetPathSelectOptions,
} from '@workbench-kit/json-widget';
import { getWidgetChildren, parseWidgetJson } from '@workbench-kit/json-widget';

import { WorkbenchPreviewCanvas } from '../layout/WorkbenchCanvas.js';
import { WorkbenchParseError } from '../layout/WorkbenchLayout.js';
import type { AuthoringDropPayload } from '../authoring/authoring-drop.js';
import { AUTHORING_DROP_MIME, readAuthoringDropPayload } from '../authoring/authoring-drop.js';
import { CanvasEmptyState } from '../authoring/CanvasEmptyState.js';
import type { PlaygroundWidgetTemplate } from './playground/demo-registry.js';
import { PreviewZoomToolbar, type PreviewCanvasTool } from './PreviewZoomToolbar.js';
import {
  DEFAULT_PLAYGROUND_PREVIEW_RECT,
  PlaygroundWidgetRenderer,
} from './playground/renderer/PlaygroundWidgetRenderer.js';
import { PlaygroundPreviewProvider } from './playground/renderer/PlaygroundPreviewContext.js';
import { usePreviewViewport } from './usePreviewViewport.js';

export interface JsonWidgetPreviewCanvasProps {
  json: string;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  onSelectPath?: ((path: WidgetPath, options?: WidgetPathSelectOptions) => void) | undefined;
  onPatch?: ((patch: WidgetPatch) => void) | undefined;
  onAuthoringDrop?: (payload: AuthoringDropPayload, position: { x: number; y: number }) => void;
  resolveAssetSrc?: ((src: string) => string) | undefined;
  parseError?: string | null | undefined;
  className?: string | undefined;
  canvasWidth?: number | undefined;
  canvasHeight?: number | undefined;
  enableZoom?: boolean | undefined;
  emptyStateQuickTemplates?: readonly PlaygroundWidgetTemplate[] | undefined;
  frameTitle?: string | undefined;
  onEmptyInsertTemplate?: ((template: PlaygroundWidgetTemplate) => void) | undefined;
  previewToolbarExtras?: ReactNode | undefined;
  readOnly?: boolean | undefined;
  showGrid?: boolean | undefined;
  viewportGridSize?: number | undefined;
}

function isCanvasVisuallyEmpty(root: GenericWidget): boolean {
  const children = getWidgetChildren(root);
  if (children.length > 0) return false;
  if (root.type === 'box' && root.child) return false;
  if (root.type === 'document' && root.child) return false;
  return true;
}

export function JsonWidgetPreviewCanvas({
  json,
  selectedPathKeys,
  onSelectPath,
  onPatch,
  onAuthoringDrop,
  resolveAssetSrc,
  parseError = null,
  className,
  canvasWidth = DEFAULT_PLAYGROUND_PREVIEW_RECT.width,
  canvasHeight = DEFAULT_PLAYGROUND_PREVIEW_RECT.height,
  enableZoom = true,
  emptyStateQuickTemplates,
  frameTitle = 'Widget preview',
  onEmptyInsertTemplate,
  previewToolbarExtras,
  readOnly = false,
  showGrid: showGridProp,
  viewportGridSize = 8,
}: JsonWidgetPreviewCanvasProps) {
  const parsed = useMemo(() => parseWidgetJson<GenericWidget>(json), [json]);
  const [previewTool, setPreviewTool] = useState<PreviewCanvasTool>('select');
  const viewport = usePreviewViewport({
    canvasHeight,
    canvasWidth,
    panToolActive: previewTool === 'hand',
  });
  const [uncontrolledShowGrid, setUncontrolledShowGrid] = useState(false);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const selectionEnabled = Boolean(onSelectPath) && previewTool === 'select' && !readOnly;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (event.key.toLowerCase() === 'v') {
        setPreviewTool('select');
      } else if (event.key.toLowerCase() === 'h') {
        setPreviewTool('hand');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const showGrid = showGridProp ?? uncontrolledShowGrid;
  const issueCount = parseError ? 1 : 0;

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (readOnly || !onAuthoringDrop) return;
      if (!event.dataTransfer.types.includes(AUTHORING_DROP_MIME)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDropTargetActive(true);
    },
    [onAuthoringDrop, readOnly],
  );

  const handleDragLeave = useCallback(() => {
    setIsDropTargetActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      setIsDropTargetActive(false);
      if (readOnly || !onAuthoringDrop) return;
      const payload = readAuthoringDropPayload(event.dataTransfer);
      if (!payload) return;
      event.preventDefault();

      const output = event.currentTarget.querySelector(
        '[data-testid="json-widget-preview-output"]',
      );
      if (!(output instanceof HTMLElement)) return;

      const rect = output.getBoundingClientRect();
      const scale = viewport.effectiveZoom > 0 ? viewport.effectiveZoom : 1;
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;

      onAuthoringDrop(payload, {
        x: Math.max(0, Math.min(canvasWidth, x)),
        y: Math.max(0, Math.min(canvasHeight, y)),
      });
    },
    [canvasHeight, canvasWidth, onAuthoringDrop, readOnly, viewport.effectiveZoom],
  );

  if (parsed.parseError !== null) {
    return (
      <WorkbenchParseError role="alert" data-testid="json-widget-preview-error">
        {parsed.parseError}
      </WorkbenchParseError>
    );
  }

  if (!parsed.value) {
    return null;
  }

  const rect = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  const showEmptyState =
    parsed.value &&
    isCanvasVisuallyEmpty(parsed.value) &&
    emptyStateQuickTemplates &&
    emptyStateQuickTemplates.length > 0 &&
    onEmptyInsertTemplate;

  return (
    <div
      className="ui-json-widget-preview-canvas-shell"
      data-drop-active={isDropTargetActive ? 'true' : 'false'}
      data-panning={viewport.isPanning ? 'true' : 'false'}
      data-space-pan={viewport.isSpacePressed ? 'true' : 'false'}
      data-testid="json-widget-preview-canvas-shell"
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {enableZoom ? (
        <PreviewZoomToolbar
          activeTool={previewTool}
          canZoomIn={viewport.canZoomIn}
          canZoomOut={viewport.canZoomOut}
          extraControls={previewToolbarExtras}
          issueCount={issueCount}
          scaleLabel={viewport.scaleLabel}
          showGrid={showGrid}
          title={frameTitle}
          onToolChange={readOnly ? undefined : setPreviewTool}
          onToggleGrid={
            showGridProp === undefined
              ? () => setUncontrolledShowGrid((current) => !current)
              : undefined
          }
          onZoomIn={viewport.zoomIn}
          onZoomOut={viewport.zoomOut}
          onZoomToFit={viewport.zoomToFit}
        />
      ) : null}

      <div
        ref={enableZoom ? viewport.setCanvasElement : undefined}
        className="ui-json-widget-preview-canvas-viewport-host"
        data-panning={viewport.isPanning ? 'true' : 'false'}
        data-space-pan={viewport.isSpacePressed ? 'true' : 'false'}
      >
        <WorkbenchPreviewCanvas
          className={className}
          data-testid="json-widget-preview-canvas"
          frameHeight={canvasHeight}
          frameTitle={frameTitle}
          frameWidth={canvasWidth}
          help={
            enableZoom
              ? 'Ctrl + Scroll to zoom | Space + drag to pan | Drag empty area to pan'
              : undefined
          }
          isPanning={viewport.isPanning}
          onResetView={enableZoom ? viewport.resetView : undefined}
          resetLabel={enableZoom ? `Reset (${viewport.scaleLabel})` : undefined}
          resetTitle="Reset zoom and center viewport"
          showViewportGrid={showGrid}
          showWindowFrame
          stageStyle={enableZoom ? viewport.stageStyle : undefined}
          viewportGridSize={viewportGridSize}
        >
          <div
            data-testid="json-widget-preview-output"
            style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}
          >
            <PlaygroundPreviewProvider
              value={{
                root: parsed.value,
                onPatch,
                resolveAssetSrc,
                selectionEnabled,
                showSnapGrid: showGrid,
                snapGridSize: viewportGridSize,
                viewportScale: viewport.effectiveZoom,
              }}
            >
              <PlaygroundWidgetRenderer
                rect={rect}
                selectedPathKeys={selectedPathKeys}
                widget={parsed.value}
                onSelectPath={selectionEnabled ? onSelectPath : undefined}
              />
              {showEmptyState ? (
                <CanvasEmptyState
                  quickTemplates={emptyStateQuickTemplates}
                  onInsertTemplate={onEmptyInsertTemplate}
                />
              ) : null}
            </PlaygroundPreviewProvider>
          </div>
        </WorkbenchPreviewCanvas>
      </div>
    </div>
  );
}
