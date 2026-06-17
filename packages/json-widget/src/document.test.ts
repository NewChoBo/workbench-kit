import { describe, expect, it } from 'vitest';

import { createWidgetDocument, EMPTY_WIDGET_DOCUMENT } from './document.js';
import { formatJsonWidgetData } from './jdw-node.js';

describe('createWidgetDocument', () => {
  it('parses JDW widget documents into flat roots for tree ops', () => {
    const source = formatJsonWidgetData({
      type: 'text',
      args: { text: 'Hello' },
    });
    const document = createWidgetDocument(source);

    expect(document.parseError).toBeNull();
    expect(document.root).toEqual({ type: 'text', text: 'Hello' });
    expect(document.source).toBe(source);
  });

  it('surfaces parse errors without a root', () => {
    const document = createWidgetDocument('{');

    expect(document.parseError).not.toBeNull();
    expect(document.root).toBeNull();
  });

  it('exposes an empty JDW column document', () => {
    const document = createWidgetDocument(EMPTY_WIDGET_DOCUMENT);

    expect(document.parseError).toBeNull();
    expect(document.root).toEqual({ type: 'column', children: [] });
  });
});
