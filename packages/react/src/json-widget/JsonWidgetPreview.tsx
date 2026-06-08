import { isValidElement, useMemo, type ReactNode } from 'react';
import type { WidgetRegistryContract, WidgetTypeShape } from '@workbench-kit/contracts';
import { parseWidgetJson, type GenericWidget } from '@workbench-kit/json-widget';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout';
import {
  DEFAULT_PLAYGROUND_PREVIEW_RECT,
  PlaygroundWidgetRenderer,
} from './playground-renderer/PlaygroundWidgetRenderer.js';

export interface JsonWidgetPreviewProps {
  json: string;
  registry?: WidgetRegistryContract<unknown> | undefined;
  emptyLabel?: string | undefined;
  className?: string | undefined;
  visualPreview?: boolean | undefined;
}

function resolveRegistryOutput(
  registry: WidgetRegistryContract<unknown> | undefined,
  widget: WidgetTypeShape,
  emptyLabel: string,
  visualPreview: boolean,
): ReactNode {
  if (visualPreview) {
    return (
      <PlaygroundWidgetRenderer
        rect={DEFAULT_PLAYGROUND_PREVIEW_RECT}
        widget={widget as GenericWidget}
      />
    );
  }

  if (registry === undefined) {
    return `Parsed widget type "${widget.type}".`;
  }

  const build = registry.get(widget.type);
  if (build === undefined) {
    return `Unknown widget type "${widget.type}". Register it in WidgetRegistry to render.`;
  }

  if (typeof build === 'function') {
    const output = (build as (widget: WidgetTypeShape) => unknown)(widget);
    if (isValidElement(output)) return output;
    return String(output);
  }

  return emptyLabel;
}

export function JsonWidgetPreview({
  json,
  registry,
  emptyLabel = 'No render output.',
  className,
  visualPreview = false,
}: JsonWidgetPreviewProps) {
  const parsed = useMemo(() => parseWidgetJson(json), [json]);

  const renderOutput = useMemo(() => {
    if (parsed.parseError !== null || parsed.value === null) {
      return null;
    }

    return resolveRegistryOutput(registry, parsed.value, emptyLabel, visualPreview);
  }, [emptyLabel, parsed, registry, visualPreview]);

  if (parsed.parseError !== null) {
    return (
      <WorkbenchParseError role="alert" data-testid="json-widget-preview-error">
        {parsed.parseError}
      </WorkbenchParseError>
    );
  }

  return (
    <WorkbenchRenderSurface className={className} data-testid="json-widget-preview-output">
      {renderOutput ?? emptyLabel}
    </WorkbenchRenderSurface>
  );
}
