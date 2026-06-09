import { describe, expect, it } from 'vitest';

import { applyWidgetDocumentPatch } from './apply-widget-document-patch.js';
import { formatWidgetJson } from './parse-widget-json.js';

describe('applyWidgetDocumentPatch', () => {
  it('replaces a widget and returns formatted JSON', () => {
    const source = formatWidgetJson({
      type: 'column',
      children: [{ type: 'text', text: 'Welcome' }],
    });

    const next = applyWidgetDocumentPatch(source, {
      type: 'replace-widget',
      path: [{ kind: 'children', index: 0 }],
      widget: { type: 'text', text: 'Updated' },
    });

    expect(next).toContain('"Updated"');
  });

  it('returns null when the source document cannot be parsed', () => {
    expect(
      applyWidgetDocumentPatch('{', {
        type: 'replace-widget',
        path: [],
        widget: { type: 'text', text: 'Broken' },
      }),
    ).toBeNull();
  });
});
