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
