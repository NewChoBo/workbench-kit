import { describe, expect, it } from 'vitest';

import {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  shouldResetSelectionOnDocumentChange,
} from './editor-sync.js';
import { formatWidgetJson } from './parse-widget-json.js';
import { appendChildrenPath, ROOT_WIDGET_PATH } from './path.js';
import { emptyWidgetSelection, selectWidgetPath } from './selection.js';
import type { GenericWidget } from './widget-tree.js';

const sampleWidget: GenericWidget = {
  type: 'demo:card',
  title: 'Launch tile',
  body: 'Preview body',
};

describe('json widget editor sync', () => {
  it('derives parse, selection, and dirty state from document input', () => {
    const document = formatWidgetJson(sampleWidget);
    const baseline = document;
    const selection = selectWidgetPath(emptyWidgetSelection(), ROOT_WIDGET_PATH);

    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document,
      baseline,
      selection,
    });

    expect(snapshot.parseError).toBeNull();
    expect(snapshot.root).toEqual(sampleWidget);
    expect(snapshot.selectedPath).toEqual([]);
    expect(snapshot.selectedWidget).toEqual(sampleWidget);
    expect(snapshot.dirty).toBe(false);
  });

  it('marks dirty when document differs from baseline', () => {
    const baseline = formatWidgetJson(sampleWidget);
    const document = formatWidgetJson({ ...sampleWidget, title: 'Changed' });

    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document,
      baseline,
      selection: emptyWidgetSelection(),
    });

    expect(snapshot.dirty).toBe(true);
  });

  it('surfaces parse errors without a root widget', () => {
    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document: '{',
      selection: emptyWidgetSelection(),
    });

    expect(snapshot.parseError).not.toBeNull();
    expect(snapshot.root).toBeNull();
    expect(snapshot.selectedWidget).toBeNull();
  });

  it('resets selection when resetSelection is requested', () => {
    const document = formatWidgetJson(sampleWidget);
    const selection = selectWidgetPath(emptyWidgetSelection(), ROOT_WIDGET_PATH);

    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document,
      selection,
      resetSelection: true,
    });

    expect(snapshot.selection.pathKeys.size).toBe(0);
    expect(snapshot.selectedPath).toBeNull();
  });

  it('applies replace-widget patches back to document text', () => {
    const document = formatWidgetJson(sampleWidget);
    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document,
      selection: selectWidgetPath(emptyWidgetSelection(), ROOT_WIDGET_PATH),
    });

    const nextDocument = applyWidgetPatchToDocument(snapshot, {
      type: 'replace-widget',
      path: ROOT_WIDGET_PATH,
      widget: { ...sampleWidget, title: 'Updated title' },
    });

    expect(nextDocument).toContain('Updated title');
  });

  it('detects external document changes for selection reset', () => {
    expect(shouldResetSelectionOnDocumentChange('a', 'b')).toBe(true);
    expect(shouldResetSelectionOnDocumentChange('same', 'same')).toBe(false);
  });
});

describe('json widget editor sync selection path', () => {
  it('resolves selected widget at nested path', () => {
    const nested: GenericWidget = {
      type: 'demo:layout',
      children: [{ type: 'demo:card', title: 'Child' }],
    };
    const document = formatWidgetJson(nested);
    const childPath = appendChildrenPath(ROOT_WIDGET_PATH, 0);

    const snapshot = createJsonWidgetEditorSyncSnapshot({
      document,
      selection: selectWidgetPath(emptyWidgetSelection(), childPath),
    });

    expect(snapshot.selectedWidget).toEqual({ type: 'demo:card', title: 'Child' });
  });
});
