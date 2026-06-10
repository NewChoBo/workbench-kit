import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import { parseJsonWidgetData } from '@workbench-kit/json-widget';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout';
import { useRenderJsonWidget } from '../json-dynamic-widget/renderJsonWidget.js';

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
  const parsed = parseJsonWidgetData(json);
  const renderOutput = useRenderJsonWidget(json, { registry, emptyLabel });

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
