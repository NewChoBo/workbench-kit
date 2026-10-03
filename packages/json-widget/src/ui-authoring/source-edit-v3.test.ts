import { describe, expect, it } from 'vitest';
import { formatWidgetDocumentJson } from '../document/document.js';
import { createUiDocumentV3 } from './document-v3.js';
import { prepareUiSourceEditV3 } from './source-edit-v3.js';
import type { GenericWidget } from '../widget/tree.js';

function fixture() {
  return createUiDocumentV3(
    'source-document',
    formatWidgetDocumentJson({
      id: 'root',
      type: 'board',
      children: [],
      $authoring: {
        documentSchemaVersion: 2,
        component: { id: 'test:board', version: '1' },
        properties: { label: { kind: 'literal', value: 'Board' } },
      },
    } as GenericWidget),
  ).document!;
}
function edit(root: GenericWidget, modify: (value: GenericWidget) => void) {
  const value = structuredClone(root);
  modify(value);
  return formatWidgetDocumentJson(value);
}

describe('bounded V3 source preparation', () => {
  it('preserves original source and identity for formatting and object key-order edits', () => {
    const document = fixture();
    const reverse = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(reverse)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .reverse()
                .map(([key, child]) => [key, reverse(child)]),
            )
          : value;
    const formatted = JSON.stringify(reverse(JSON.parse(document.source)), null, 4);
    expect(prepareUiSourceEditV3(document, document.source, formatted)).toEqual({ document });
    expect(prepareUiSourceEditV3(document, document.source, formatted).document).toBe(document);
  });
  it('rejects stale source before parsing or creating another identity', () => {
    const document = fixture();
    expect(prepareUiSourceEditV3(document, 'older', '{')).toMatchObject({
      error: expect.stringContaining('changed'),
    });
  });
  it.each([
    [
      'id',
      (root: GenericWidget) => {
        root.id = 'other';
      },
    ],
    [
      'type',
      (root: GenericWidget) => {
        Object.assign(root, { type: 'other' });
      },
    ],
    [
      'component',
      (root: GenericWidget) => {
        (root.$authoring as { component: { version: string } }).component.version = '2';
      },
    ],
    [
      'schema',
      (root: GenericWidget) => {
        (root.$authoring as { documentSchemaVersion: number }).documentSchemaVersion = 3;
      },
    ],
  ])('rejects root %s changes', (_name, modify) => {
    const document = fixture();
    expect(
      prepareUiSourceEditV3(document, document.source, edit(document.root, modify)).error,
    ).toBeTruthy();
  });
  it.each([
    '{',
    '{"type":"board","args":{"id":"root","__proto__":{}}}',
    '{"constructor":{}}',
    '{"prototype":{}}',
    '{"value":1e1000}',
    ' '.repeat(2 * 1024 * 1024 + 1),
    '['.repeat(66) + '0' + ']'.repeat(66),
    JSON.stringify(Array.from({ length: 100_001 }, () => 0)),
  ])('rejects invalid or unbounded source %# without recursive parsing', (source) => {
    const document = fixture();
    expect(prepareUiSourceEditV3(document, document.source, source).error).toBeTruthy();
  });
  it('uses UTF-8 bytes for the source limit', () => {
    const document = fixture();
    expect(
      prepareUiSourceEditV3(document, document.source, JSON.stringify('가'.repeat(800_000))).error,
    ).toContain('2 MiB');
  });
  it('rejects extra persistence wrapper fields and silently normalized args', () => {
    const document = fixture();
    for (const modify of [
      (raw: Record<string, unknown>) => {
        raw.documentId = 'unrelated-document';
      },
      (raw: Record<string, unknown>) => {
        (raw.args as Record<string, unknown>).ignored = null;
      },
    ]) {
      const raw = JSON.parse(document.source) as Record<string, unknown>;
      modify(raw);
      expect(prepareUiSourceEditV3(document, document.source, JSON.stringify(raw)).error).toContain(
        'canonical authored',
      );
    }
  });
});
