import { useMemo } from 'react';
import type { WidgetRegistryContract, WidgetTypeShape } from '@workbench-kit/contracts';
import { parseWidgetJson } from '@workbench-kit/json-widget';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout';

export interface JsonWidgetPreviewProps {
  json: string;
  registry?: WidgetRegistryContract<unknown> | undefined;
  emptyLabel?: string | undefined;
  className?: string | undefined;
}

export function JsonWidgetPreview({
  json,
  registry,
  emptyLabel = 'No render output.',
  className,
}: JsonWidgetPreviewProps) {
  const parsed = useMemo(() => parseWidgetJson(json), [json]);

  const renderOutput = useMemo(() => {
    if (parsed.parseError !== null || parsed.value === null) {
      return null;
    }

    if (registry === undefined) {
      return `Parsed widget type "${parsed.value.type}".`;
    }

    const build = registry.get(parsed.value.type);
    if (build === undefined) {
      return `Unknown widget type "${parsed.value.type}". Register it in WidgetRegistry to render.`;
    }

    if (typeof build === 'function') {
      return String((build as (widget: WidgetTypeShape) => unknown)(parsed.value));
    }

    return emptyLabel;
  }, [emptyLabel, parsed, registry]);

  if (parsed.parseError !== null) {
    return (
      <WorkbenchParseError role="alert" data-testid="json-widget-preview-error">
        {parsed.parseError}
      </WorkbenchParseError>
    );
  }

  return (
    <WorkbenchRenderSurface
      className={className}
      data-testid="json-widget-preview-output"
    >
      {renderOutput ?? emptyLabel}
    </WorkbenchRenderSurface>
  );
}
