import type { UiComponentDescriptor } from '@workbench-kit/contracts';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { createUiDocumentV3 } from './document-v3.js';
import {
  admitUiCollectionRegionFilter,
  filterUiCollectionRegionRecords,
  parseUiCollectionRegionFilterConfig,
  reconcileUiCollectionRegionSelection,
  type UiCollectionRegionFilterAdmissionResult,
  type UiCollectionRegionFilterCapture,
  type UiCollectionRegionFilterConfig,
  type UiCollectionRegionFilterInput,
  type UiCollectionRegionOptionsSnapshot,
} from './collection-region-filter.js';
import type { UiCollectionRepeatRecord } from './collection-repeat.js';

const ROOT: UiComponentDescriptor = {
  id: 'sample:frame',
  version: '1',
  kind: 'atomic',
  properties: [],
  layout: { childSlots: [{ id: 'children', cardinality: 'many' }] },
  designTime: { label: 'Frame' },
};
const CONTROL: UiComponentDescriptor = {
  id: 'sample:choice',
  version: '1',
  kind: 'atomic',
  properties: [],
  designTime: { label: 'Choice' },
};

function fixture(
  inputId = 'items',
  sourceId = 'tagged-catalog',
  actualBindingId = 'binding',
  extraControls = 0,
  mixedControlVersions = false,
  allowedSources: readonly ('binding' | 'literal')[] | null = ['binding'],
) {
  const targetDescriptor: UiComponentDescriptor = {
    id: `sample:${inputId}`,
    version: '1',
    kind: 'atomic',
    properties: [],
    bindings: [
      {
        id: inputId,
        direction: 'input',
        value: { type: 'collection', ...(allowedSources === null ? {} : { allowedSources }) },
      },
    ],
    layout: { childSlots: [{ id: 'children', cardinality: 'many' }] },
    designTime: { label: 'Repeated items' },
  };
  const node = (id: string, descriptor: UiComponentDescriptor, fields = {}): GenericWidget => ({
    type: 'freeform',
    id,
    $authoring: {
      component: { id: descriptor.id, version: descriptor.version },
      properties: {},
      ...fields,
    },
  });
  const root = node('root', ROOT, { documentSchemaVersion: 3 });
  const authoredRoot = {
    ...root,
    children: [
      node('group-control', CONTROL),
      node('category-control', CONTROL),
      ...Array.from({ length: extraControls }, (_, index) =>
        node(
          `other-control-${index}`,
          mixedControlVersions && index % 2 === 0 ? { ...CONTROL, version: '2' } : CONTROL,
        ),
      ),
      node('target', targetDescriptor, { bindings: { [inputId]: actualBindingId } }),
    ],
  };
  const opened = createUiDocumentV3('consumer', formatWidgetDocumentJson(authoredRoot));
  expect(opened.issues).toEqual([]);
  const document = opened.document!;
  const sourceNamespace = [sourceId, null, 'entries'] as const;
  const sourceSchema = {
    schemaRevision: 'schema-1',
    fields: [
      { id: 'key', value: { type: 'string' as const } },
      { id: 'label', value: { type: 'string' as const } },
    ],
    identityFieldIds: ['key'],
  };
  const catalog = {
    component: (ref: { id: string; version: string }) =>
      [ROOT, CONTROL, targetDescriptor].find(
        (entry) => entry.id === ref.id && entry.version === ref.version,
      ),
    components: () => [ROOT, CONTROL, targetDescriptor],
  };
  const config = (
    controlId = 'group-control',
    fieldId = 'group',
    operator: 'equals' | 'includes' = 'equals',
  ): UiCollectionRegionFilterConfig => ({
    schemaVersion: 1,
    controlId,
    target: { containerNodeId: 'target', inputId, bindingId: 'binding' },
    sourceNamespace,
    expectedSchemaRevision: 'schema-1',
    fieldId,
    operator,
    valueProviderId: `${fieldId}-choices`,
    defaultSelection: { kind: 'all' },
  });
  const fields = [
    { id: 'group', type: 'string' as const },
    { id: 'category', type: 'string-array' as const },
  ];
  const providers = [
    { id: 'group-choices', fieldId: 'group' },
    { id: 'category-choices', fieldId: 'category' },
  ];
  const admit = (candidate = config(), ownerId = 'view-a', configGeneration = 'config-1') =>
    admitUiCollectionRegionFilter({
      config: candidate,
      document,
      controlComponent: { id: CONTROL.id, version: CONTROL.version },
      componentCatalog: catalog,
      binding: { id: 'binding', sourceNamespace, sourceSchema },
      filterFields: fields,
      valueProviders: providers,
      scope: { ownerId, configGeneration },
    });
  return { document, config, fields, providers, admit, sourceNamespace, sourceSchema, catalog };
}

const groupOptions = [
  { token: 'group-a', value: 'A' },
  { token: 'group-b', value: 'B' },
];
const categoryOptions = [
  { token: 'category-editor', value: 'editor' },
  { token: 'category-tool', value: 'tool' },
];

function ready(options = groupOptions, generation = 'source-1'): UiCollectionRegionOptionsSnapshot {
  return { status: 'ready', generation, options };
}

function chosen(
  admission: UiCollectionRegionFilterAdmissionResult,
  token: string,
  options = groupOptions,
  generation = 'source-1',
) {
  expect(admission.status).toBe('ready');
  if (admission.status !== 'ready') throw new Error('Invalid fixture');
  const result = reconcileUiCollectionRegionSelection({
    admission,
    snapshot: ready(options, generation),
    event: { scopeKey: admission.admission.scopeKey, generation, choice: { kind: 'token', token } },
  });
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Invalid fixture');
  return result.selection;
}

function rows(): UiCollectionRegionFilterCapture {
  return {
    records: {
      generation: 'source-1',
      items: [
        { recordId: 'one', values: { key: 'one' } },
        { recordId: 'two', values: { key: 'two' } },
        { recordId: 'three', values: { key: 'three' } },
      ],
    },
    filterRows: {
      generation: 'source-1',
      fields: [
        { id: 'group', type: 'string' },
        { id: 'category', type: 'string-array' },
      ],
      items: [
        { recordId: 'one', values: { group: 'A', category: ['editor'] } },
        { recordId: 'two', values: { group: 'B', category: ['editor', 'tool'] } },
        { recordId: 'three', values: { group: 'A', category: ['tool'] } },
      ],
    },
    options: {
      generation: 'source-1',
      controls: [
        { controlId: 'group-control', providerId: 'group-choices', items: groupOptions },
        { controlId: 'category-control', providerId: 'category-choices', items: categoryOptions },
      ],
    },
  };
}

function paired() {
  const context = fixture();
  const group = context.admit();
  const category = context.admit(context.config('category-control', 'category', 'includes'));
  expect(group.status).toBe('ready');
  expect(category.status).toBe('ready');
  return { group, category, capture: rows() };
}

describe('scoped collection region filtering', () => {
  it('parses exact bounded static configuration without a catalog or runtime options', () => {
    const config = fixture().config();
    expect(parseUiCollectionRegionFilterConfig(config)).toMatchObject({ status: 'ready', config });
    expect(parseUiCollectionRegionFilterConfig({ ...config, schemaVersion: 2 }).status).toBe(
      'invalid',
    );
    expect(parseUiCollectionRegionFilterConfig({ ...config, unexpected: true }).status).toBe(
      'invalid',
    );
    expect(
      parseUiCollectionRegionFilterConfig({
        ...config,
        sourceNamespace: ['source', null, 'out', 'extra'],
      }).status,
    ).toBe('invalid');
    expect(parseUiCollectionRegionFilterConfig({ ...config, fieldId: '\ud800' }).status).toBe(
      'invalid',
    );
    expect(
      parseUiCollectionRegionFilterConfig({ ...config, controlId: 'x'.repeat(257) }).status,
    ).toBe('invalid');
    expect(
      parseUiCollectionRegionFilterConfig({
        ...config,
        defaultSelection: { kind: 'value', value: Number.NaN },
      }).status,
    ).toBe('invalid');
    expect(
      parseUiCollectionRegionFilterConfig({ ...config, valueProviderId: 'x'.repeat(65_000) })
        .status,
    ).toBe('invalid');
    expect(
      parseUiCollectionRegionFilterConfig(Object.setPrototypeOf({ ...config }, new Date())),
    ).toMatchObject({ status: 'invalid' });
    const getter = vi.fn(() => 'group');
    const accessor = Object.defineProperty({ ...config }, 'fieldId', {
      get: getter,
      enumerable: true,
    });
    expect(parseUiCollectionRegionFilterConfig(accessor).status).toBe('invalid');
    expect(getter).not.toHaveBeenCalled();
    const cyclic = { ...config, extra: null as unknown };
    cyclic.extra = cyclic;
    expect(parseUiCollectionRegionFilterConfig(cyclic).status).toBe('invalid');
    const sparseNamespace: (string | null)[] = ['source', null, 'out'];
    Reflect.deleteProperty(sparseNamespace, '1');
    expect(
      parseUiCollectionRegionFilterConfig({ ...config, sourceNamespace: sparseNamespace }).status,
    ).toBe('invalid');
    const ownKeys = vi.fn(() => {
      throw new Error('oversized array was enumerated');
    });
    const oversizedArray = new Proxy(new Array(1_000_001), { ownKeys });
    expect(
      parseUiCollectionRegionFilterConfig({ ...config, sourceNamespace: oversizedArray }).status,
    ).toBe('invalid');
    expect(ownKeys).not.toHaveBeenCalled();
  });

  it('admits exact authored control, empty collection input, binding, field, provider and default', () => {
    const tagged = fixture();
    expect(tagged.admit().status).toBe('ready');
    const manual = fixture('records', 'manual-source');
    expect(manual.admit().status).toBe('ready');
    expect(fixture('items', 'tagged-catalog', 'rebound').admit().status).toBe('invalid');
    expect(fixture('items', 'tagged-catalog', 'binding', 31).admit().status).toBe('invalid');
    expect(fixture('items', 'tagged-catalog', 'binding', 31, true).admit().status).toBe('invalid');
    expect(fixture('items', 'tagged-catalog', 'binding', 0, false, null).admit().status).toBe(
      'invalid',
    );
    expect(
      fixture('items', 'tagged-catalog', 'binding', 0, false, ['literal']).admit().status,
    ).toBe('invalid');
    expect(tagged.admit({ ...tagged.config(), controlId: 'missing' }).status).toBe('invalid');
    expect(
      tagged.admit({
        ...tagged.config(),
        target: { ...tagged.config().target, bindingId: 'other' },
      }).status,
    ).toBe('invalid');
    expect(
      tagged.admit({
        ...tagged.config(),
        target: { ...tagged.config().target, inputId: 'records' },
      }).status,
    ).toBe('invalid');
    expect(tagged.admit({ ...tagged.config(), expectedSchemaRevision: 'stale' }).status).toBe(
      'invalid',
    );
    expect(
      tagged.admit({ ...tagged.config(), sourceNamespace: ['other', null, 'entries'] }).status,
    ).toBe('invalid');
    expect(tagged.admit({ ...tagged.config(), fieldId: 'unknown' }).status).toBe('invalid');
    expect(tagged.admit({ ...tagged.config(), valueProviderId: 'unknown' }).status).toBe('invalid');
    expect(tagged.admit({ ...tagged.config(), operator: 'includes' }).status).toBe('invalid');
    expect(
      tagged.admit({ ...tagged.config(), defaultSelection: { kind: 'value', value: 3 } }).status,
    ).toBe('invalid');
    const longScope = tagged.admit(tagged.config(), 'o'.repeat(256), 'g'.repeat(256));
    expect(longScope.status).toBe('ready');
    expect(
      reconcileUiCollectionRegionSelection({ admission: longScope, snapshot: ready() }),
    ).toMatchObject({ status: 'ready', selection: { availability: 'offered' } });
    const largeValidOptions = Array.from({ length: 1024 }, (_, index) => ({
      token: `token-${index}`,
      value: `value-${index}-${'v'.repeat(80)}`,
    }));
    expect(
      reconcileUiCollectionRegionSelection({
        admission: longScope,
        snapshot: ready(largeValidOptions),
      }),
    ).toMatchObject({ status: 'ready', selection: { availability: 'offered' } });
  });

  it('keeps typed selections within exact scope and successful generation through refresh and Reset', () => {
    const context = fixture();
    const admitted = context.admit({
      ...context.config(),
      defaultSelection: { kind: 'value', value: 'A' },
    });
    expect(admitted.status).toBe('ready');
    if (admitted.status !== 'ready') return;
    const initial = reconcileUiCollectionRegionSelection({
      admission: admitted,
      snapshot: ready(),
    });
    expect(initial).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'A' }, availability: 'offered' },
    });
    if (initial.status !== 'ready') return;
    const selected = chosen(admitted, 'group-b');
    const failed = reconcileUiCollectionRegionSelection({
      admission: admitted,
      previous: selected,
      snapshot: { status: 'failed' },
    });
    expect(failed).toMatchObject({
      status: 'ready',
      selection: {
        selected: { kind: 'value', value: 'B' },
        availability: 'blocked',
        generation: null,
      },
    });
    if (failed.status !== 'ready') return;
    const unavailable = reconcileUiCollectionRegionSelection({
      admission: admitted,
      previous: failed.selection,
      snapshot: ready([{ token: 'group-a', value: 'A' }], 'source-2'),
    });
    expect(unavailable).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'B' }, availability: 'missing' },
    });
    if (unavailable.status !== 'ready') return;
    const stale = reconcileUiCollectionRegionSelection({
      admission: admitted,
      previous: unavailable.selection,
      snapshot: ready([{ token: 'group-a', value: 'A' }], 'source-2'),
      event: {
        scopeKey: admitted.admission.scopeKey,
        generation: 'source-1',
        choice: { kind: 'all' },
      },
    });
    expect(stale).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'B' } },
      diagnostics: [{ code: 'stale-event' }],
    });
    const reset = reconcileUiCollectionRegionSelection({
      admission: admitted,
      previous: unavailable.selection,
      snapshot: ready([{ token: 'group-a', value: 'A' }], 'source-2'),
      event: {
        scopeKey: admitted.admission.scopeKey,
        generation: 'source-2',
        choice: { kind: 'reset' },
      },
    });
    expect(reset).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'A' }, availability: 'offered' },
    });
    const all = reconcileUiCollectionRegionSelection({
      admission: admitted,
      snapshot: ready(),
      event: {
        scopeKey: admitted.admission.scopeKey,
        generation: 'source-1',
        choice: { kind: 'all' },
      },
    });
    expect(all).toMatchObject({ status: 'ready', selection: { selected: { kind: 'all' } } });
    const unknown = reconcileUiCollectionRegionSelection({
      admission: admitted,
      previous: selected,
      snapshot: ready(),
      event: {
        scopeKey: admitted.admission.scopeKey,
        generation: 'source-1',
        choice: { kind: 'token', token: 'not-offered' },
      },
    });
    expect(unknown).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'B' } },
      diagnostics: [{ code: 'unknown-option' }],
    });
    const replacement = context.admit(context.config(), 'view-b');
    const retired = reconcileUiCollectionRegionSelection({
      admission: replacement,
      previous: selected,
      snapshot: ready(),
      event: {
        scopeKey: admitted.admission.scopeKey,
        generation: 'source-1',
        choice: { kind: 'token', token: 'group-b' },
      },
    });
    expect(retired).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'all' } },
      diagnostics: [{ code: 'stale-event' }],
    });
    expect(context.admit(context.config(), 'view-a', 'config-2')).toMatchObject({
      status: 'ready',
    });
    const missingDefault = context.admit({
      ...context.config(),
      defaultSelection: { kind: 'value', value: 'not-offered' },
    });
    expect(
      reconcileUiCollectionRegionSelection({ admission: missingDefault, snapshot: ready() }),
    ).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'value', value: 'not-offered' }, availability: 'missing' },
    });
    const oldOwner = context.admit(context.config(), 'view-a', 'config-1');
    const newOwner = context.admit(context.config(), 'view-a', 'config-2');
    expect(
      reconcileUiCollectionRegionSelection({
        admission: newOwner,
        previous: chosen(oldOwner, 'group-b'),
        snapshot: ready(),
        event: {
          scopeKey: oldOwner.status === 'ready' ? oldOwner.admission.scopeKey : '',
          generation: 'source-1',
          choice: { kind: 'token', token: 'group-b' },
        },
      }),
    ).toMatchObject({
      status: 'ready',
      selection: { selected: { kind: 'all' } },
      diagnostics: [{ code: 'stale-event' }],
    });
  });

  it('ANDs strict scalar equality and exact string-array membership over baseline rows without mutation', () => {
    const { group, category, capture } = paired();
    const groupSelection = chosen(group, 'group-a');
    const categorySelection = chosen(category, 'category-editor', categoryOptions);
    const input: UiCollectionRegionFilterInput = {
      admissions: [group, category],
      selections: [groupSelection, categorySelection],
      capture,
    };
    const result = filterUiCollectionRegionRecords(input);
    expect(result).toMatchObject({ status: 'ready', filteredCount: 1 });
    if (result.status !== 'ready') return;
    expect(result.records.map((entry) => entry.recordId)).toEqual(['one']);
    expect(result.records[0]).toBe(capture.records.items[0]);
    expect(capture.records.items.map((entry) => entry.recordId)).toEqual(['one', 'two', 'three']);
    const all = reconcileUiCollectionRegionSelection({ admission: group, snapshot: ready() });
    expect(all.status).toBe('ready');
    if (all.status !== 'ready') return;
    const baseline = filterUiCollectionRegionRecords({
      admissions: [group, category],
      selections: [all.selection, categorySelection],
      capture,
    });
    expect(baseline).toMatchObject({ status: 'ready', filteredCount: 2 });
    if (baseline.status === 'ready')
      expect(baseline.records.map((entry) => entry.recordId)).toEqual(['one', 'two']);
    const manual = fixture('records', 'manual-source');
    const manualGroup = manual.admit();
    const manualCapture = {
      ...rows(),
      options: { ...rows().options, controls: [rows().options.controls[0]!] },
    };
    const manualResult = filterUiCollectionRegionRecords({
      admissions: [manualGroup],
      selections: [chosen(manualGroup, 'group-a')],
      capture: manualCapture,
    });
    expect(manualResult).toMatchObject({ status: 'ready', filteredCount: 2 });
  });

  it('rejects malformed filtered-out and off-page rows, mixed captures, duplicates and ambiguous options', () => {
    const { group, category, capture } = paired();
    const selections = [
      chosen(group, 'group-a'),
      chosen(category, 'category-editor', categoryOptions),
    ];
    const base = { admissions: [group, category], selections, capture };
    const anotherOwner = fixture();
    const foreignCategory = anotherOwner.admit(
      anotherOwner.config('category-control', 'category', 'includes'),
      'view-b',
    );
    expect(
      filterUiCollectionRegionRecords({
        admissions: [group, foreignCategory],
        selections: [selections[0]!, chosen(foreignCategory, 'category-editor', categoryOptions)],
        capture,
      }),
    ).toMatchObject({ status: 'invalid', records: [], filteredCount: 0 });
    const invalid = (replacement: UiCollectionRegionFilterCapture) =>
      expect(filterUiCollectionRegionRecords({ ...base, capture: replacement })).toMatchObject({
        status: 'invalid',
        records: [],
        filteredCount: 0,
      });
    invalid({
      ...capture,
      filterRows: {
        ...capture.filterRows,
        items: [
          capture.filterRows.items[0]!,
          capture.filterRows.items[1]!,
          { recordId: 'three', values: { group: 'A', category: [9] } },
        ],
      },
    });
    invalid({
      ...capture,
      records: {
        ...capture.records,
        items: [
          capture.records.items[0]!,
          capture.records.items[1]!,
          { recordId: 'three', values: { key: 'three', label: 9 } },
        ],
      },
    });
    invalid({
      ...capture,
      filterRows: {
        ...capture.filterRows,
        items: [
          capture.filterRows.items[0]!,
          capture.filterRows.items[1]!,
          { recordId: 'three', values: { group: 'x'.repeat(16 * 1024 + 1), category: ['tool'] } },
        ],
      },
    });
    invalid({
      ...capture,
      filterRows: {
        ...capture.filterRows,
        items: [
          capture.filterRows.items[0]!,
          { ...capture.filterRows.items[1]!, recordId: 'wrong' },
          capture.filterRows.items[2]!,
        ],
      },
    });
    invalid({ ...capture, filterRows: { ...capture.filterRows, generation: 'source-2' } });
    invalid({
      ...capture,
      records: {
        ...capture.records,
        items: [
          capture.records.items[0]!,
          { ...capture.records.items[1]!, recordId: 'one' },
          capture.records.items[2]!,
        ],
      },
    });
    invalid({
      ...capture,
      options: {
        ...capture.options,
        controls: [
          {
            ...capture.options.controls[0]!,
            items: [
              { token: 'same', value: 1 },
              { token: 'another', value: '1' },
            ],
          },
          capture.options.controls[1]!,
        ],
      },
    });
    invalid({
      ...capture,
      options: {
        ...capture.options,
        controls: [
          {
            ...capture.options.controls[0]!,
            items: Array.from({ length: 1025 }, (_, index) => ({
              token: `token-${index}`,
              value: `value-${index}`,
            })),
          },
          capture.options.controls[1]!,
        ],
      },
    });
    const blocked = { ...selections[0]!, availability: 'blocked' as const, generation: null };
    expect(
      filterUiCollectionRegionRecords({ ...base, selections: [blocked, selections[1]!] }),
    ).toMatchObject({ status: 'blocked', records: [], filteredCount: 0 });
    const missing = {
      ...selections[0]!,
      selected: { kind: 'value' as const, value: 'absent' },
      availability: 'missing' as const,
    };
    expect(
      filterUiCollectionRegionRecords({ ...base, selections: [missing, selections[1]!] }),
    ).toMatchObject({ status: 'ready', records: [], filteredCount: 0 });
    const cap = Array.from({ length: 10_001 }, (_, index): UiCollectionRepeatRecord => ({
      recordId: `item-${index}`,
      values: { key: `item-${index}` },
    }));
    invalid({ ...capture, records: { ...capture.records, items: cap } });
    expect(
      filterUiCollectionRegionRecords({
        admissions: Array.from({ length: 33 }, () => group),
        selections: Array.from({ length: 33 }, () => selections[0]!),
        capture,
      }),
    ).toMatchObject({ status: 'invalid', records: [] });
  });
});
