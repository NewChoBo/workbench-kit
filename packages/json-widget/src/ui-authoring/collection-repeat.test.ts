import type { UiComponentDescriptor, UiPropertyDescriptor } from '@workbench-kit/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import {
  projectUiCollectionInstances,
  type UiCollectionRepeatInput,
  type UiCollectionRepeatTarget,
  type UiCollectionResourceTargetPolicyInput,
} from './collection-repeat.js';
import { resolveUiCompositionInstances, uiCompositionComponentRef } from './composition.js';
import type * as compositionModule from './composition.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import type { UiDocumentCommandV3AdmissionContext } from './semantic-admission-v3.js';
import type { UiDocumentV3 } from './types.js';

vi.mock('./composition.js', async (importOriginal) => {
  const actual = await importOriginal<typeof compositionModule>();
  return { ...actual, resolveUiCompositionInstances: vi.fn(actual.resolveUiCompositionInstances) };
});

const literal = (value: unknown) => ({ kind: 'literal' as const, value });
const COMPONENTS: readonly UiComponentDescriptor[] = [
  {
    id: 'test:freeform',
    version: '1',
    kind: 'atomic',
    properties: [],
    layout: { childSlots: [{ id: 'children', cardinality: 'many' }] },
    designTime: { label: 'Container' },
  },
  {
    id: 'test:text',
    version: '1',
    kind: 'atomic',
    properties: [{ id: 'text', value: { type: 'string' } }],
    designTime: { label: 'Text' },
  },
  {
    id: 'test:image',
    version: '1',
    kind: 'atomic',
    properties: [
      { id: 'assetRef', value: { type: 'string' } },
      { id: 'opacity', value: { type: 'number', constraints: { min: 0, max: 1 } } },
      { id: 'visible', value: { type: 'boolean' } },
    ],
    designTime: { label: 'Image' },
  },
];

function layout(width = 120, height = 90) {
  return {
    strategyId: 'builtin.canvas',
    values: {
      placement: literal({
        kind: 'canvas-placement',
        x: { kind: 'length', value: 0, unit: 'px' },
        y: { kind: 'length', value: 0, unit: 'px' },
        width: { kind: 'length', value: width, unit: 'px' },
        height: { kind: 'length', value: height, unit: 'px' },
        anchor: 'top-start',
        zIndex: 0,
      }),
    },
  };
}

function node(
  id: string,
  type = 'freeform',
  properties: Record<string, unknown> = {},
  authoring: Record<string, unknown> = {},
  fields: Record<string, unknown> = {},
): GenericWidget {
  return {
    id,
    type,
    $authoring: { component: { id: `test:${type}`, version: '1' }, properties, ...authoring },
    ...fields,
  };
}

function parse(id: string, root: GenericWidget): UiDocumentV3 {
  const result = createUiDocumentV3(id, formatWidgetDocumentJson(root));
  expect(result.issues).toEqual([]);
  return result.document!;
}

function definition(id = 'definition', extras = 0) {
  return parse(
    id,
    node(
      'definition-root',
      'freeform',
      {},
      {
        documentSchemaVersion: 3,
        compositionDefinition: {
          interfaceVersion: '1',
          parameters: [
            { id: 'title', label: 'Title', target: { nodeId: 'text', propertyId: 'text' } },
            {
              id: 'artwork',
              label: 'Artwork',
              target: { nodeId: 'image', propertyId: 'assetRef' },
            },
            { id: 'opacity', label: 'Opacity', target: { nodeId: 'image', propertyId: 'opacity' } },
            { id: 'visible', label: 'Visible', target: { nodeId: 'image', propertyId: 'visible' } },
          ],
        },
      },
      {
        children: [
          node('text', 'text', { text: literal('Template') }),
          node('image', 'image', {
            assetRef: literal('asset:default'),
            opacity: literal(1),
            visible: literal(true),
          }),
          ...Array.from({ length: extras }, (_, index) => node(`extra-${index}`)),
        ],
      },
    ),
  );
}

function ordinary(id = 'ordinary') {
  return node(
    id,
    'composition-instance',
    {},
    { component: uiCompositionComponentRef('definition', '1'), layout: layout() },
  );
}

function consumer(children = [node('items')]) {
  return parse(
    'consumer',
    node('root', 'freeform', {}, { documentSchemaVersion: 3 }, { children }),
  );
}

function context(definitions = [definition()]): UiDocumentCommandV3AdmissionContext {
  return {
    componentCatalog: {
      component: (ref) =>
        COMPONENTS.find(
          (component) => component.id === ref.id && component.version === ref.version,
        ),
      components: () => COMPONENTS,
    },
    layoutProperties: [
      {
        id: 'placement',
        scope: 'child',
        group: 'canvas',
        strategyKinds: ['canvas'],
        value: { type: 'layout.canvas-placement' },
      },
    ],
    layoutStrategies: [
      {
        id: 'builtin.canvas',
        kind: 'canvas',
        supportedContainerProperties: [],
        supportedChildProperties: ['placement'],
      },
    ],
    compositionDefinitions: definitions.map((document) => ({
      document,
      sourceHash: 'a'.repeat(64),
    })),
    validateLiteral: ({ component, property, value }) =>
      component.id === 'test:image' &&
      property.id === 'assetRef' &&
      (typeof value !== 'string' || !value.startsWith('asset:'))
        ? 'A managed asset is required.'
        : null,
  };
}

const resourcePolicy = ({ component, property }: UiCollectionResourceTargetPolicyInput) =>
  component.id === 'test:image' && property.id === 'assetRef';

function target(overrides: Partial<UiCollectionRepeatTarget> = {}): UiCollectionRepeatTarget {
  return {
    containerNodeId: 'items',
    sourceNamespace: ['catalog', null, 'items'],
    sourceSchema: {
      schemaRevision: '1',
      fields: [
        { id: 'id', value: { type: 'string' } },
        { id: 'title', value: { type: 'string' } },
        { id: 'opacity', value: { type: 'number' } },
        { id: 'visible', value: { type: 'boolean' } },
      ],
      identityFieldIds: ['id'],
    },
    expectedSchemaRevision: '1',
    records: [
      { recordId: 'one', values: { id: 'one', title: 'One' } },
      { recordId: 'two', values: { id: 'two', title: 'Two' } },
    ],
    template: { documentId: 'definition', interfaceVersion: '1' },
    mappings: [
      {
        parameterId: 'title',
        source: { kind: 'field', fieldId: 'title' },
        fallback: 'template-default',
      },
      {
        parameterId: 'artwork',
        source: { kind: 'resource', role: 'artwork' },
        fallback: 'template-default',
      },
    ],
    overrides: [],
    resources: [
      { recordId: 'one', role: 'artwork', resourceKey: 'cover-one' },
      { recordId: 'two', role: 'artwork', resourceKey: 'cover-two' },
    ],
    instanceLayout: layout(),
    generation: 'target-1',
    page: { index: 0, size: 20 },
    ...overrides,
  };
}

function input(targets = [target()], document = consumer()): UiCollectionRepeatInput {
  return { document, generation: 'batch-1', targets };
}

function project(value = input(), ctx = context()) {
  return projectUiCollectionInstances(value, ctx, resourcePolicy);
}

function invalid(value: UiCollectionRepeatInput, code: string, ctx = context()) {
  const result = project(value, ctx);
  expect(result.status).toBe('invalid');
  expect(result.diagnostics.map((issue) => issue.code)).toContain(code);
  expect(result.root).toBeNull();
  expect(result.composition).toBeNull();
  expect(result.resourceTargets).toEqual([]);
  expect(result.repeatProvenance).toEqual({});
  expect(result.baseParameterValues).toEqual({});
  return result;
}

function property(
  result: ReturnType<typeof project>,
  recordId: string,
  definitionNodeId: string,
  propertyId: string,
) {
  const instance = Object.entries(result.repeatProvenance).find(
    ([, identity]) => identity.recordId === recordId,
  )![0];
  const projected = Object.entries(result.composition!.provenance).find(
    ([, provenance]) =>
      provenance.instanceNodeId === instance && provenance.definitionNodeId === definitionNodeId,
  )![0];
  const found = collectWidgetNodes(result.root!).find(
    ({ widget }) => widget.id === projected,
  )!.widget;
  return readUiDocumentNodeAuthoringV3(found)!.properties[propertyId];
}

beforeEach(() => {
  vi.mocked(resolveUiCompositionInstances).mockClear();
});

describe('atomic collection composition projection', () => {
  it('resolves two independent containers and an ordinary instance in exactly one pass', () => {
    const first = target({ containerNodeId: 'z', instanceLayout: layout(600, 400) });
    const second = target({
      containerNodeId: 'a',
      template: { documentId: 'small-card', interfaceVersion: '1' },
      instanceLayout: layout(90, 60),
    });
    const source = input([first, second], consumer([node('z'), ordinary(), node('a')]));
    const before = JSON.stringify(source);
    const result = project(source, context([definition(), definition('small-card')]));
    expect(result.status).toBe('ready');
    expect(result.diagnostics).toEqual([]);
    expect(resolveUiCompositionInstances).toHaveBeenCalledTimes(1);
    expect(result.pages.map((page) => page.containerNodeId)).toEqual(['a', 'z']);
    expect(Object.keys(result.repeatProvenance)).toHaveLength(4);
    expect(result.resourceTargets).toHaveLength(4);
    expect(
      Object.values(result.composition!.provenance).filter(
        (entry) => entry.instanceNodeId === 'ordinary',
      ),
    ).toHaveLength(3);
    for (const { widget } of collectWidgetNodes(result.root!)) {
      const identity = result.repeatProvenance[widget.id as string];
      if (identity)
        expect(readUiDocumentNodeAuthoringV3(widget)!.layout).toEqual(
          identity.containerNodeId === 'z' ? first.instanceLayout : second.instanceLayout,
        );
    }
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(result.root)).toBe(true);
    expect(JSON.stringify(result.root)).not.toContain('cover-one');
    expect(JSON.stringify(result.root)).not.toContain('://');
    for (const resource of result.resourceTargets) {
      expect(result.composition!.provenance[resource.projectedNodeId]).toMatchObject({
        instanceNodeId: resource.instanceNodeId,
        definitionDocumentId: resource.definitionDocumentId,
        definitionNodeId: 'image',
      });
      expect(resource.generation).toBe('target-1');
      expect(resource.propertyId).toBe('assetRef');
    }
  });

  it('preserves identity across sorting, filtering, generations, pages and layout switches', () => {
    const baseline = project();
    const next = project(
      input([
        target({
          records: [target().records[1]!],
          resources: [target().resources[1]!],
          instanceLayout: layout(300, 500),
          generation: 'target-2',
        }),
      ]),
    );
    const firstId = Object.entries(baseline.repeatProvenance).find(
      ([, identity]) => identity.recordId === 'two',
    )![0];
    expect(Object.keys(next.repeatProvenance)).toEqual([firstId]);
    expect(next.resourceTargets[0]!.generation).toBe('target-2');
    expect(next.resourceTargets[0]!.projectedNodeId).toBe(
      baseline.resourceTargets[1]!.projectedNodeId,
    );
  });

  it('encodes a fixed Unicode tuple injectively without normalizing opaque bytes', () => {
    const ids = ['한글/😀', 'é', 'e\u0301', ' a ', 'a:b', 'a/b'];
    const result = project(
      input([
        target({
          records: ids.map((id) => ({ recordId: id, values: { id, title: id } })),
          resources: [],
        }),
      ]),
    );
    expect(result.status).toBe('ready');
    expect(new Set(Object.keys(result.repeatProvenance)).size).toBe(ids.length);
    for (const [id, identity] of Object.entries(result.repeatProvenance)) {
      expect(
        JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(
              atob(id.slice('ui-repeat:'.length).replace(/-/g, '+').replace(/_/g, '/')),
              (character) => character.charCodeAt(0),
            ),
          ),
        ),
      ).toEqual(['catalog', null, 'items', 'consumer', 'items', identity.recordId]);
    }
  });

  it('rejects malformed/empty identity and distinguishes null from an actual connection', () => {
    invalid(input([target({ sourceNamespace: ['catalog', '', 'items'] })]), 'invalid-identity');
    invalid(
      input([target({ records: [{ recordId: '\ud800', values: { id: 'one' } }], resources: [] })]),
      'invalid-record',
    );
    expect(Object.keys(project().repeatProvenance)).not.toEqual(
      Object.keys(
        project(input([target({ sourceNamespace: ['catalog', 'connection', 'items'] })]))
          .repeatProvenance,
      ),
    );
  });

  it('detects collisions against authored IDs', () => {
    const id = Object.keys(project().repeatProvenance)[0]!;
    invalid(input([target()], consumer([node('items'), node(id)])), 'identity-collision');
  });

  it('rejects duplicate identities outside the requested page', () => {
    const records = Array.from({ length: 30 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}` },
    }));
    records[29] = records[0]!;
    invalid(input([target({ records, resources: [] })]), 'duplicate-record-id');
    expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
  });

  it('rejects duplicate and nested targets atomically', () => {
    invalid(input([target(), target()]), 'duplicate-container');
    invalid(
      input(
        [target({ containerNodeId: 'outer' }), target()],
        consumer([node('outer', 'freeform', {}, {}, { children: [node('items')] })]),
      ),
      'nested-repeat-target',
    );
  });

  it('does not replace nonempty containers', () => {
    invalid(
      input(
        [target()],
        consumer([node('items', 'freeform', {}, {}, { children: [node('authored')] })]),
      ),
      'nonempty-container',
    );
  });

  it('keeps zero-result template dependencies and checks the exact interface', () => {
    const result = project(input([target({ records: [], resources: [] })]));
    expect(result.status).toBe('ready');
    expect(result.composition!.dependencies).toEqual([
      { documentId: 'definition', interfaceVersion: '1', sourceHash: 'a'.repeat(64) },
    ]);
    expect(result.pages[0]).toMatchObject({ totalCount: 0, pageIndex: 0 });
    invalid(
      input([
        target({
          records: [],
          resources: [],
          template: { documentId: 'definition', interfaceVersion: '2' },
        }),
      ]),
      'template-interface-mismatch',
    );
    invalid(input([target({ records: [], resources: [] })]), 'template-unavailable', context([]));
  });
});

describe('mapping and resource admission', () => {
  it('uses template, typed source, then valid active override and resets to current source', () => {
    const selected = target({
      records: [{ recordId: 'one', values: { id: 'one', title: 3 } }, target().records[1]!],
    });
    const override = {
      sourceNamespace: selected.sourceNamespace,
      recordId: 'two',
      template: selected.template,
      values: { title: 'Edited', artwork: 'asset:override' },
    };
    const result = project(input([{ ...selected, overrides: [override] }]));
    expect(result.status).toBe('ready');
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('Template'));
    expect(property(result, 'two', 'text', 'text')).toEqual(literal('Edited'));
    expect(property(result, 'two', 'image', 'assetRef')).toEqual(literal('asset:override'));
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(['mapping-value-invalid']);
    expect(result.resourceTargets).toHaveLength(1);
    const reset = project(input([selected]));
    expect(property(reset, 'two', 'text', 'text')).toEqual(literal('Two'));
    expect(reset.resourceTargets).toHaveLength(2);
  });

  it('checks exact scalar types and enum membership without coercion', () => {
    const extra: UiPropertyDescriptor = {
      id: 'kind',
      value: { type: 'enum', constraints: { values: ['allowed', 'other'] } },
    };
    const selected = target({
      sourceSchema: { ...target().sourceSchema, fields: [...target().sourceSchema.fields, extra] },
      mappings: [
        {
          parameterId: 'title',
          source: { kind: 'field', fieldId: 'kind' },
          fallback: 'template-default',
        },
        {
          parameterId: 'opacity',
          source: { kind: 'field', fieldId: 'opacity' },
          fallback: 'template-default',
        },
        {
          parameterId: 'visible',
          source: { kind: 'field', fieldId: 'visible' },
          fallback: 'template-default',
        },
      ],
      records: [
        { recordId: 'one', values: { id: 'one', kind: 'allowed', opacity: 0.5, visible: false } },
        {
          recordId: 'two',
          values: { id: 'two', kind: 'invalid', opacity: '0.2', visible: 'false' },
        },
      ],
    });
    const result = project(input([selected]));
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('allowed'));
    expect(property(result, 'one', 'image', 'opacity')).toEqual(literal(0.5));
    expect(property(result, 'one', 'image', 'visible')).toEqual(literal(false));
    expect(property(result, 'two', 'text', 'text')).toEqual(literal('Template'));
    expect(result.diagnostics).toHaveLength(3);
  });

  it('rejects wrong schema, missing fields, duplicate mappings and descriptor type mismatch', () => {
    invalid(input([target({ expectedSchemaRevision: '2' })]), 'source-schema-mismatch');
    invalid(
      input([
        target({
          mappings: [
            {
              parameterId: 'title',
              source: { kind: 'field', fieldId: 'missing' },
              fallback: 'template-default',
            },
          ],
        }),
      ]),
      'mapping-unavailable',
    );
    invalid(
      input([target({ mappings: [target().mappings[0]!, target().mappings[0]!] })]),
      'duplicate-mapping',
    );
    invalid(
      input([
        target({
          mappings: [
            {
              parameterId: 'opacity',
              source: { kind: 'field', fieldId: 'title' },
              fallback: 'template-default',
            },
          ],
        }),
      ]),
      'mapping-type-mismatch',
    );
  });

  it('forbids scalar assetRef and rejects unapproved resource targets even with no records', () => {
    invalid(
      input([
        target({
          mappings: [
            {
              parameterId: 'artwork',
              source: { kind: 'field', fieldId: 'title' },
              fallback: 'template-default',
            },
          ],
        }),
      ]),
      'mapping-type-mismatch',
    );
    invalid(
      input([
        target({
          records: [],
          resources: [],
          mappings: [
            {
              parameterId: 'title',
              source: { kind: 'resource', role: 'artwork' },
              fallback: 'template-default',
            },
          ],
        }),
      ]),
      'resource-target-denied',
    );
  });

  it('keeps dormant overrides without applying them to another source or template', () => {
    const selected = target();
    const result = project(
      input([
        {
          ...selected,
          overrides: [
            {
              sourceNamespace: ['old', null, 'items'],
              recordId: 'one',
              template: selected.template,
              values: { retired: 'Retained' },
            },
            {
              sourceNamespace: selected.sourceNamespace,
              recordId: 'one',
              template: { documentId: 'old-template', interfaceVersion: '0' },
              values: { retired: 'Retained' },
            },
          ],
        },
      ]),
    );
    expect(result.status).toBe('ready');
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('One'));
  });

  it('rejects duplicate or invalid active overrides including managed asset policy', () => {
    const selected = target();
    const override = {
      sourceNamespace: selected.sourceNamespace,
      recordId: 'one',
      template: selected.template,
      values: { title: 'Edited' },
    };
    invalid(input([{ ...selected, overrides: [override, override] }]), 'duplicate-override');
    invalid(
      input([
        {
          ...selected,
          overrides: [{ ...override, values: { artwork: 'https://invalid.test/image.png' } }],
        },
      ]),
      'override-invalid',
    );
  });

  it('requires same-snapshot exact resources and unambiguous opaque keys', () => {
    const selected = target();
    invalid(
      input([{ ...selected, resources: [selected.resources[0]!, selected.resources[0]!] }]),
      'duplicate-resource',
    );
    invalid(
      input([
        {
          ...selected,
          resources: [{ recordId: 'absent', role: 'artwork', resourceKey: 'absent' }],
        },
      ]),
      'dangling-resource',
    );
    invalid(
      input([
        {
          ...selected,
          resources: selected.resources.map((resource) => ({ ...resource, resourceKey: 'same' })),
        },
      ]),
      'duplicate-resource',
    );
    invalid(
      input([
        {
          ...selected,
          resources: [{ ...selected.resources[0]!, resourceKey: 'https://invalid.test/image' }],
        },
      ]),
      'resource-unavailable',
    );
    const missing = project(input([{ ...selected, resources: [] }]));
    expect(missing.status).toBe('ready');
    expect(missing.resourceTargets).toEqual([]);
    expect(missing.diagnostics.map((issue) => issue.code)).toEqual([
      'resource-unavailable',
      'resource-unavailable',
    ]);
  });
});

describe('bounded plain-data capture and budgets', () => {
  it('does not execute input or descriptor accessors', () => {
    const getter = vi.fn(() => 'stolen');
    const value = input();
    Object.defineProperty(value.targets[0]!.records[0]!.values, 'title', {
      get: getter,
      enumerable: true,
    });
    invalid(value, 'invalid-record');
    expect(getter).not.toHaveBeenCalled();
    const schema = input();
    Object.defineProperty(schema.targets[0]!.sourceSchema.fields[0]!, 'value', {
      get: getter,
      enumerable: true,
    });
    invalid(schema, 'invalid-record');
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects cycles, sparse arrays, prototype keys and nonfinite numbers', () => {
    const cycle = input();
    (cycle.targets[0]!.records[0]!.values as Record<string, unknown>).cycle = cycle;
    invalid(cycle, 'invalid-record');
    const sparse = input([
      target({ records: new Array(2) as UiCollectionRepeatTarget['records'] }),
    ]);
    invalid(sparse, 'invalid-record');
    const key = input();
    Object.defineProperty(key.targets[0]!.records[0]!.values, '__proto__', {
      value: {},
      enumerable: true,
    });
    invalid(key, 'invalid-record');
    invalid(
      input([target({ records: [{ recordId: 'one', values: { id: 'one', opacity: Infinity } }] })]),
      'invalid-record',
    );
  });

  it('bounds all identities and strings before paging', () => {
    invalid(
      input([
        target({ records: [{ recordId: '😀'.repeat(65), values: { id: 'one' } }], resources: [] }),
      ]),
      'invalid-identity',
    );
    const name = 'x'.repeat(256);
    invalid(
      input(
        [
          target({
            sourceNamespace: [name, name, name],
            containerNodeId: name,
            records: [{ recordId: name, values: { id: name } }],
            resources: [],
          }),
        ],
        consumer([node(name)]),
      ),
      'invalid-identity',
    );
    const records = Array.from({ length: 21 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}`, title: index === 20 ? 'x'.repeat(16 * 1024 + 1) : 'ok' },
    }));
    invalid(input([target({ records, resources: [] })]), 'snapshot-limit');
  });

  it('enforces record, selected-field JSON and retained-override byte bounds', () => {
    const records = Array.from({ length: 10_001 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}` },
    }));
    invalid(input([target({ records, resources: [] })]), 'snapshot-limit');
    const big = Array.from({ length: 513 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}`, title: 'x'.repeat(16 * 1024) },
    }));
    invalid(input([target({ records: big, resources: [] })]), 'snapshot-limit');
    const selected = target();
    const overrides = Array.from({ length: 513 }, (_, index) => ({
      sourceNamespace: selected.sourceNamespace,
      template: selected.template,
      recordId: `r-${index}`,
      values: { title: 'x'.repeat(16 * 1024) },
    }));
    invalid(input([{ ...selected, overrides }]), 'snapshot-limit');
  });

  it('enforces template and mapping limits and validates the supplied instance layout', () => {
    invalid(input(), 'template-limit', context([definition('definition', 254)]));
    invalid(
      input([target({ mappings: Array.from({ length: 33 }, () => target().mappings[0]!) })]),
      'snapshot-limit',
    );
    invalid(
      input([target({ instanceLayout: { strategyId: 'unknown', values: {} } })]),
      'invalid-instance-layout',
    );
    invalid(
      input([
        target({
          instanceLayout: {
            strategyId: 'builtin.canvas',
            values: { placement: literal({ invalid: true }) },
          },
        }),
      ]),
      'invalid-instance-layout',
    );
  });

  it('normalizes page bounds without silently truncating a global-budget failure', () => {
    invalid(input([target({ page: { index: -1, size: 20 } })]), 'invalid-page');
    invalid(input([target({ page: { index: 0, size: 21 } })]), 'invalid-page');
    const result = project(input([target({ page: { index: 999, size: 20 } })]));
    expect(result.pages[0]!.pageIndex).toBe(0);
    const records = Array.from({ length: 100 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}` },
    }));
    const largeTemplate = context([definition('definition', 253)]);
    const normalized = project(
      input([target({ records, resources: [], page: { index: 3, size: 200 } })]),
      largeTemplate,
    );
    expect(normalized.status).toBe('ready');
    expect(normalized.pages[0]!.effectivePageSize).toBe(7);
    expect(Object.keys(normalized.repeatProvenance)).toHaveLength(7);
    invalid(
      input(
        [
          target({ records, resources: [], page: { index: 0, size: 200 } }),
          target({
            containerNodeId: 'second',
            records,
            resources: [],
            page: { index: 0, size: 200 },
          }),
        ],
        consumer([node('items'), node('second')]),
      ),
      'snapshot-limit',
      largeTemplate,
    );
    invalid(
      input(
        [target({ records, resources: [], page: { index: 0, size: 200 } })],
        consumer([node('items'), ordinary()]),
      ),
      'snapshot-limit',
      largeTemplate,
    );
  });
});

describe('retention and exact boundary regressions', () => {
  it('retains absent-item overrides without executing obsolete target values', () => {
    const selected = target();
    const result = project(
      input([
        {
          ...selected,
          overrides: [
            {
              sourceNamespace: selected.sourceNamespace,
              template: selected.template,
              recordId: 'filtered-item',
              values: { retired: 'kept' },
            },
          ],
        },
      ]),
    );
    expect(result.status).toBe('ready');
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('One'));
  });

  it('keeps generation on rejected capture and never executes its accessor', () => {
    const value = input();
    Object.defineProperty(value.targets[0]!, 'records', {
      get: () => {
        throw new Error('must not run');
      },
      enumerable: true,
    });
    expect(invalid(value, 'invalid-record').generation).toBe('batch-1');
    const getter = vi.fn(() => 'not-observable');
    Object.defineProperty(value, 'generation', { get: getter, enumerable: true });
    expect(invalid(value, 'invalid-record').generation).toBe('');
    expect(getter).not.toHaveBeenCalled();
  });

  it('accepts 256-byte identities and 16-KiB source strings without coercion', () => {
    const id = '😀'.repeat(64);
    const text = 'x'.repeat(16 * 1024);
    const result = project(
      input([target({ records: [{ recordId: id, values: { id, title: text } }], resources: [] })]),
    );
    expect(result.status).toBe('ready');
    expect(property(result, id, 'text', 'text')).toEqual(literal(text));
  });

  it('rejects more than 10,000 retained overrides without evicting them', () => {
    const selected = target();
    const overrides = Array.from({ length: 10_001 }, (_, index) => ({
      sourceNamespace: selected.sourceNamespace,
      template: selected.template,
      recordId: `r-${index}`,
      values: {},
    }));
    const value = input([{ ...selected, overrides }]);
    invalid(value, 'snapshot-limit');
    expect(value.targets[0]!.overrides).toHaveLength(10_001);
  });

  it('checks enum descriptor configuration and duplicate source fields atomically', () => {
    const selected = target();
    invalid(
      input([
        {
          ...selected,
          sourceSchema: {
            ...selected.sourceSchema,
            fields: [...selected.sourceSchema.fields, selected.sourceSchema.fields[0]!],
          },
        },
      ]),
      'source-schema-mismatch',
    );
    invalid(
      input([
        {
          ...selected,
          sourceSchema: {
            ...selected.sourceSchema,
            fields: [
              ...selected.sourceSchema.fields,
              { id: 'kind', value: { type: 'enum', constraints: { values: ['same', 'same'] } } },
            ],
          },
        },
      ]),
      'source-schema-mismatch',
    );
  });

  it('rejects more than 2,000 resolved resource targets before publication', () => {
    const properties = Array.from({ length: 32 }, (_, index) => ({
      id: `asset-${index}`,
      value: { type: 'string' },
    }));
    const resourceComponent: UiComponentDescriptor = {
      id: 'test:resources',
      version: '1',
      kind: 'atomic',
      properties,
      designTime: { label: 'Resources' },
    };
    const resourceDefinition = parse(
      'resources',
      node(
        'resource-node',
        'resources',
        Object.fromEntries(properties.map((property) => [property.id, literal('asset:default')])),
        {
          documentSchemaVersion: 3,
          compositionDefinition: {
            interfaceVersion: '1',
            parameters: properties.map((property) => ({
              id: property.id,
              label: property.id,
              target: { nodeId: 'resource-node', propertyId: property.id },
            })),
          },
        },
      ),
    );
    const baseContext = context([resourceDefinition]);
    const resourceContext: UiDocumentCommandV3AdmissionContext = {
      ...baseContext,
      componentCatalog: {
        component: (ref) =>
          ref.id === resourceComponent.id
            ? resourceComponent
            : baseContext.componentCatalog.component(ref),
        components: () => [...COMPONENTS, resourceComponent],
      },
    };
    const records = Array.from({ length: 200 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}` },
    }));
    const value = input([
      target({
        template: { documentId: 'resources', interfaceVersion: '1' },
        records,
        mappings: properties.map((property) => ({
          parameterId: property.id,
          source: { kind: 'resource', role: property.id },
          fallback: 'template-default',
        })),
        resources: records.flatMap((record) =>
          properties.map((property) => ({
            recordId: record.recordId,
            role: property.id,
            resourceKey: `${record.recordId}-${property.id}`,
          })),
        ),
        page: { index: 0, size: 200 },
      }),
    ]);
    const result = projectUiCollectionInstances(value, resourceContext, () => true);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((issue) => issue.code)).toContain('snapshot-limit');
    expect(result.resourceTargets).toEqual([]);
    expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
  });
});

it('counts escaped JSON bytes before serializing selected fields', () => {
  const records = Array.from({ length: 86 }, (_, index) => ({
    recordId: `r-${index}`,
    values: { id: `r-${index}`, title: '\u0000'.repeat(16 * 1024) },
  }));
  invalid(input([target({ records, resources: [] })]), 'snapshot-limit');
});

describe('current pre-override parameter baselines', () => {
  function baseline(result: ReturnType<typeof project>, recordId: string) {
    const id = Object.entries(result.repeatProvenance).find(
      ([, identity]) => identity.recordId === recordId,
    )![0];
    return result.baseParameterValues[id]!;
  }

  it('captures every exposed default and mapped scalar before overrides without leaking artwork resources', () => {
    const selected = target();
    const result = project(
      input([
        {
          ...selected,
          overrides: [
            {
              sourceNamespace: selected.sourceNamespace,
              template: selected.template,
              recordId: 'one',
              values: { title: 'Edited', artwork: 'asset:override', opacity: 0.2 },
            },
          ],
        },
      ]),
    );
    expect(result.status).toBe('ready');
    expect(baseline(result, 'one')).toEqual({
      title: 'One',
      artwork: 'asset:default',
      opacity: 1,
      visible: true,
    });
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('Edited'));
    expect(property(result, 'one', 'image', 'assetRef')).toEqual(literal('asset:override'));
    expect(Object.isFrozen(result.baseParameterValues)).toBe(true);
    expect(Object.isFrozen(baseline(result, 'one'))).toBe(true);
    expect(Object.keys(result.baseParameterValues)).toEqual(Object.keys(result.repeatProvenance));
    expect(JSON.stringify(result.baseParameterValues)).not.toContain('cover-one');
    expect(JSON.stringify(result.baseParameterValues)).not.toContain('://');
    expect(result.resourceTargets).toHaveLength(1);
    expect(resolveUiCompositionInstances).toHaveBeenCalledTimes(1);
  });

  it('refreshes the selected identity baseline under a winning override and resets to the new source', () => {
    const selected = target();
    const overrides = [
      {
        sourceNamespace: selected.sourceNamespace,
        template: selected.template,
        recordId: 'one',
        values: { title: 'Edited' },
      },
    ];
    const initial = project(input([{ ...selected, overrides }]));
    const records = [
      { recordId: 'one', values: { id: 'one', title: 'Updated source' } },
      selected.records[1]!,
    ];
    const refreshed = project(
      input([{ ...selected, records, overrides, generation: 'refreshed' }]),
    );
    expect(baseline(initial, 'one').title).toBe('One');
    expect(baseline(refreshed, 'one').title).toBe('Updated source');
    expect(Object.keys(refreshed.baseParameterValues)).toEqual(
      Object.keys(initial.baseParameterValues),
    );
    expect(property(refreshed, 'one', 'text', 'text')).toEqual(literal('Edited'));
    const reset = project(input([{ ...selected, records, overrides: [] }]));
    expect(property(reset, 'one', 'text', 'text')).toEqual(literal('Updated source'));
    expect(baseline(reset, 'one').title).toBe('Updated source');
    expect(resolveUiCompositionInstances).toHaveBeenCalledTimes(3);
  });

  it('uses valid fallback baselines while suppressing misleading rendered-default diagnostics under overrides', () => {
    const selected = target();
    const records = [
      { recordId: 'one', values: { id: 'one', title: false } },
      selected.records[1]!,
    ];
    const result = project(
      input([
        {
          ...selected,
          records,
          resources: [],
          overrides: [
            {
              sourceNamespace: selected.sourceNamespace,
              template: selected.template,
              recordId: 'one',
              values: { title: 'Edited', artwork: 'asset:override' },
            },
          ],
        },
      ]),
    );
    expect(result.status).toBe('ready');
    expect(baseline(result, 'one').title).toBe('Template');
    expect(baseline(result, 'one').artwork).toBe('asset:default');
    expect(property(result, 'one', 'text', 'text')).toEqual(literal('Edited'));
    expect(result.diagnostics.every((issue) => issue.recordId !== 'one')).toBe(true);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'resource-unavailable', recordId: 'two' }),
    ]);
    expect(resolveUiCompositionInstances).toHaveBeenCalledTimes(1);
  });

  it('includes only rendered identities and no ordinary instances or absent records', () => {
    const selected = target();
    const records = Array.from({ length: 25 }, (_, index) => ({
      recordId: `r-${index}`,
      values: { id: `r-${index}`, title: `Title ${index}` },
    }));
    const result = project(
      input([{ ...selected, records, resources: [] }], consumer([node('items'), ordinary()])),
    );
    expect(result.status).toBe('ready');
    expect(Object.keys(result.baseParameterValues)).toHaveLength(20);
    expect(Object.keys(result.baseParameterValues)).toEqual(Object.keys(result.repeatProvenance));
    expect(result.baseParameterValues.ordinary).toBeUndefined();
    const empty = project(input([{ ...selected, records: [], resources: [] }]));
    expect(empty.baseParameterValues).toEqual({});
  });
});

describe('exact repeat container capability', () => {
  it.each(['text', 'image'])('rejects an empty %s leaf before any composition call', (type) => {
    const properties =
      type === 'text' ? { text: literal('Leaf') } : { assetRef: literal('asset:leaf') };
    invalid(input([target()], consumer([node('items', type, properties)])), 'nonempty-container');
    invalid(
      input([target({ records: [], resources: [] })], consumer([node('items', type, properties)])),
      'nonempty-container',
    );
    expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
  });

  it.each(['missing', 'wrong-id', 'wrong-version'])(
    'rejects a %s exact container descriptor',
    (mode) => {
      const base = context();
      const candidate = COMPONENTS[0]!;
      const replacement =
        mode === 'missing'
          ? undefined
          : {
              ...candidate,
              ...(mode === 'wrong-id' ? { id: 'different-container' } : { version: '2' }),
            };
      const changed: UiDocumentCommandV3AdmissionContext = {
        ...base,
        componentCatalog: {
          ...base.componentCatalog,
          component: (ref) =>
            ref.id === candidate.id ? replacement : base.componentCatalog.component(ref),
        },
      };
      invalid(input(), 'nonempty-container', changed);
      expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
    },
  );

  it.each(
    [
      [],
      [{ id: 'children', cardinality: 'one' as const }],
      [{ id: 'body', cardinality: 'many' as const }],
      [
        { id: 'children', cardinality: 'many' as const },
        { id: 'children', cardinality: 'many' as const },
      ],
    ].map((childSlots) => ({ childSlots })),
  )('rejects absent, single, wrong or ambiguous child slots: $childSlots', ({ childSlots }) => {
    const base = context();
    const candidate = { ...COMPONENTS[0]!, layout: { childSlots } };
    const changed: UiDocumentCommandV3AdmissionContext = {
      ...base,
      componentCatalog: {
        ...base.componentCatalog,
        component: (ref) =>
          ref.id === candidate.id ? candidate : base.componentCatalog.component(ref),
      },
    };
    invalid(input(), 'nonempty-container', changed);
    expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
  });

  it('accepts an atomic component with an explicitly declared many-child slot', () => {
    expect(COMPONENTS[0]!.kind).toBe('atomic');
    const result = project();
    expect(result.status).toBe('ready');
    expect(Object.keys(result.repeatProvenance)).toHaveLength(2);
    expect(resolveUiCompositionInstances).toHaveBeenCalledTimes(1);
  });
});

describe('reserved parameter-map keys', () => {
  it.each(['__proto__', 'prototype', 'constructor'])(
    'rejects reserved parameter %s without writing generated maps',
    (parameterId) => {
      const before = Object.getOwnPropertyDescriptors(Object.prototype);
      const mappings: UiCollectionRepeatTarget['mappings'] = [
        { parameterId, source: { kind: 'field', fieldId: 'title' }, fallback: 'template-default' },
      ];
      invalid(input([target({ mappings })]), 'mapping-unavailable');
      const validDefinition = definition();
      const root = JSON.parse(JSON.stringify(validDefinition.root)) as UiDocumentV3['root'];
      const declaration = root.$authoring.compositionDefinition!;
      const forgedRoot: UiDocumentV3['root'] = {
        ...root,
        $authoring: {
          ...root.$authoring,
          compositionDefinition: {
            ...declaration,
            parameters: declaration.parameters.map((parameter, index) =>
              index === 0 ? { ...parameter, id: parameterId } : parameter,
            ),
          },
        },
      };
      const forgedDefinition: UiDocumentV3 = {
        ...validDefinition,
        root: forgedRoot,
        source: formatWidgetDocumentJson(forgedRoot),
      };
      invalid(input([target({ mappings })]), 'template-unavailable', context([forgedDefinition]));
      expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(before);
      expect(resolveUiCompositionInstances).not.toHaveBeenCalled();
    },
  );

  it('preserves reserved-looking names as opaque record identities', () => {
    const records = ['__proto__', 'prototype', 'constructor'].map((recordId) => ({
      recordId,
      values: { id: recordId, title: `Record ${recordId}` },
    }));
    const result = project(input([target({ records, resources: [] })]));
    expect(result.status).toBe('ready');
    expect(Object.values(result.repeatProvenance).map((identity) => identity.recordId)).toEqual(
      records.map((record) => record.recordId),
    );
    for (const record of records)
      expect(property(result, record.recordId, 'text', 'text')).toEqual(
        literal(record.values.title),
      );
    for (const { widget } of collectWidgetNodes(result.root!)) {
      if (result.repeatProvenance[widget.id as string])
        expect(Object.getPrototypeOf(readUiDocumentNodeAuthoringV3(widget)!.properties)).toBeNull();
    }
  });
});

it('checks repeat child capability without broadening unrelated historical descriptor policy', () => {
  const base = context();
  const candidate: UiComponentDescriptor = {
    ...COMPONENTS[0]!,
    accessibility: { defaultRole: 'group' },
  };
  const changed: UiDocumentCommandV3AdmissionContext = {
    ...base,
    componentCatalog: {
      ...base.componentCatalog,
      component: (ref) =>
        ref.id === candidate.id ? candidate : base.componentCatalog.component(ref),
    },
  };
  expect(project(input(), changed).status).toBe('ready');
});
