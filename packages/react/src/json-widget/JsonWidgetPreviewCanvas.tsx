import { useMemo, useState } from 'react';
import type { GenericWidget, WidgetPath } from '@workbench-kit/json-widget';
import { parseWidgetJson } from '@workbench-kit/json-widget';

import { WorkbenchPreviewCanvas } from '../layout/WorkbenchCanvas.js';
import { WorkbenchParseError } from '../layout/WorkbenchLayout.js';
import { PreviewZoomToolbar } from './PreviewZoomToolbar.js';
import {
  DEFAULT_PLAYGROUND_PREVIEW_RECT,
  PlaygroundWidgetRenderer,
} from './playground-renderer/PlaygroundWidgetRenderer.js';
import { usePreviewViewport } from './usePreviewViewport.js';

export interface JsonWidgetPreviewCanvasProps {
  json: string;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  onSelectPath?: ((path: WidgetPath) => void) | undefined;
  className?: string | undefined;
  canvasWidth?: number | undefined;
  canvasHeight?: number | undefined;
  enableZoom?: boolean | undefined;
  frameTitle?: string | undefined;
  showGrid?: boolean | undefined;
  viewportGridSize?: number | undefined;
}

export function JsonWidgetPreviewCanvas({
  json,
  selectedPathKeys,
  onSelectPath,
  className,
  canvasWidth = DEFAULT_PLAYGROUND_PREVIEW_RECT.width,
  canvasHeight = DEFAULT_PLAYGROUND_PREVIEW_RECT.height,
  enableZoom = true,
  frameTitle = 'Widget preview',
  showGrid: showGridProp,
  viewportGridSize = 8,
}: JsonWidgetPreviewCanvasProps) {
  const parsed = useMemo(() => parseWidgetJson<GenericWidget>(json), [json]);
  const viewport = usePreviewViewport({ canvasHeight, canvasWidth });
  const [uncontrolledShowGrid, setUncontrolledShowGrid] = useState(false);
  const showGrid = showGridProp ?? uncontrolledShowGrid;

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

  return (
    <div
      className="ui-json-widget-preview-canvas-shell"
      data-panning={viewport.isPanning ? 'true' : 'false'}
      data-space-pan={viewport.isSpacePressed ? 'true' : 'false'}
      data-testid="json-widget-preview-canvas-shell"
    >
      {enableZoom ? (
        <PreviewZoomToolbar
          canZoomIn={viewport.canZoomIn}
          canZoomOut={viewport.canZoomOut}
          issueCount={0}
          scaleLabel={viewport.scaleLabel}
          showGrid={showGrid}
          title={frameTitle}
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
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
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
            <PlaygroundWidgetRenderer
              rect={rect}
              selectedPathKeys={selectedPathKeys}
              widget={parsed.value}
              onSelectPath={onSelectPath}
            />
          </div>
        </WorkbenchPreviewCanvas>
      </div>
    </div>
  );
}
