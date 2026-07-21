import {
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
} from './jdw-node.js';
import type { GenericWidget } from './widget-tree.js';

/**
 * Canonical authoring snapshot for a JDW widget resource.
 *
 * `source` is the persisted JDW JSON and `root` is its parsed editable
 * `GenericWidget` projection. Authoring surfaces should share this document
 * path and commit changes with `WidgetPatch`; they must not treat a Screen Spec
 * as a parallel editable source of truth.
 */
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
