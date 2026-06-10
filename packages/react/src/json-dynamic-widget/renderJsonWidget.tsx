import { useMemo, type ReactNode } from 'react';
import { parseJsonWidgetData, validateJsonWidgetData, type JsonWidgetNode } from '@workbench-kit/json-widget';

import { renderJsonWidgetWithLayout, type CssRenderBackendOptions } from './cssRenderBackend.js';

export type RenderJsonWidgetOptions = CssRenderBackendOptions;

export function renderJsonWidgetNode(
  node: JsonWidgetNode,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  return renderJsonWidgetWithLayout(node, options);
}

export function renderJsonWidget(
  source: string,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return null;
  }

  validateJsonWidgetData(source);
  return renderJsonWidgetWithLayout(parsed.value, options);
}

export function useRenderJsonWidget(
  source: string,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  const { registry, emptyLabel, layoutConstraints } = options;
  return useMemo(
    () => renderJsonWidget(source, { registry, emptyLabel, layoutConstraints }),
    [emptyLabel, layoutConstraints, registry, source],
  );
}
