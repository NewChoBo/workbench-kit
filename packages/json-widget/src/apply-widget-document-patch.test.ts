import { describe, expect, it } from 'vitest';

import { applyWidgetDocumentPatch } from './apply-widget-document-patch.js';
import { createWidgetDocument, formatWidgetDocumentJson } from './document.js';
import { createWidgetResizePatch } from './layout/layout-mapping.js';
import { layoutWidget } from './layout/layout-widget.js';
import { appendBoxChildPath, appendChildrenPath, ROOT_WIDGET_PATH } from './path.js';

describe('applyWidgetDocumentPatch', () => {
  it('applies a patch and re-serializes as JDW JSON', () => {
    const source = formatWidgetDocumentJson({
      type: 'column',
      children: [{ type: 'text', text: 'Before' }],
    });

    const next = applyWidgetDocumentPatch(source, {
      type: 'replace-widget',
      path: [{ kind: 'children', index: 0 }],
      widget: { type: 'text', text: 'After' },
    });

    expect(next).toContain('"text": "After"');
    expect(next).toContain('"args"');
  });

  it('updates stack child placement fields', () => {
    const source = formatWidgetDocumentJson({
      type: 'stack',
      width: 360,
      height: 220,
      children: [
        {
          type: 'text',
          text: 'Floating label',
          left: 12,
          top: 16,
          right: 120,
          bottom: 180,
        },
      ],
    });

    const next = applyWidgetDocumentPatch(source, {
      type: 'replace-widget',
      path: [{ kind: 'children', index: 0 }],
      widget: {
        type: 'text',
        text: 'Floating label',
        left: 13,
        top: 17,
        right: 121,
        bottom: 181,
      },
    });

    expect(next).toContain('"left": 13');
    expect(next).toContain('"top": 17');
    expect(next).toContain('"right": 121');
    expect(next).toContain('"bottom": 181');
  });

  it('updates grid child placement fields', () => {
    const source = formatWidgetDocumentJson({
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', text: 'Cell label', col: 1, row: 0 }],
    });

    const next = applyWidgetDocumentPatch(source, {
      type: 'replace-widget',
      path: [{ kind: 'children', index: 0 }],
      widget: { type: 'text', text: 'Cell label', col: 0, row: 1 },
    });

    expect(next).toContain('"col": 0');
    expect(next).toContain('"row": 1');
  });

  it('applies linear resize patches through document serialization', () => {
    const source = formatWidgetDocumentJson({
      type: 'row',
      width: 300,
      height: 120,
      children: [
        { type: 'text', text: 'A', flex: 1, flexFit: 'tight' },
        { type: 'text', text: 'B', flex: 1 },
      ],
    });
    const document = createWidgetDocument(source);
    const layout =
      document.root !== null
        ? layoutWidget(document.root, { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 120 })
        : null;
    const patch =
      document.root !== null && layout !== null
        ? createWidgetResizePatch({
            root: document.root,
            layout,
            path: appendChildrenPath(ROOT_WIDGET_PATH, 0),
            position: 'se',
            deltaX: -30,
            deltaY: -40,
          })
        : null;

    expect(patch).not.toBeNull();
    const next = patch ? applyWidgetDocumentPatch(source, patch) : null;

    expect(next).toContain('"type": "text"');
    expect(next).toContain('"width": 120');
    expect(next).toContain('"height": 80');
    expect(next).toContain('"align": "start"');
    expect(next).not.toContain('"text": "A",\n            "flex"');
    expect(next).toContain('"type": "expanded"');
  });

  it('applies wrapper child resize patches through document serialization', () => {
    const source = formatWidgetDocumentJson({
      type: 'center',
      width: 200,
      height: 120,
      child: { type: 'text', text: 'Wrapped', width: 100, height: 60 },
    });
    const document = createWidgetDocument(source);
    const layout =
      document.root !== null
        ? layoutWidget(document.root, { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 120 })
        : null;
    const patch =
      document.root !== null && layout !== null
        ? createWidgetResizePatch({
            root: document.root,
            layout,
            path: appendBoxChildPath(ROOT_WIDGET_PATH),
            position: 'se',
            deltaX: 20,
            deltaY: 10,
          })
        : null;

    expect(patch).not.toBeNull();
    const next = patch ? applyWidgetDocumentPatch(source, patch) : null;
    const snapshot = next ? JSON.parse(next) : null;

    expect(snapshot?.args?.child?.type).toBe('text');
    expect(snapshot?.args?.child?.args).toMatchObject({
      text: 'Wrapped',
      width: 120,
      height: 70,
    });
  });

  it('returns null for invalid source JSON', () => {
    expect(
      applyWidgetDocumentPatch('{', {
        type: 'replace-widget',
        path: [],
        widget: { type: 'text', text: 'After' },
      }),
    ).toBeNull();
  });
});
