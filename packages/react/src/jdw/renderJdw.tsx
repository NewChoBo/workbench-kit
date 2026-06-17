import { useMemo, type ReactNode } from 'react';
import {
  parseJsonWidgetData,
  validateJsonWidgetData,
  type JsonWidgetNode,
} from '@workbench-kit/jdw';

import { renderJdwWithLayout, type CssRenderBackendOptions } from './cssRenderBackend.js';

export type RenderJdwOptions = CssRenderBackendOptions;

export function renderJdwNode(node: JsonWidgetNode, options: RenderJdwOptions = {}): ReactNode {
  return renderJdwWithLayout(node, options);
}

export function renderJdw(source: string, options: RenderJdwOptions = {}): ReactNode {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return null;
  }

  validateJsonWidgetData(source);
  return renderJdwWithLayout(parsed.value, options);
}

export function useRenderJdw(source: string, options: RenderJdwOptions = {}): ReactNode {
  const { registry, emptyLabel, layoutConstraints } = options;
  return useMemo(
    () => renderJdw(source, { registry, emptyLabel, layoutConstraints }),
    [emptyLabel, layoutConstraints, registry, source],
  );
}
