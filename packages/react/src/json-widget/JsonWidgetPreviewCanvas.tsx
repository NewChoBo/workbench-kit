import { useMemo } from 'react';
import type { GenericWidget, WidgetPath } from '@workbench-kit/json-widget';
import { parseWidgetJson } from '@workbench-kit/json-widget';

import { WorkbenchPreviewCanvas } from '../layout/WorkbenchCanvas.js';
import { WorkbenchParseError } from '../layout/WorkbenchLayout.js';
import {
  DEFAULT_PLAYGROUND_PREVIEW_RECT,
  PlaygroundWidgetRenderer,
} from './playground-renderer/PlaygroundWidgetRenderer.js';

export interface JsonWidgetPreviewCanvasProps {
  json: string;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  onSelectPath?: ((path: WidgetPath) => void) | undefined;
  className?: string | undefined;
  canvasWidth?: number | undefined;
  canvasHeight?: number | undefined;
}

export function JsonWidgetPreviewCanvas({
  json,
  selectedPathKeys,
  onSelectPath,
  className,
  canvasWidth = DEFAULT_PLAYGROUND_PREVIEW_RECT.width,
  canvasHeight = DEFAULT_PLAYGROUND_PREVIEW_RECT.height,
}: JsonWidgetPreviewCanvasProps) {
  const parsed = useMemo(() => parseWidgetJson<GenericWidget>(json), [json]);

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
    <WorkbenchPreviewCanvas
      className={className}
      data-testid="json-widget-preview-canvas"
      frameHeight={canvasHeight}
      frameTitle="Widget preview"
      frameWidth={canvasWidth}
      showWindowFrame
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
  );
}
