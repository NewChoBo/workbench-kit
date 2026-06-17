import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import { parseJsonWidgetData, type LayoutConstraints } from '@workbench-kit/jdw';

import { WorkbenchParseError, WorkbenchRenderSurface } from '../layout/WorkbenchLayout.js';
import { useRenderJdw } from './renderJdw.js';

export interface JdwPreviewProps {
  json: string;
  registry?: WidgetRegistryContract<unknown> | undefined;
  emptyLabel?: string | undefined;
  className?: string | undefined;
  layoutConstraints?: LayoutConstraints | undefined;
}

export function JdwPreview({
  json,
  registry,
  emptyLabel = 'No render output.',
  className,
  layoutConstraints,
}: JdwPreviewProps) {
  const parsed = parseJsonWidgetData(json);
  const renderOutput = useRenderJdw(json, { registry, emptyLabel, layoutConstraints });

  if (parsed.parseError !== null) {
    return (
      <WorkbenchParseError role="alert" data-testid="jdw-preview-error">
        {parsed.parseError}
      </WorkbenchParseError>
    );
  }

  return (
    <WorkbenchRenderSurface className={className} data-testid="jdw-preview-output">
      {renderOutput ?? emptyLabel}
    </WorkbenchRenderSurface>
  );
}
