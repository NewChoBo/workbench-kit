import { useMemo, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
  type JsonWidgetNode,
} from '@workbench-kit/json-widget';

import { renderDemoWidgetNode } from '../widget-tree/demo-render.js';

export interface RenderJsonWidgetOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly emptyLabel?: string | undefined;
}

function renderFromRegistry(
  registry: WidgetRegistryContract<unknown>,
  root: ReturnType<typeof jdwNodeToGenericWidget>,
  emptyLabel: string,
): ReactNode {
  const build = registry.get(root.type);
  if (typeof build !== 'function') {
    return emptyLabel;
  }

  const output = (build as (widget: typeof root) => unknown)(root);
  if (output === null || output === undefined) {
    return emptyLabel;
  }

  return output as ReactNode;
}

export function renderJsonWidgetNode(
  node: JsonWidgetNode,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  const root = jdwNodeToGenericWidget(node);
  const { registry, emptyLabel = 'No render output.' } = options;

  if (registry?.has(root.type)) {
    return renderFromRegistry(registry, root, emptyLabel);
  }

  return renderDemoWidgetNode(root) ?? emptyLabel;
}

export function renderJsonWidget(
  source: string,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return null;
  }

  return renderJsonWidgetNode(parsed.value, options);
}

export function useRenderJsonWidget(
  source: string,
  options: RenderJsonWidgetOptions = {},
): ReactNode {
  const { registry, emptyLabel } = options;
  return useMemo(
    () => renderJsonWidget(source, { registry, emptyLabel }),
    [emptyLabel, registry, source],
  );
}
