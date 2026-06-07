import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, type WidgetDefinition } from '@workbench-kit/json-widget';

import type { WidgetRendererComponent } from './contract.js';
import type { WidgetRendererRegistry } from './context.js';

export type WidgetRendererDefinition = WidgetDefinition<WidgetTypeShape, WidgetRendererComponent>;

/**
 * Builds a renderer registry for consumer-supplied widget types. Builtin
 * layout/leaf renderers are resolved as a fallback by `WidgetRenderer`, so this
 * registry only needs the domain-specific renderers (e.g. `tile`, `clock`).
 * Registering a builtin type here overrides the builtin renderer.
 */
export function createWidgetRendererRegistry(
  entries: readonly WidgetRendererDefinition[] = [],
): WidgetRendererRegistry {
  return createWidgetRegistry<WidgetRendererComponent>(entries);
}
