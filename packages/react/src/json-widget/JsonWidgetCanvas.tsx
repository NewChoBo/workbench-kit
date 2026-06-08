import { useMemo } from 'react';
import { parseWidgetJson, type GenericWidget } from '@workbench-kit/json-widget';

import { WorkbenchParseError } from '../layout/WorkbenchLayout.js';
import {
  WidgetRendererProvider,
  type WidgetAssetResolver,
  type WidgetRendererRegistry,
} from './renderer/context.js';
import type { WidgetRendererEvent } from './renderer/contract.js';
import { WidgetRenderer } from './renderer/WidgetRenderer.js';

export interface JsonWidgetCanvasProps {
  /** Widget JSON document to render. */
  json: string;
  /** Consumer renderers for custom widget types (builtins are always available). */
  registry?: WidgetRendererRegistry | undefined;
  /** Adapter mapping raw asset references (e.g. image `src`) to loadable URLs. */
  resolveAssetSrc?: WidgetAssetResolver | undefined;
  /** Fixed canvas width in px. */
  width?: number | undefined;
  /** Fixed canvas height in px. */
  height?: number | undefined;
  /** Canvas background color. */
  background?: string | undefined;
  /** Interaction callback forwarded to renderers. */
  onEvent?: ((event: WidgetRendererEvent) => void) | undefined;
  className?: string | undefined;
}

const DEFAULT_CANVAS_WIDTH = 420;
const DEFAULT_CANVAS_HEIGHT = 320;

/**
 * Renders a widget JSON document to real DOM inside a fixed-size surface.
 * Generic layout/leaf widgets render through builtin renderers; custom types
 * are resolved via the optional `registry`. No store/IO dependency — data
 * arrives as `json` and assets resolve through the injected `resolveAssetSrc`.
 */
export function JsonWidgetCanvas({
  json,
  registry,
  resolveAssetSrc,
  width = DEFAULT_CANVAS_WIDTH,
  height = DEFAULT_CANVAS_HEIGHT,
  background,
  onEvent,
  className,
}: JsonWidgetCanvasProps) {
  const parsed = useMemo(() => parseWidgetJson<GenericWidget>(json), [json]);

  if (parsed.parseError !== null) {
    return (
      <WorkbenchParseError role="alert" data-testid="json-widget-canvas-error">
        {parsed.parseError}
      </WorkbenchParseError>
    );
  }

  if (parsed.value === null) {
    return null;
  }

  return (
    <WidgetRendererProvider registry={registry} resolveAssetSrc={resolveAssetSrc}>
      <div
        className={className}
        data-testid="json-widget-canvas"
        style={{ position: 'relative', width, height, background, overflow: 'hidden' }}
      >
        <WidgetRenderer
          widget={parsed.value}
          rect={{ x: 0, y: 0, width, height }}
          {...(onEvent !== undefined ? { onEvent } : {})}
        />
      </div>
    </WidgetRendererProvider>
  );
}
