import type {
  UiComponentDescriptor,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
  UiValueSource,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import {
  describeUiCompositionDefinition,
  resolveUiCompositionInstances,
  uiCompositionComponentRef,
} from './composition.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import {
  applyAdmittedUiAuthoringSessionCommandV3,
  type UiDocumentCommandV3AdmissionContext,
} from './semantic-admission-v3.js';
import { createUiAuthoringSessionV3 } from './session-v3.js';
import type { UiDocumentV3 } from './types.js';

const SOURCE_HASH = 'a'.repeat(64);
const NEXT_SOURCE_HASH = 'b'.repeat(64);
const COMPONENTS: readonly UiComponentDescriptor[] = [
  {
    id: 'test:freeform',
    version: '1',
    kind: 'composite',
    compositionRef: 'test:freeform',
    properties: [],
    layout: { supportedStrategyIds: ['builtin.canvas'] },
    designTime: { label: 'Freeform' },
  },
  {
    id: 'test:text',
    version: '1',
    kind: 'atomic',
    properties: [
      {
        id: 'text',
        required: true,
        value: { type: 'string', defaultValue: 'Stale descriptor default' },
      },
    ],
    layout: { supportedStrategyIds: ['builtin.canvas'] },
    designTime: { label: 'Text' },
  },
  {
    id: 'test:image',
    version: '1',
    kind: 'atomic',
    properties: [
      { id: 'assetRef', required: true, value: { type: 'string' } },
      { id: 'opacity', value: { type: 'number', constraints: { min: 0, max: 1 } } },
      { id: 'visible', value: { type: 'boolean' } },
    ],
    layout: { supportedStrategyIds: ['builtin.canvas'] },
    designTime: { label: 'Image' },
  },
];
const LAYOUT_PROPERTIES: readonly UiLayoutPropertyDescriptor[] = [
  {
    id: 'placement',
    scope: 'child',
    group: 'canvas',
    strategyKinds: ['canvas'],
    value: { type: 'layout.canvas-placement' },
  },
];
const LAYOUT_STRATEGIES: readonly UiLayoutStrategyDescriptor[] = [
  {
    id: 'builtin.canvas',
    kind: 'canvas',
    supportedContainerProperties: [],
    supportedChildProperties: ['placement'],
  },
];

function literal(value: string | number | boolean): UiValueSource {
  return { kind: 'literal', value };
}

function placement(x: number, y: number, width: number, height: number) {
  return {
    strategyId: 'builtin.canvas',
    values: {
      placement: {
        kind: 'literal',
        value: {
          kind: 'canvas-placement',
          x: { kind: 'length', value: x, unit: 'px' },
          y: { kind: 'length', value: y, unit: 'px' },
          width: { kind: 'length', value: width, unit: 'px' },
          height: { kind: 'length', value: height, unit: 'px' },
          anchor: 'top-start',
          zIndex: 0,
        },
      },
    },
  } as const;
}

function authored(
  id: string,
  type: string,
  properties: Readonly<Record<string, UiValueSource>> = {},
  authoring: Readonly<Record<string, unknown>> = {},
  fields: Readonly<Record<string, unknown>> = {},
): GenericWidget {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1' },
      properties,
      ...authoring,
    },
    ...fields,
  };
}

function parse(documentId: string, root: GenericWidget): UiDocumentV3 {
  const result = createUiDocumentV3(documentId, formatWidgetDocumentJson(root));
  expect(result.issues).toEqual([]);
  expect(result.document).not.toBeNull();
  return result.document!;
}

function definitionRoot(title = 'Template title', artwork = 'asset:one'): GenericWidget {
  return authored(
    'definition-root',
    'freeform',
    {},
    {
      documentSchemaVersion: 3,
      compositionDefinition: {
        interfaceVersion: '1',
        parameters: [
          { id: 'title', label: 'Title', target: { nodeId: 'title-node', propertyId: 'text' } },
          {
            id: 'artwork',
            label: 'Artwork',
            target: { nodeId: 'artwork-node', propertyId: 'assetRef' },
          },
          {
            id: 'opacity',
            label: 'Opacity',
            target: { nodeId: 'artwork-node', propertyId: 'opacity' },
          },
          {
            id: 'visible',
            label: 'Visible',
            target: { nodeId: 'artwork-node', propertyId: 'visible' },
          },
        ],
      },
    },
    {
      children: [
        authored('title-node', 'text', { text: literal(title) }),
        authored(
          'artwork-node',
          'image',
          { assetRef: literal(artwork), opacity: literal(1), visible: literal(true) },
          { layout: placement(12, 24, 240, 180) },
        ),
      ],
    },
  );
}

function definition(title?: string, artwork?: string, documentId = 'definition'): UiDocumentV3 {
  return parse(documentId, definitionRoot(title, artwork));
}

function instance(
  id: string,
  properties: Readonly<Record<string, UiValueSource>> = {},
  documentId = 'definition',
  interfaceVersion = '1',
): GenericWidget {
  return authored(id, 'composition-instance', properties, {
    component: uiCompositionComponentRef(documentId, interfaceVersion),
    layout: placement(40, 60, 120, 90),
  });
}

function consumer(children = [instance('instance-a')], documentId = 'consumer'): UiDocumentV3 {
  return parse(
    documentId,
    authored('consumer-root', 'freeform', {}, { documentSchemaVersion: 3 }, { children }),
  );
}

function context(
  definitions: readonly UiDocumentV3[] = [definition()],
  overrides: Partial<UiDocumentCommandV3AdmissionContext> = {},
): UiDocumentCommandV3AdmissionContext {
  return {
    componentCatalog: {
      component: (ref) =>
        COMPONENTS.find(({ id, version }) => id === ref.id && version === ref.version),
      components: () => COMPONENTS,
    },
    layoutProperties: LAYOUT_PROPERTIES,
    layoutStrategies: LAYOUT_STRATEGIES,
    compositionDefinitions: definitions.map((document) => ({ document, sourceHash: SOURCE_HASH })),
    validateLiteral: ({ component, property, value }) =>
      component.id === 'test:image' &&
      property.id === 'assetRef' &&
      (typeof value !== 'string' || !value.startsWith('asset:'))
        ? 'Artwork requires an asset reference.'
        : null,
    ...overrides,
  };
}

function node(root: GenericWidget, nodeId: string): GenericWidget {
  const found = collectWidgetNodes(root).find(({ widget }) => widget.id === nodeId)?.widget;
  expect(found, `Expected node ${nodeId}`).toBeDefined();
  return found!;
}

function projectedId(
  consumerDocumentId: string,
  instanceNodeId: string,
  definitionDocumentId: string,
  definitionNodeId: string,
): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify([consumerDocumentId, instanceNodeId, definitionDocumentId, definitionNodeId]),
  );
  return `ui-instance:${btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;
}

function projectedNode(
  root: GenericWidget,
  instanceNodeId: string,
  definitionNodeId: string,
): GenericWidget {
  return node(root, projectedId('consumer', instanceNodeId, 'definition', definitionNodeId));
}

function properties(widget: GenericWidget) {
  return readUiDocumentNodeAuthoringV3(widget)!.properties;
}

describe('reusable composition definition descriptors', () => {
  it('derives ordered scalar settings and current defaults from exact authored targets', () => {
    const document = definition();
    const result = describeUiCompositionDefinition(document, context([document]));

    expect(result.diagnostics).toEqual([]);
    expect(result.descriptor).toMatchObject({
      ...uiCompositionComponentRef('definition', '1'),
      kind: 'composite',
      properties: [
        { id: 'title', required: false, value: { type: 'string', defaultValue: 'Template title' } },
        { id: 'artwork', required: false, value: { type: 'string', defaultValue: 'asset:one' } },
        {
          id: 'opacity',
          required: false,
          value: { type: 'number', defaultValue: 1, constraints: { min: 0, max: 1 } },
        },
        { id: 'visible', required: false, value: { type: 'boolean', defaultValue: true } },
      ],
    });
    expect(result.parameters[0]).toMatchObject({
      id: 'title',
      label: 'Title',
      target: { nodeId: 'title-node', propertyId: 'text' },
      component: { id: 'test:text', version: '1' },
      property: { id: 'text', required: true, value: { type: 'string' } },
      defaultValue: 'Template title',
    });
    const updated = definition('Updated template', 'asset:two');
    const updatedResult = describeUiCompositionDefinition(updated, context([updated]));
    expect(updatedResult.parameters.map(({ defaultValue }) => defaultValue)).toEqual([
      'Updated template',
      'asset:two',
      1,
      true,
    ]);
    expect(document.source).not.toContain('defaultValue');
  });

  it('requires an exact target component instead of selecting another version', () => {
    const document = definition();
    const result = describeUiCompositionDefinition(
      document,
      context([document], {
        componentCatalog: {
          component: (ref) =>
            COMPONENTS.find(
              ({ id, version }) => id === ref.id && version === ref.version && id !== 'test:text',
            ),
          components: () => COMPONENTS.map((entry) => ({ ...entry, version: '2' })),
        },
      }),
    );
    expect(result.descriptor).toBeNull();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'definition-target-unavailable' })]),
    );
  });

  it('validates defaults with the original target literal policy', () => {
    const document = definition('Template title', 'https://example.invalid/image.png');
    const calls: Array<{
      componentId: string;
      nodeId: string;
      propertyId: string;
      value: unknown;
    }> = [];
    const policyContext = context([document], {
      validateLiteral: ({ component, nodeId, property, value }) => {
        calls.push({ componentId: component.id, nodeId, propertyId: property.id, value });
        return property.id === 'assetRef' ? 'Asset is unavailable.' : null;
      },
    });
    const result = describeUiCompositionDefinition(document, policyContext);
    expect(result.descriptor).toBeNull();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-composition-definition' })]),
    );
    expect(calls).toContainEqual({
      componentId: 'test:image',
      nodeId: 'artwork-node',
      propertyId: 'assetRef',
      value: 'https://example.invalid/image.png',
    });
  });

  it('rejects missing targets and nonliteral defaults instead of using descriptor defaults', () => {
    const missingRoot = definitionRoot();
    (missingRoot.children as GenericWidget[]).shift();
    const missing = parse('definition', missingRoot);
    expect(describeUiCompositionDefinition(missing, context([missing])).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'definition-target-unavailable' })]),
    );

    const nonliteralRoot = definitionRoot();
    const text = (nonliteralRoot.children as GenericWidget[])[0]!;
    (text.$authoring as { properties: Record<string, UiValueSource> }).properties.text = {
      kind: 'binding',
      bindingId: 'external-title',
    };
    const nonliteral = parse('definition', nonliteralRoot);
    const result = describeUiCompositionDefinition(nonliteral, context([nonliteral]));
    expect(result.descriptor).toBeNull();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-composition-definition' })]),
    );
  });
});

describe('one-level reusable composition resolution', () => {
  it('projects independent sparse instances without changing authored source or geometry', () => {
    const template = definition();
    const document = consumer([
      instance('instance-a', { title: literal('Alpha') }),
      instance('instance-b', { title: literal('Beta') }),
    ]);
    const originalSource = document.source;
    const templateSource = template.source;
    const result = resolveUiCompositionInstances(document, context([template]));

    expect(result.diagnostics).toEqual([]);
    expect(result.dependencies).toEqual([
      { documentId: 'definition', interfaceVersion: '1', sourceHash: SOURCE_HASH },
    ]);
    for (const [instanceId, title] of [
      ['instance-a', 'Alpha'],
      ['instance-b', 'Beta'],
    ] as const) {
      const wrapper = node(result.root, instanceId);
      expect(wrapper.type).toBe('composition-instance');
      expect(wrapper.$authoring).toEqual(node(document.root, instanceId).$authoring);
      expect((wrapper.child as GenericWidget).id).toBe(
        projectedId('consumer', instanceId, 'definition', 'definition-root'),
      );
      expect(properties(projectedNode(result.root, instanceId, 'title-node')).text).toEqual(
        literal(title),
      );
      const artwork = projectedNode(result.root, instanceId, 'artwork-node');
      expect(properties(artwork).assetRef).toEqual(literal('asset:one'));
      expect(readUiDocumentNodeAuthoringV3(artwork)?.layout).toEqual(placement(12, 24, 240, 180));
      expect(result.provenance[artwork.id as string]).toEqual({
        consumerDocumentId: 'consumer',
        instanceNodeId: instanceId,
        definitionDocumentId: 'definition',
        definitionNodeId: 'artwork-node',
        interfaceVersion: '1',
        sourceHash: SOURCE_HASH,
        parameters: {
          title: 'override',
          artwork: 'template',
          opacity: 'template',
          visible: 'template',
        },
      });
    }
    expect(document.source).toBe(originalSource);
    expect(template.source).toBe(templateSource);
    expect(collectWidgetNodes(document.root).map(({ widget }) => widget.id)).toEqual([
      'consumer-root',
      'instance-a',
      'instance-b',
    ]);
    expect(resolveUiCompositionInstances(document, context([template]))).toEqual(result);
  });

  it('treats empty strings, zero, false and values equal to the default as explicit overrides', () => {
    const document = consumer([
      instance('instance-a', {
        title: literal(''),
        artwork: literal('asset:one'),
        opacity: literal(0),
        visible: literal(false),
      }),
      instance('instance-b'),
    ]);
    const result = resolveUiCompositionInstances(document, context());
    expect(result.diagnostics).toEqual([]);
    expect(properties(projectedNode(result.root, 'instance-a', 'title-node')).text).toEqual(
      literal(''),
    );
    expect(properties(projectedNode(result.root, 'instance-a', 'artwork-node'))).toMatchObject({
      assetRef: literal('asset:one'),
      opacity: literal(0),
      visible: literal(false),
    });
    expect(
      result.provenance[projectedId('consumer', 'instance-a', 'definition', 'title-node')]
        ?.parameters,
    ).toEqual({
      title: 'override',
      artwork: 'override',
      opacity: 'override',
      visible: 'override',
    });
    expect(
      result.provenance[projectedId('consumer', 'instance-b', 'definition', 'title-node')]
        ?.parameters,
    ).toEqual({
      title: 'template',
      artwork: 'template',
      opacity: 'template',
      visible: 'template',
    });
    expect(properties(node(document.root, 'instance-b'))).toEqual({});
  });

  it('keeps placeholder-shaped input as literal text', () => {
    const value = '${item.title}';
    const document = consumer([instance('instance-a', { title: literal(value) })]);
    const result = resolveUiCompositionInstances(document, context());
    expect(result.diagnostics).toEqual([]);
    expect(properties(projectedNode(result.root, 'instance-a', 'title-node')).text).toEqual(
      literal(value),
    );
  });

  it('refreshes inherited values and hashes while preserving overrides, placement and projected ids', () => {
    const document = consumer([
      instance('instance-a', { title: literal('Alpha'), artwork: literal('asset:custom') }),
      instance('instance-b', { title: literal('Beta') }),
    ]);
    const before = resolveUiCompositionInstances(document, context());
    const nextDefinition = definition('Updated title', 'asset:two');
    const after = resolveUiCompositionInstances(
      document,
      context([nextDefinition], {
        compositionDefinitions: [{ document: nextDefinition, sourceHash: NEXT_SOURCE_HASH }],
      }),
    );
    expect(after.diagnostics).toEqual([]);
    expect(properties(projectedNode(after.root, 'instance-a', 'artwork-node')).assetRef).toEqual(
      literal('asset:custom'),
    );
    expect(properties(projectedNode(after.root, 'instance-b', 'artwork-node')).assetRef).toEqual(
      literal('asset:two'),
    );
    expect(properties(projectedNode(after.root, 'instance-a', 'title-node')).text).toEqual(
      literal('Alpha'),
    );
    expect(Object.keys(after.provenance)).toEqual(Object.keys(before.provenance));
    expect(after.dependencies).toEqual([
      { documentId: 'definition', interfaceVersion: '1', sourceHash: NEXT_SOURCE_HASH },
    ]);
    expect(node(after.root, 'instance-b').$authoring).toEqual(
      node(before.root, 'instance-b').$authoring,
    );
    expect(document.source).toBe(
      consumer([
        instance('instance-a', { title: literal('Alpha'), artwork: literal('asset:custom') }),
        instance('instance-b', { title: literal('Beta') }),
      ]).source,
    );
  });

  it('encodes UTF-8 identity tuples without delimiter collisions', () => {
    const template = definition(undefined, undefined, 'definition:한글');
    const first = consumer([instance('b:c', {}, 'definition:한글')], 'a');
    const second = consumer([instance('c', {}, 'definition:한글')], 'a:b');
    const firstResult = resolveUiCompositionInstances(first, context([template]));
    const secondResult = resolveUiCompositionInstances(second, context([template]));
    expect(firstResult.diagnostics).toEqual([]);
    expect(secondResult.diagnostics).toEqual([]);
    const firstId = projectedId('a', 'b:c', 'definition:한글', 'title-node');
    const secondId = projectedId('a:b', 'c', 'definition:한글', 'title-node');
    expect(firstId).not.toBe(secondId);
    expect(firstId).toMatch(/^ui-instance:[A-Za-z0-9_-]+$/);
    expect(firstResult.provenance[firstId]?.definitionNodeId).toBe('title-node');
    expect(secondResult.provenance[secondId]?.definitionNodeId).toBe('title-node');
  });

  it('returns a sorted unique dependency snapshot for all resolved instances', () => {
    const templates = [
      definition(undefined, undefined, 'definition-z'),
      definition(undefined, undefined, 'definition-a'),
    ];
    const document = consumer([
      instance('instance-z', {}, 'definition-z'),
      instance('instance-a', {}, 'definition-a'),
      instance('another-z', {}, 'definition-z'),
    ]);
    const result = resolveUiCompositionInstances(document, context(templates));
    expect(result.diagnostics).toEqual([]);
    expect(result.dependencies).toEqual([
      { documentId: 'definition-a', interfaceVersion: '1', sourceHash: SOURCE_HASH },
      { documentId: 'definition-z', interfaceVersion: '1', sourceHash: SOURCE_HASH },
    ]);
  });
});

describe('recoverable composition availability', () => {
  it.each([
    ['missing definition', [] as readonly UiDocumentV3[], '1', 'definition-unavailable'],
    ['different interface', [definition()], '2', 'definition-interface-mismatch'],
  ] as const)(
    'preserves %s references and scalar bags until the exact definition is available',
    (_, definitions, version, code) => {
      const document = consumer([
        instance(
          'instance-a',
          { unknown: literal(false), title: literal(42) },
          'definition',
          version,
        ),
      ]);
      const source = document.source;
      const result = resolveUiCompositionInstances(document, context(definitions));
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code, nodeId: 'instance-a' })]),
      );
      expect(result.provenance).toEqual({});
      expect(node(result.root, 'instance-a')).toEqual(node(document.root, 'instance-a'));
      expect(node(result.root, 'instance-a').child).toBeUndefined();
      expect(document.source).toBe(source);
    },
  );

  it('recovers a missing definition without editing consumer source', () => {
    const document = consumer([instance('instance-a', { title: literal('Recovered') })]);
    const source = document.source;
    expect(resolveUiCompositionInstances(document, context([])).diagnostics.length).toBeGreaterThan(
      0,
    );
    const restored = resolveUiCompositionInstances(document, context());
    expect(restored.diagnostics).toEqual([]);
    expect(properties(projectedNode(restored.root, 'instance-a', 'title-node')).text).toEqual(
      literal('Recovered'),
    );
    expect(document.source).toBe(source);
  });

  it('does not request target metadata when the definition or exact interface is missing', () => {
    let catalogReads = 0;
    const unavailableCatalog = {
      component: () => {
        catalogReads += 1;
        throw new Error('Target catalogue must not be requested for an unavailable definition.');
      },
      components: () => [],
    };
    const document = consumer([instance('instance-a', { unknown: literal(false) })]);
    const missing = resolveUiCompositionInstances(
      document,
      context([], {
        componentCatalog: unavailableCatalog,
      }),
    );
    expect(missing.diagnostics.map(({ code }) => code)).toContain('definition-unavailable');
    const wrongInterface = consumer([
      instance('instance-a', { title: literal(42) }, 'definition', '2'),
    ]);
    const mismatched = resolveUiCompositionInstances(
      wrongInterface,
      context([definition()], {
        componentCatalog: unavailableCatalog,
      }),
    );
    expect(mismatched.diagnostics.map(({ code }) => code)).toContain(
      'definition-interface-mismatch',
    );
    expect(catalogReads).toBe(0);
  });

  it.each<Readonly<Record<string, UiValueSource>>>([
    { unknown: literal('extra') },
    { title: literal(42) },
    { opacity: literal(2) },
    { artwork: literal('https://example.invalid/image.png') },
  ])(
    'preserves a known-definition invalid scalar bag without default fallback: %o',
    (overrides) => {
      const document = consumer([instance('instance-a', overrides)]);
      const source = document.source;
      const result = resolveUiCompositionInstances(document, context());
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'invalid-instance-parameters', nodeId: 'instance-a' }),
        ]),
      );
      expect(node(result.root, 'instance-a')).toEqual(node(document.root, 'instance-a'));
      expect(result.provenance).toEqual({});
      expect(document.source).toBe(source);
    },
  );

  it.each([
    ['nested', 'other-definition', 'nested-composition-instance'],
    ['self-referencing', 'definition', 'composition-cycle'],
  ] as const)('rejects %s definitions without recursive expansion', (_, targetId, code) => {
    const root = definitionRoot();
    (root.children as GenericWidget[]).push(instance('nested-instance', {}, targetId));
    const template = parse('definition', root);
    const definitions = [template, definition(undefined, undefined, 'other-definition')];
    const result = resolveUiCompositionInstances(consumer(), context(definitions));
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code, nodeId: 'instance-a' })]),
    );
    expect(node(result.root, 'instance-a').child).toBeUndefined();
    expect(result.provenance).toEqual({});
  });
});

describe('bounded composition target constraints', () => {
  function constrainedContext(document: UiDocumentV3): UiDocumentCommandV3AdmissionContext {
    const descriptors = COMPONENTS.map((component) => ({
      ...component,
      properties: component.properties?.map((property) => ({
        ...property,
        value: {
          ...property.value,
          ...(property.id === 'text' ? { constraints: { minLength: 1, maxLength: 2 } } : {}),
          ...(property.id === 'opacity' ? { constraints: { min: 0, max: 1, step: 0.5 } } : {}),
        },
      })),
    })) as readonly UiComponentDescriptor[];
    return context([document], {
      componentCatalog: {
        component: (ref) =>
          descriptors.find(({ id, version }) => id === ref.id && version === ref.version),
        components: () => descriptors,
      },
    });
  }

  it('accepts bounded authored defaults and valid effective overrides', () => {
    const template = definition('A');
    const ctx = constrainedContext(template);
    expect(describeUiCompositionDefinition(template, ctx).diagnostics).toEqual([]);
    const result = resolveUiCompositionInstances(
      consumer([
        instance('instance-a', {
          title: literal('AB'),
          opacity: literal(0.5),
        }),
      ]),
      ctx,
    );
    expect(result.diagnostics).toEqual([]);
    expect(properties(projectedNode(result.root, 'instance-a', 'title-node')).text).toEqual(
      literal('AB'),
    );
    expect(properties(projectedNode(result.root, 'instance-a', 'artwork-node')).opacity).toEqual(
      literal(0.5),
    );
  });

  it.each(['', 'ABC'])('rejects a constrained authored title default %j', (title) => {
    const template = definition(title);
    const result = describeUiCompositionDefinition(template, constrainedContext(template));
    expect(result.descriptor).toBeNull();
    expect(result.diagnostics[0]?.code).toBe('invalid-composition-definition');
  });

  it('rejects an authored numeric default outside the declared step', () => {
    const root = definitionRoot('A');
    const artwork = (root.children as GenericWidget[])[1]!;
    artwork.$authoring = {
      ...readUiDocumentNodeAuthoringV3(artwork)!,
      properties: {
        ...readUiDocumentNodeAuthoringV3(artwork)!.properties,
        opacity: literal(0.25),
      },
    };
    const template = parse('definition', root);
    const result = describeUiCompositionDefinition(template, constrainedContext(template));
    expect(result.descriptor).toBeNull();
    expect(result.diagnostics[0]?.code).toBe('invalid-composition-definition');
  });

  it.each([
    ['title', ''],
    ['title', 'ABC'],
    ['opacity', 0.25],
  ] as const)(
    'rejects constrained effective value and new instance edit %s = %j',
    (propertyId, value) => {
      const template = definition('A');
      const ctx = constrainedContext(template);
      const invalid = consumer([instance('instance-a', { [propertyId]: literal(value) })]);
      const result = resolveUiCompositionInstances(invalid, ctx);
      expect(result.diagnostics[0]?.code).toBe('invalid-instance-parameters');
      expect(node(result.root, 'instance-a').child).toBeUndefined();
      expect(node(result.root, 'instance-a').$authoring).toEqual(
        node(invalid.root, 'instance-a').$authoring,
      );
      const state = createUiAuthoringSessionV3(consumer());
      const edit = applyAdmittedUiAuthoringSessionCommandV3(
        state,
        {
          type: 'set-property',
          commandId: 'constrained-edit',
          nodeId: 'instance-a',
          propertyId,
          value: literal(value),
        },
        ctx,
      );
      expect(edit.status).toBe('rejected');
      expect(edit.state).toBe(state);
      expect(state.past).toEqual([]);
    },
  );
});
