import { formatWidgetJson, parseWidgetJson } from './parse-widget-json.js';
import type { WidgetPath } from './path.js';
import {
  emptyWidgetSelection,
  firstSelectedWidgetPath,
  type WidgetSelectionState,
} from './selection.js';
import { applyWidgetPatch, type WidgetPatch } from './widget-patch.js';
import { getWidgetAtPath, type GenericWidget } from './widget-tree.js';

export interface JsonWidgetEditorSyncInput {
  readonly document: string;
  readonly baseline?: string | undefined;
  readonly selection: WidgetSelectionState;
  readonly resetSelection?: boolean | undefined;
}

export interface JsonWidgetEditorSyncSnapshot {
  readonly document: string;
  readonly parseError: string | null;
  readonly root: GenericWidget | null;
  readonly selection: WidgetSelectionState;
  readonly selectedPath: WidgetPath | null;
  readonly selectedWidget: GenericWidget | null;
  readonly dirty: boolean;
}

export function createJsonWidgetEditorSyncSnapshot(
  input: JsonWidgetEditorSyncInput,
): JsonWidgetEditorSyncSnapshot {
  const parsed = parseWidgetJson<GenericWidget>(input.document);
  const root = parsed.value;
  const selection = input.resetSelection ? emptyWidgetSelection() : input.selection;
  const selectedPath = firstSelectedWidgetPath(selection);
  const selectedWidget =
    root && selectedPath !== null && selectedPath.length >= 0
      ? getWidgetAtPath(root, selectedPath)
      : null;
  const dirty = input.baseline !== undefined && input.document !== input.baseline;

  return {
    document: input.document,
    parseError: parsed.parseError,
    root,
    selection,
    selectedPath,
    selectedWidget,
    dirty,
  };
}

export function applyWidgetPatchToDocument(
  snapshot: JsonWidgetEditorSyncSnapshot,
  patch: WidgetPatch,
): string | null {
  if (!snapshot.root) return null;

  const result = applyWidgetPatch(snapshot.root, patch);
  if (!result.changed) return null;

  return formatWidgetJson(result.root);
}

export function shouldResetSelectionOnDocumentChange(
  previousDocument: string,
  nextDocument: string,
): boolean {
  return previousDocument !== nextDocument;
}
