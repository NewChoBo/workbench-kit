import { describe, expect, it } from 'vitest';

import { formatJsonWidgetData, jdwNodeToGenericWidget, parseJsonWidgetData } from '../jdw/node.js';
import { layoutWidget } from '../layout/layout-widget.js';
import { validateJsonWidgetData } from '../validate/json-widget-data.js';
import {
  expandJsonWidgetDocumentRefs,
  expandJsonWidgetDocumentRefsFromSource,
  isCircularJsonWidgetDocumentRefIssue,
  joinJsonWidgetDocumentPath,
  normalizeJsonWidgetDocumentPath,
} from './document-ref.js';

describe('widget-document-ref', () => {
  it('resolves relative document paths', () => {
    expect(
      joinJsonWidgetDocumentPath('jdw/composed/home.jdw.json', '../parts/header/header.jdw.json'),
    ).toBe('jdw/parts/header/header.jdw.json');
    expect(joinJsonWidgetDocumentPath(null, 'jdw/parts/header/header.jdw.json')).toBe(
      'jdw/parts/header/header.jdw.json',
    );
    expect(normalizeJsonWidgetDocumentPath('jdw/./parts/../parts/header/header.jdw.json')).toBe(
      'jdw/parts/header/header.jdw.json',
    );
  });

  it('expands ref nodes before validate and layout', () => {
    const files: Record<string, string> = {
      'jdw/parts/header/header.jdw.json': formatJsonWidgetData({
        type: 'text',
        args: { text: '${title}', fontSize: 18, color: '#f8fafc' },
      }),
      'jdw/composed/home.refs.jdw.json': formatJsonWidgetData({
        type: 'column',
        args: {
          gap: 8,
          padding: 12,
          children: [
            {
              type: 'ref',
              args: {
                path: '../parts/header/header.jdw.json',
                inputs: { title: 'Imported header' },
              },
            },
            {
              type: 'text',
              args: { text: 'Body', color: '#94a3b8' },
            },
          ],
        },
      }),
    };

    const expanded = expandJsonWidgetDocumentRefsFromSource(
      files['jdw/composed/home.refs.jdw.json']!,
      {
        documentPath: 'jdw/composed/home.refs.jdw.json',
        loadDocument: (path) => files[path] ?? null,
      },
    );

    expect(expanded.issues).toEqual([]);
    expect(expanded.source).not.toBeNull();
    expect(expanded.source).not.toContain('"type": "ref"');
    expect(expanded.source).toContain('Imported header');

    const validated = validateJsonWidgetData(expanded.source!, { strictKnownTypes: true });
    expect(validated.valid).toBe(true);

    const parsed = parseJsonWidgetData(expanded.source!);
    const layout = layoutWidget(jdwNodeToGenericWidget(parsed.value!), {
      minWidth: 0,
      maxWidth: 320,
      minHeight: 0,
      maxHeight: 640,
    });
    expect(layout.rect.height).toBeGreaterThan(0);
  });

  it('rejects missing refs', () => {
    const missing = expandJsonWidgetDocumentRefs(
      {
        type: 'ref',
        args: { path: '../missing.jdw.json' },
      },
      {
        documentPath: 'jdw/composed/home.jdw.json',
        loadDocument: () => null,
      },
    );
    expect(missing.value).toBeNull();
    expect(missing.issues[0]?.code).toBe('missing-document-ref');
  });

  it('rejects self-refs and circular document refs', () => {
    const self = expandJsonWidgetDocumentRefsFromSource(
      formatJsonWidgetData({
        type: 'ref',
        args: { path: './self.jdw.json' },
      }),
      {
        documentPath: 'jdw/self.jdw.json',
        loadDocument: () => null,
      },
    );
    expect(self.value).toBeNull();
    expect(self.issues[0]).toMatchObject({ code: 'circular-document-ref' });
    expect(isCircularJsonWidgetDocumentRefIssue(self.issues[0]!)).toBe(true);
    expect(self.issues[0]?.cycle).toEqual(['jdw/self.jdw.json', 'jdw/self.jdw.json']);

    const files: Record<string, string> = {
      'jdw/a.jdw.json': formatJsonWidgetData({
        type: 'ref',
        args: { path: './b.jdw.json' },
      }),
      'jdw/b.jdw.json': formatJsonWidgetData({
        type: 'ref',
        args: { path: './c.jdw.json' },
      }),
      'jdw/c.jdw.json': formatJsonWidgetData({
        type: 'ref',
        args: { path: './a.jdw.json' },
      }),
    };
    const circular = expandJsonWidgetDocumentRefsFromSource(files['jdw/a.jdw.json']!, {
      documentPath: 'jdw/a.jdw.json',
      loadDocument: (path) => files[path] ?? null,
    });
    expect(circular.value).toBeNull();
    expect(circular.issues[0]?.code).toBe('circular-document-ref');
    expect(circular.issues[0]?.message).toContain('not allowed');
    expect(circular.issues[0]?.cycle).toEqual([
      'jdw/a.jdw.json',
      'jdw/b.jdw.json',
      'jdw/c.jdw.json',
      'jdw/a.jdw.json',
    ]);
  });
});
