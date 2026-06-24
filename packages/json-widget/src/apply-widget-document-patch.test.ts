import { describe, expect, it } from 'vitest';

import { applyWidgetDocumentPatch } from './apply-widget-document-patch.js';
import { formatWidgetDocumentJson } from './document.js';

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
