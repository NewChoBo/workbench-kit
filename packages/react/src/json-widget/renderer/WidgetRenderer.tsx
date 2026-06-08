import { createElement } from 'react';
import type { GenericWidget } from '@workbench-kit/json-widget';

import type { WidgetRendererComponent, WidgetRendererProps } from './contract.js';
import { useWidgetRendererRegistry } from './context.js';
import { getBuiltinWidgetRenderer } from './builtin-renderers.js';
import { positionStyle } from './prop-readers.js';

/**
 * Renders a single widget node to real DOM. Resolution order:
 *   1. consumer registry (unless `bypassRegistry`) — domain-specific types
 *   2. generic builtin renderers — layout containers + basic leaves
 *   3. neutral placeholder for unknown types
 *
 * Layout renderers recurse back through this component, so the registry is
 * honored for nested custom widgets at any depth.
 */
export function WidgetRenderer({
  widget,
  rect,
  bypassRegistry,
  fillParent,
  onEvent,
}: WidgetRendererProps) {
  const registry = useWidgetRendererRegistry();
  const registered = bypassRegistry ? undefined : registry?.get(widget.type);
  const renderer =
    (registered as WidgetRendererComponent | undefined) ?? getBuiltinWidgetRenderer(widget.type);

  if (renderer) {
    return createElement(renderer, {
      widget,
      rect,
      ...(fillParent !== undefined ? { fillParent } : {}),
      ...(onEvent !== undefined ? { onEvent } : {}),
    });
  }

  return <UnknownWidget widget={widget} rect={rect} fillParent={fillParent} />;
}

function UnknownWidget({
  widget,
  rect,
  fillParent,
}: Pick<WidgetRendererProps, 'widget' | 'rect' | 'fillParent'>) {
  return (
    <div
      data-widget-type="unknown"
      data-widget-unknown-type={(widget as GenericWidget).type}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'grid',
        placeItems: 'center',
        color: '#94a3b8',
        fontSize: 12,
        background: '#111827',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {(widget as GenericWidget).type}
    </div>
  );
}
