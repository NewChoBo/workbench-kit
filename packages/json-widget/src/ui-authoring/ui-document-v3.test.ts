import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import {
  createUiDocumentV3,
  createUiDocumentV3FromRoot,
  readUiDocumentNodeAuthoringV3,
} from './document-v3.js';
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
      authored('root', 'column', { documentSchemaVersion: 4 }) as unknown as GenericWidget,
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

const definition = {
  interfaceVersion: '1',
  parameters: [{ id: 'title', label: 'Title', target: { nodeId: 'text', propertyId: 'text' } }],
};

function instance(
  properties: Readonly<Record<string, unknown>> = {},
  component = { id: 'ui-document:missing', version: '1' },
) {
  return authored('instance', 'composition-instance', { component, properties });
}

function composition(children: readonly GenericWidget[] = [instance()], declaration?: unknown) {
  return authored(
    'root',
    'column',
    {
      documentSchemaVersion: 3,
      ...(declaration === undefined ? {} : { compositionDefinition: declaration }),
    },
    { children },
  );
}

describe('wire 3 composition structure', () => {
  it('round-trips declaration order and sparse literals without resolving any catalogue', () => {
    const root = composition([
      instance({
        title: { kind: 'literal', value: '${item.title}' },
        future: { kind: 'literal', value: false },
      }),
    ]);
    const parsed = create(root);
    expect(parsed.issues).toEqual([]);
    expect(createUiDocumentV3('v3-document', parsed.document!.source).document!.source).toBe(
      parsed.document!.source,
    );
    const declared = create(composition([authored('text', 'text')], definition));
    expect(declared.issues).toEqual([]);
    expect(readUiDocumentNodeAuthoringV3(declared.document!.root)?.compositionDefinition).toEqual(
      definition,
    );
  });

  it.each([undefined, 1, 2])(
    'rejects new semantics mislabeled as historical wire %s',
    (version) => {
      const authoring = version === undefined ? {} : { documentSchemaVersion: version };
      expect(
        create(authored('root', 'column', { ...authoring, compositionDefinition: definition }))
          .document,
      ).toBeNull();
      expect(
        create(authored('root', 'column', authoring, { children: [instance()] })).document,
      ).toBeNull();
      expect(create(authored('root', 'column', authoring)).issues).toEqual([]);
    },
  );

  it.each([null, [], {}, { nested: true }, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects non-scalar instance literal %j',
    (value) => {
      const parsed = createUiDocumentV3FromRoot(
        'consumer',
        0,
        composition([instance({ title: { kind: 'literal', value } })]),
      );
      expect(parsed.document).toBeNull();
    },
  );

  it.each([
    { title: { kind: 'expression', expressionId: 'expression' } },
    { title: { kind: 'literal', value: 'ok', extra: true } },
    { ' title ': { kind: 'literal', value: 'ok' } },
    JSON.parse('{"__proto__":{"kind":"literal","value":"unsafe"}}'),
    { constructor: { kind: 'literal', value: 'unsafe' } },
  ])('rejects malformed scalar envelope %j', (properties) => {
    expect(create(composition([instance(properties)])).document).toBeNull();
  });

  it.each([
    'ui-document:',
    'ui-document:%20bad',
    'ui-document:%2f',
    'ui-document:%zz',
    'ui-document:a/b',
  ])('rejects noncanonical reference %s', (id) => {
    expect(create(composition([instance({}, { id, version: '1' })])).document).toBeNull();
  });

  it('rejects children, extra instance authoring state and reserved projected ids', () => {
    const leaf = instance();
    expect(create(composition([{ ...leaf, children: [] }])).document).toBeNull();
    expect(
      create(composition([{ ...leaf, child: authored('child', 'text') }])).document,
    ).toBeNull();
    expect(
      create(composition([{ ...leaf, $authoring: { ...leaf.$authoring, bindings: {} } }])).document,
    ).toBeNull();
    expect(create(composition([{ ...leaf, id: 'ui-instance:projected' }])).document).toBeNull();
    expect(
      create(
        composition([
          authored('ordinary', 'text', { component: { id: 'ui-document:missing', version: '1' } }),
        ]),
      ).document,
    ).toBeNull();
  });

  it.each([
    { ...definition, extra: true },
    { ...definition, interfaceVersion: ' ' },
    { ...definition, parameters: [...definition.parameters, ...definition.parameters] },
    { ...definition, parameters: [{ ...definition.parameters[0]!, label: '😀'.repeat(81) }] },
    {
      ...definition,
      parameters: [
        {
          ...definition.parameters[0]!,
          target: { nodeId: 'text', propertyId: 'text', path: 'text' },
        },
      ],
    },
    { ...definition, parameters: [{ ...definition.parameters[0]!, default: 'shadow' }] },
  ])('rejects nonexact or duplicate declarations %j', (declaration) => {
    expect(create(composition([], declaration)).document).toBeNull();
  });

  it('rejects non-root declarations and accessors without invoking them', () => {
    expect(
      create(composition([authored('text', 'text', { compositionDefinition: definition })]))
        .document,
    ).toBeNull();
    let reads = 0;
    const properties = Object.defineProperty({}, 'title', {
      enumerable: true,
      get() {
        reads += 1;
        return { kind: 'literal', value: 'unsafe' };
      },
    });
    expect(
      createUiDocumentV3FromRoot('consumer', 0, composition([instance(properties)])).document,
    ).toBeNull();
    expect(reads).toBe(0);
  });
});
