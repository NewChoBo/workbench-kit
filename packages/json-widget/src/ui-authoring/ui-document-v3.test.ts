import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import type { UiDocumentNodeV3 } from './types.js';

function authored(
  id: string,
  type: string,
  authoring: Readonly<Record<string, unknown>> = {},
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNodeV3 {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1.0.0' },
      properties: {},
      ...authoring,
    },
    ...fields,
  } as UiDocumentNodeV3;
}

function create(root: GenericWidget) {
  return createUiDocumentV3('v3-document', formatWidgetDocumentJson(root));
}

describe('UiDocument V3 persistence', () => {
  it('keeps v0/v1 source compatible and canonicalizes schema-2 responsive state', () => {
    const legacy = create(authored('root', 'column'));
    expect(legacy.issues).toEqual([]);
    expect(
      readUiDocumentNodeAuthoringV3(legacy.document!.root)?.documentSchemaVersion,
    ).toBeUndefined();

    const responsive = create(
      authored('root', 'column', {
        documentSchemaVersion: 2,
        responsiveVariants: [
          { id: 'wide', hostWidth: { minInclusive: 800 } },
          { id: 'compact', hostWidth: { minInclusive: 0, maxExclusive: 800 } },
        ],
      }),
    );
    expect(responsive.issues).toEqual([]);
    expect(readUiDocumentNodeAuthoringV3(responsive.document!.root)?.responsiveVariants).toEqual([
      { id: 'compact', hostWidth: { maxExclusive: 800 } },
      { id: 'wide', hostWidth: { minInclusive: 800 } },
    ]);
  });

  it('fails closed for future schemas, non-root catalogs, and dangling override ids', () => {
    const future = create(
      authored('root', 'column', { documentSchemaVersion: 3 }) as unknown as GenericWidget,
    );
    expect(future.document).toBeNull();
    expect(future.issues.map((issue) => issue.code)).toContain(
      'unsupported-document-schema-version',
    );

    const invalid = create(
      authored(
        'root',
        'column',
        {
          documentSchemaVersion: 2,
          responsiveVariants: [{ id: 'compact', hostWidth: { maxExclusive: 800 } }],
        },
        {
          children: [
            authored('child', 'text', {
              responsiveVariants: [{ id: 'nested', hostWidth: { maxExclusive: 400 } }],
              responsiveOverrides: {
                missing: { properties: { title: { kind: 'literal', value: 'bad' } } },
              },
            }),
          ],
        },
      ),
    );
    expect(invalid.document).toBeNull();
    expect(invalid.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'nonroot-responsive-variant-catalog',
        'responsive-variant-not-found',
      ]),
    );
  });
});
