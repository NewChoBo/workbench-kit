import { formatWidgetDocumentJson, createWidgetDocument } from './document.js';
import { applyWidgetPatch, type WidgetPatch } from './widget-patch.js';

export function applyWidgetDocumentPatch(source: string, patch: WidgetPatch): string | null {
  const document = createWidgetDocument(source);
  if (document.parseError !== null || document.root === null) {
    return null;
  }

  const result = applyWidgetPatch(document.root, patch);
  if (!result.changed) {
    return source;
  }

  return formatWidgetDocumentJson(result.root);
}
