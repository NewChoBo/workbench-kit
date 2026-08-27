import { describe, expect, it, vi } from 'vitest';
import { createValueTransformRegistry } from '../../registry/createValueTransformRegistry.js';
import type {
  FieldRemapDocument,
  MappingEdge,
  SourceField,
  TargetSlot,
  ValueTransformDefinition,
} from '../types.js';
import {
  deserializeFieldRemapImport,
  FIELD_REMAP_IMPORT_FAILURE_CODES,
  FieldRemapImportAdmissionError,
  preflightFieldRemapImport,
  type FieldRemapImportContext,
  type FieldRemapImportFailureCode,
} from './fieldRemapImport.js';
import {
  parseFieldRemapDocument,
  serializeFieldRemapDocument,
  UnsupportedFieldRemapDocumentVersionError,
} from './fieldRemapDocument.js';

const sources: readonly SourceField[] = [
  { id: 'source.name', label: 'Name', dataType: 'string' },
  { id: 'source.first', label: 'First', dataType: 'string' },
  { id: 'source.last', label: 'Last', dataType: 'string' },
  { id: 'source.object', label: 'Object', dataType: 'object' },
  { id: 'source.items', label: 'Items', dataType: 'array' },
  { id: 'source.items.item.name', label: 'Item name', dataType: 'string' },
];

const targets: readonly TargetSlot[] = [
  { id: 'target.name', label: 'Name', dataType: 'string' },
  { id: 'target.count', label: 'Count', dataType: 'number' },
  { id: 'target.combined', label: 'Combined', dataType: 'string' },
  { id: 'target.first', label: 'First', dataType: 'string' },
  { id: 'target.last', label: 'Last', dataType: 'string' },
  { id: 'target.items', label: 'Items', dataType: 'array' },
  { id: 'target.items.item.name', label: 'Item name', dataType: 'string' },
];

const transformApply = vi.fn((value: unknown) => value);

const definitions: readonly ValueTransformDefinition[] = [
  {
    id: 'string:trim',
    label: 'Trim',
    inputTypes: ['string'],
    outputType: 'string',
    apply: transformApply,
  },
  {
    id: 'string:upper',
    label: 'Upper',
    inputTypes: ['string'],
    outputType: 'string',
    apply: transformApply,
  },
  {
    id: 'object:join',
    label: 'Join',
    inputTypes: ['object'],
    outputType: 'string',
    apply: transformApply,
  },
];

function createContext(): FieldRemapImportContext {
  return {
    sources,
    targets,
    transforms: createValueTransformRegistry(definitions),
  };
}

function edge(overrides: Partial<MappingEdge> = {}): MappingEdge {
  return {
    id: 'edge-name',
    sourceFieldId: 'source.name',
    targetSlotId: 'target.name',
    ...overrides,
  };
}

function document(
  overrides: Partial<Omit<FieldRemapDocument, 'version'>> = {},
): FieldRemapDocument {
  return {
    version: 2,
    edges: [edge()],
    ...overrides,
  };
}

function captureAdmissionError(action: () => unknown): FieldRemapImportAdmissionError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(FieldRemapImportAdmissionError);
    return error as FieldRemapImportAdmissionError;
  }
  throw new Error('Expected FieldRemapImportAdmissionError.');
}

function expectFailure(
  action: () => unknown,
  code: Exclude<FieldRemapImportFailureCode, 'unsupported-version'>,
  path?: string,
): void {
  const error = captureAdmissionError(action);
  expect(error.code).toBe(code);
  if (path !== undefined) {
    expect(error.path).toBe(path);
  }
}

describe('Field Remap strict import admission', () => {
  it('freezes the exact normalized v2 self-export without executing transforms', () => {
    transformApply.mockClear();
    const registry = createValueTransformRegistry(definitions);
    const getSpy = vi.spyOn(registry, 'get');
    const original = document({
      edges: [
        edge({
          transformIds: ['string:trim', 'string:upper'],
          transformOptionSteps: [undefined, { locale: 'en' }],
        }),
        edge({
          id: 'edge-items',
          sourceFieldId: 'source.items',
          targetSlotId: 'target.items',
          itemEdges: [
            edge({
              id: 'edge-item-name',
              sourceFieldId: 'source.items.item.name',
              targetSlotId: 'target.items.item.name',
            }),
          ],
        }),
      ],
      operators: [
        {
          kind: 'combine',
          id: 'combine-name',
          inputFieldIds: ['source.first', 'source.last'],
          outputSlotId: 'target.combined',
          transformIds: ['object:join'],
        },
        {
          kind: 'split',
          id: 'split-name',
          inputFieldId: 'source.object',
          outputSlotIds: ['target.first', 'target.last'],
        },
      ],
    });

    const admitted = deserializeFieldRemapImport(serializeFieldRemapDocument(original), {
      sources,
      targets,
      transforms: registry,
    });

    expect(admitted).toEqual(
      parseFieldRemapDocument(JSON.parse(serializeFieldRemapDocument(original))),
    );
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.edges)).toBe(true);
    expect(Object.isFrozen(admitted.edges[0]?.transformOptionSteps?.[1])).toBe(true);
    expect(Object.isFrozen(admitted.edges[1]?.itemEdges)).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(3);
    expect(transformApply).not.toHaveBeenCalled();
  });

  it('keeps the closed public failure vocabulary exact', () => {
    expect(FIELD_REMAP_IMPORT_FAILURE_CODES).toEqual([
      'invalid-json',
      'unsupported-version',
      'invalid-document',
      'duplicate-id',
      'incompatible-source',
      'incompatible-target',
      'unavailable-transform',
    ]);
    expect(Object.isFrozen(FIELD_REMAP_IMPORT_FAILURE_CODES)).toBe(true);
  });

  it('classifies invalid JSON and preserves unsupported-version error semantics', () => {
    expectFailure(() => deserializeFieldRemapImport('{', createContext()), 'invalid-json', '$');
    let unsupported: UnsupportedFieldRemapDocumentVersionError | undefined;
    try {
      deserializeFieldRemapImport('{"version":1,"edges":[]}', createContext());
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedFieldRemapDocumentVersionError);
      unsupported = error as UnsupportedFieldRemapDocumentVersionError;
    }
    expect(unsupported?.version).toBe(1);
    expect(unsupported?.expectedVersion).toBe(2);
    expect(() => preflightFieldRemapImport({ version: 3, edges: [] }, createContext())).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expectFailure(
      () => preflightFieldRemapImport({ edges: [] }, createContext()),
      'invalid-document',
      '$.version',
    );
  });

  it('selects unsupported version before inspecting hostile rows', () => {
    let getterCalls = 0;
    const hostileEdge = Object.defineProperty({}, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'edge';
      },
    });

    expect(() =>
      preflightFieldRemapImport({ version: 3, edges: [hostileEdge] }, createContext()),
    ).toThrow(UnsupportedFieldRemapDocumentVersionError);
    const topLevelEdges = Object.defineProperty({ version: 3 }, 'edges', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      },
    });
    expect(() => preflightFieldRemapImport(topLevelEdges, createContext())).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(getterCalls).toBe(0);
  });

  it('observes a mutable top-level proxy only once before freezing its snapshot', () => {
    let versionDescriptorReads = 0;
    const raw = new Proxy(
      { version: 2, edges: [] },
      {
        getOwnPropertyDescriptor(target, key) {
          if (key === 'version') {
            versionDescriptorReads += 1;
            return {
              configurable: true,
              enumerable: true,
              value: versionDescriptorReads === 1 ? 2 : 3,
              writable: true,
            };
          }
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );

    expect(preflightFieldRemapImport(raw, createContext())).toEqual({ version: 2, edges: [] });
    expect(versionDescriptorReads).toBe(1);
  });

  it('enumerates a changing ownKeys source once without hiding valid structural state', () => {
    const expected = document({
      operators: [
        {
          kind: 'split',
          id: 'split-name',
          inputFieldId: 'source.object',
          outputSlotIds: ['target.first', 'target.last'],
        },
      ],
    });
    let ownKeysCalls = 0;
    let getterCalls = 0;
    const raw = new Proxy(expected, {
      get() {
        getterCalls += 1;
        throw new Error('Import preflight must not read through getters.');
      },
      ownKeys(target) {
        ownKeysCalls += 1;
        // The former Reflect.ownKeys + Object.getOwnPropertyDescriptors pair made a
        // second source enumeration. A legal extensible proxy can expose new state
        // then; the first key list would silently omit it from the frozen snapshot.
        if (ownKeysCalls > 1) {
          Object.defineProperty(target, 'unexpected', {
            configurable: true,
            enumerable: true,
            value: 'must-not-be-hidden',
          });
        }
        return Reflect.ownKeys(target);
      },
    });

    const admitted = preflightFieldRemapImport(raw, createContext());

    expect(ownKeysCalls).toBe(1);
    expect(getterCalls).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(expected, 'unexpected')).toBe(false);
    expect(admitted).toEqual(expected);
    expect(admitted.operators).toEqual(expected.operators);
  });

  it('does not execute coercion hooks on an invalid version value', () => {
    const toString = vi.fn(() => '3');
    expectFailure(
      () => preflightFieldRemapImport({ version: { toString }, edges: [] }, createContext()),
      'invalid-document',
      '$.version',
    );
    expect(toString).not.toHaveBeenCalled();
  });

  it('fails closed on accessors, revoked proxies, sparse arrays, cycles, and unsafe keys', () => {
    let getterCalls = 0;
    const accessor = Object.defineProperty({ version: 2 }, 'edges', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      },
    });
    expectFailure(() => preflightFieldRemapImport(accessor, createContext()), 'invalid-document');
    expect(getterCalls).toBe(0);

    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expectFailure(() => preflightFieldRemapImport(proxy, createContext()), 'invalid-document');

    const sparse = new Array(2);
    sparse[1] = edge();
    expectFailure(
      () => preflightFieldRemapImport({ version: 2, edges: sparse }, createContext()),
      'invalid-document',
    );

    const cyclicOptions: Record<string, unknown> = {};
    cyclicOptions.self = cyclicOptions;
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({
            edges: [edge({ transformIds: ['string:trim'], transformOptionSteps: [cyclicOptions] })],
          }),
          createContext(),
        ),
      'invalid-document',
    );

    const unsafeOptions = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({
            edges: [edge({ transformIds: ['string:trim'], transformOptionSteps: [unsafeOptions] })],
          }),
          createContext(),
        ),
      'invalid-document',
    );
  });

  it.each([
    {
      name: 'unknown edge member',
      raw: { version: 2, edges: [{ ...edge(), unknown: true }] },
    },
    {
      name: 'over-limit edge transform chain',
      raw: document({
        edges: [
          edge({
            transformIds: ['string:trim', 'string:upper', 'string:trim', 'string:upper'],
          }),
        ],
      }),
    },
    {
      name: 'identity transform that normalization would drop',
      raw: document({ edges: [edge({ transformIds: ['identity'] })] }),
    },
    {
      name: 'over-limit item transform chain',
      raw: document({
        edges: [
          edge({
            sourceFieldId: 'source.items',
            targetSlotId: 'target.items',
            itemTransformIds: ['string:trim', 'string:upper', 'string:trim', 'string:upper'],
          }),
        ],
      }),
    },
    {
      name: 'semantic option step past the transform chain',
      raw: document({
        edges: [
          edge({
            transformIds: ['string:trim'],
            transformOptionSteps: [{ locale: 'en' }, { discarded: true }],
          }),
        ],
      }),
    },
    {
      name: 'nested list context',
      raw: document({
        edges: [
          edge({
            id: 'outer',
            sourceFieldId: 'source.items',
            targetSlotId: 'target.items',
            itemEdges: [
              edge({
                id: 'child',
                sourceFieldId: 'source.items.item.name',
                targetSlotId: 'target.items.item.name',
                itemEdges: [],
              }),
            ],
          }),
        ],
      }),
    },
    {
      name: 'list context with suppressed item projection state',
      raw: document({
        edges: [
          edge({
            id: 'outer',
            sourceFieldId: 'source.items',
            targetSlotId: 'target.items',
            itemSourcePath: 'name',
            itemEdges: [
              edge({
                id: 'child',
                sourceFieldId: 'source.items.item.name',
                targetSlotId: 'target.items.item.name',
              }),
            ],
          }),
        ],
      }),
    },
    {
      name: 'unsafe item source path',
      raw: document({ edges: [edge({ itemSourcePath: '__proto__.name' })] }),
    },
    {
      name: 'malformed operator that permissive normalization drops',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'split',
            id: 'bad-split',
            inputFieldId: 'source.object',
            outputSlotIds: ['target.first'],
          },
        ],
      }),
    },
    {
      name: 'over-limit combine fan-in',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'combine',
            id: 'wide',
            inputFieldIds: Array.from({ length: 9 }, (_, index) => `source.${index}`),
            outputSlotId: 'target.combined',
          },
        ],
      }),
    },
    {
      name: 'over-limit operator transform chain',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'combine',
            id: 'combine',
            inputFieldIds: ['source.first', 'source.last'],
            outputSlotId: 'target.combined',
            transformIds: ['object:join', 'string:trim', 'string:upper', 'string:trim'],
          },
        ],
      }),
    },
    {
      name: 'over-limit split fan-out',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'split',
            id: 'wide',
            inputFieldId: 'source.object',
            outputSlotIds: Array.from({ length: 9 }, (_, index) => `target.${index}`),
          },
        ],
      }),
    },
    {
      name: 'trimmed edge identity',
      raw: document({ edges: [edge({ id: ' edge-name' })] }),
    },
    {
      name: 'blank edge operand',
      raw: document({ edges: [edge({ sourceFieldId: '' })] }),
    },
    {
      name: 'trimmed operator identity',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'split',
            id: ' split-name ',
            inputFieldId: 'source.object',
            outputSlotIds: ['target.first', 'target.last'],
          },
        ],
      }),
    },
  ])('rejects lossy normalization input: $name', ({ raw }) => {
    expectFailure(() => preflightFieldRemapImport(raw, createContext()), 'invalid-document');
  });

  it('rejects duplicate edge identities across the complete edge tree and duplicate operands', () => {
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({
            edges: [
              edge({ id: 'same' }),
              edge({
                id: 'list',
                sourceFieldId: 'source.items',
                targetSlotId: 'target.items',
                itemEdges: [
                  edge({
                    id: 'same',
                    sourceFieldId: 'source.items.item.name',
                    targetSlotId: 'target.items.item.name',
                  }),
                ],
              }),
            ],
          }),
          createContext(),
        ),
      'duplicate-id',
      '$.edges[1].itemEdges[0].id',
    );

    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({
            edges: [],
            operators: [
              {
                kind: 'combine',
                id: 'duplicate-input',
                inputFieldIds: ['source.first', 'source.first'],
                outputSlotId: 'target.combined',
              },
            ],
          }),
          createContext(),
        ),
      'duplicate-id',
      '$.operators[0].inputFieldIds[1]',
    );
  });

  it('classifies dangling and type-incompatible operands without pruning them', () => {
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({ edges: [edge({ sourceFieldId: 'source.missing' })] }),
          createContext(),
        ),
      'incompatible-source',
      '$.edges[0].sourceFieldId',
    );
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({ edges: [edge({ targetSlotId: 'target.missing' })] }),
          createContext(),
        ),
      'incompatible-target',
      '$.edges[0].targetSlotId',
    );
    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({ edges: [edge({ targetSlotId: 'target.count' })] }),
          createContext(),
        ),
      'incompatible-target',
      '$.edges[0].targetSlotId',
    );
  });

  it.each([
    {
      code: 'incompatible-source' as const,
      path: '$.edges[0].itemEdges[0].sourceFieldId',
      raw: document({
        edges: [
          edge({
            id: 'list',
            sourceFieldId: 'source.items',
            targetSlotId: 'target.items',
            itemEdges: [
              edge({
                id: 'child',
                sourceFieldId: 'source.missing',
                targetSlotId: 'target.items.item.name',
              }),
            ],
          }),
        ],
      }),
    },
    {
      code: 'incompatible-source' as const,
      path: '$.operators[0].inputFieldIds[1]',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'combine',
            id: 'combine',
            inputFieldIds: ['source.first', 'source.missing'],
            outputSlotId: 'target.combined',
          },
        ],
      }),
    },
    {
      code: 'incompatible-target' as const,
      path: '$.operators[0].outputSlotIds[1]',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'split',
            id: 'split',
            inputFieldId: 'source.object',
            outputSlotIds: ['target.first', 'target.missing'],
          },
        ],
      }),
    },
  ])('rejects dangling child/operator operands at $path', ({ raw, code, path }) => {
    expectFailure(() => preflightFieldRemapImport(raw, createContext()), code, path);
  });

  it('resolves every unique transform exactly once and fails closed on unavailable catalogs', () => {
    const registry = createValueTransformRegistry(definitions);
    const getSpy = vi.spyOn(registry, 'get');
    preflightFieldRemapImport(
      document({
        edges: [
          edge({ transformIds: ['string:trim', 'string:upper'] }),
          edge({ id: 'edge-two', transformIds: ['string:trim'] }),
        ],
      }),
      { sources, targets, transforms: registry },
    );
    expect(getSpy).toHaveBeenCalledTimes(2);

    expectFailure(
      () =>
        preflightFieldRemapImport(
          document({ edges: [edge({ transformIds: ['missing'] })] }),
          createContext(),
        ),
      'unavailable-transform',
      '$.edges[0].transformIds[0]',
    );

    const throwingRegistry = createValueTransformRegistry(definitions);
    throwingRegistry.get = () => {
      throw new Error('catalog unavailable');
    };
    expectFailure(
      () =>
        preflightFieldRemapImport(document({ edges: [edge({ transformIds: ['string:trim'] })] }), {
          sources,
          targets,
          transforms: throwingRegistry,
        }),
      'unavailable-transform',
    );
  });

  it.each([
    {
      path: '$.edges[0].itemTransformIds[0]',
      raw: document({
        edges: [
          edge({
            sourceFieldId: 'source.items',
            targetSlotId: 'target.items',
            itemTransformIds: ['missing'],
          }),
        ],
      }),
    },
    {
      path: '$.operators[0].transformIds[0]',
      raw: document({
        edges: [],
        operators: [
          {
            kind: 'combine',
            id: 'combine',
            inputFieldIds: ['source.first', 'source.last'],
            outputSlotId: 'target.combined',
            transformIds: ['missing'],
          },
        ],
      }),
    },
  ])('rejects unavailable item/operator transforms at $path', ({ raw, path }) => {
    expectFailure(
      () => preflightFieldRemapImport(raw, createContext()),
      'unavailable-transform',
      path,
    );
  });

  it('preserves every admitted option key/value and does not mutate input or context', () => {
    const options = {
      empty: '',
      falseValue: false,
      nested: { list: [0, null, 'value'] },
      zero: 0,
    };
    const raw = document({
      edges: [
        edge({
          transformIds: ['string:trim', 'string:upper'],
          transformOptionSteps: [undefined, options],
        }),
      ],
    });
    const rawBefore = JSON.stringify(raw);
    const context = createContext();
    const sourceBefore = JSON.stringify(context.sources);
    const targetBefore = JSON.stringify(context.targets);

    const admitted = deserializeFieldRemapImport(JSON.stringify(raw), context);

    expect(admitted.edges[0]?.transformOptionSteps?.[1]).toEqual(options);
    expect(JSON.stringify(raw)).toBe(rawBefore);
    expect(JSON.stringify(context.sources)).toBe(sourceBefore);
    expect(JSON.stringify(context.targets)).toBe(targetBefore);
    expect(Object.isFrozen(options)).toBe(false);
  });

  it('retains the existing permissive codec behavior for existing callers', () => {
    const permissive = parseFieldRemapDocument({
      version: 2,
      edges: [
        {
          ...edge(),
          transformIds: ['string:trim', 'string:upper', 'string:trim', 'string:upper'],
        },
      ],
      operators: [
        {
          kind: 'split',
          id: 'dropped',
          inputFieldId: 'source.object',
          outputSlotIds: ['target.first'],
        },
      ],
    });
    expect(permissive.edges[0]?.transformIds).toHaveLength(3);
    expect(permissive.operators).toBeUndefined();
  });
});
