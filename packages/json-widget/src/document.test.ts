import { describe, expect, it } from 'vitest';

import { createWidgetDocument, EMPTY_WIDGET_DOCUMENT } from './document.js';
import { formatWidgetJson } from './parse-widget-json.js';

describe('createWidgetDocument', () => {
  it('parses valid widget JSON into a document snapshot', () => {
    const source = formatWidgetJson({ type: 'text', text: 'Hello' });
    const document = createWidgetDocument(source);

    expect(document.parseError).toBeNull();
    expect(document.root).toEqual({ type: 'text', text: 'Hello' });
    expect(document.source).toBe(source);
  });

  it('surfaces parse errors without a root widget', () => {
    const document = createWidgetDocument('{');

    expect(document.parseError).not.toBeNull();
    expect(document.root).toBeNull();
  });
});

describe('EMPTY_WIDGET_DOCUMENT', () => {
  it('starts from an empty column root', () => {
    const document = createWidgetDocument(EMPTY_WIDGET_DOCUMENT);

    expect(document.parseError).toBeNull();
    expect(document.root).toEqual({ type: 'column', children: [] });
  });
});
