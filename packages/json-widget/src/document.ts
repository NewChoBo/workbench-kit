import { formatWidgetJson, parseWidgetJson } from './parse-widget-json.js';
import type { GenericWidget } from './widget-tree.js';

export interface WidgetDocument {
  readonly source: string;
  readonly parseError: string | null;
  readonly root: GenericWidget | null;
}

export function createWidgetDocument(source: string): WidgetDocument {
  const parsed = parseWidgetJson<GenericWidget>(source);
  return {
    source,
    parseError: parsed.parseError,
    root: parsed.value,
  };
}

export const EMPTY_WIDGET_DOCUMENT = formatWidgetJson({ type: 'column', children: [] });
