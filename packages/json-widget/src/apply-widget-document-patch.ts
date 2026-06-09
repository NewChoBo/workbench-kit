import { formatWidgetJson, parseWidgetJson } from './parse-widget-json.js';
import type { GenericWidget } from './widget-tree.js';
import { applyWidgetPatch, type WidgetPatch } from './widget-patch.js';

export function applyWidgetDocumentPatch(source: string, patch: WidgetPatch): string | null {
  const parsed = parseWidgetJson(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return null;
  }

  const result = applyWidgetPatch(parsed.value as GenericWidget, patch);
  if (!result.changed) {
    return source;
  }

  return formatWidgetJson(result.root);
}
