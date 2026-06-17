import {
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
} from './jdw-node.js';
import type { GenericWidget } from './widget-tree.js';

export interface WidgetDocument {
  readonly source: string;
  readonly parseError: string | null;
  readonly root: GenericWidget | null;
}

export function createWidgetDocument(source: string): WidgetDocument {
  const parsed = parseJsonWidgetData(source);
  return {
    source,
    parseError: parsed.parseError,
    root: parsed.value ? jdwNodeToGenericWidget(parsed.value) : null,
  };
}

export function formatWidgetDocumentJson(root: GenericWidget): string {
  return formatJsonWidgetData(genericWidgetToJdwNode(root));
}

export const EMPTY_WIDGET_DOCUMENT = formatJsonWidgetData({
  type: 'column',
  args: { children: [] },
});
