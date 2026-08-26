import { describe, expect, it, vi } from 'vitest';

import {
  resolveNodeTypeCatalog,
  type NodeTypeCatalog,
  type NodeTypeCatalogContribution,
  type NodeTypeDescriptor,
  type NodeTypeRef,
  type UiComponentCatalogContract,
  type UiValueSchema,
} from '../index';
import {
  resolveAuthoringDevelopmentRequirement,
  type AuthoringDevelopmentRequirement,
} from '../authoring-development';
import {
  EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES,
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS,
  projectExternalNodeCatalogContribution,
  type ExternalNodeCatalogEntry,
  type ExternalNodeCatalogProjectionMapping,
  type ExternalNodeCatalogProjectionResult,
  type ExternalNodeCatalogSnapshot,
  type ExternalStaticNodeCatalogEntry,
} from './index';

const FILTER_SOURCE_KEY = 'source.number-filter@1';
const FORMAT_SOURCE_KEY = 'source.text-format@1';
const DYNAMIC_SOURCE_KEY = 'source.dynamic-ports@1';

const FILTER_TARGET = Object.freeze({
  id: 'workbench.external.number-filter',
  version: '1.0.0',
} satisfies NodeTypeRef);
const FORMAT_TARGET = Object.freeze({
  id: 'workbench.external.text-format',
  version: '1.0.0',
} satisfies NodeTypeRef);
const DYNAMIC_TARGET = Object.freeze({
  id: 'workbench.external.dynamic-ports',
  version: '1.0.0',
} satisfies NodeTypeRef);

const NUMBER_VALUE = Object.freeze({
  type: 'number',
  defaultValue: 0,
  constraints: Object.freeze({ min: 0, max: 100 }),
  editor: Object.freeze({ id: 'number', metadata: Object.freeze({ compact: true }) }),
  allowedSources: Object.freeze(['literal', 'binding']),
} satisfies UiValueSchema<number>);

const STRING_VALUE = Object.freeze({
  type: 'string',
  defaultValue: '',
  editor: Object.freeze({ id: 'text' }),
  allowedSources: Object.freeze(['literal']),
} satisfies UiValueSchema<string>);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function filterEntry(sourceTypeKey = FILTER_SOURCE_KEY): ExternalStaticNodeCatalogEntry {
  return {
    kind: 'static',
    sourceTypeKey,
    inputs: [
      {
        kind: 'fixed',
        id: 'source',
        label: 'Source',
        description: 'Incoming number',
        valueSemanticId: 'semantic.number',
        required: true,
      },
    ],
    outputs: [
      {
        kind: 'fixed',
        id: 'accepted',
        label: 'Accepted',
        description: 'Accepted number',
        valueSemanticId: 'semantic.number',
      },
    ],
    designTime: {
      label: 'Number filter',
      description: 'Filters one number',
      category: 'data',
      icon: 'filter',
      tags: ['data', 'transform'],
    },
  };
}

function formatEntry(sourceTypeKey = FORMAT_SOURCE_KEY): ExternalStaticNodeCatalogEntry {
  return {
    kind: 'static',
    sourceTypeKey,
    inputs: [
      {
        kind: 'fixed',
        id: 'value',
        label: 'Value',
        valueSemanticId: 'semantic.string',
      },
    ],
    outputs: [
      {
        kind: 'fixed',
        id: 'formatted',
        label: 'Formatted',
        valueSemanticId: 'semantic.string',
      },
    ],
    designTime: {
      label: 'Text format',
      description: 'Formats one text value',
      category: 'text',
      tags: ['text'],
    },
  };
}

function dynamicEntry(sourceTypeKey = DYNAMIC_SOURCE_KEY): ExternalNodeCatalogEntry {
  return {
    kind: 'dynamic',
    sourceTypeKey,
    designTime: {
      label: 'Dynamic ports',
      description: 'Declares ports at runtime',
      category: 'dynamic',
    },
  };
}

function snapshot(entries: readonly ExternalNodeCatalogEntry[]): ExternalNodeCatalogSnapshot {
  return { schemaVersion: 1, entries };
}

function identity(sourceTypeKey: string, target: NodeTypeRef) {
  return { sourceTypeKey, target };
}

function value(sourceSemanticId: string, target: UiValueSchema) {
  return { sourceSemanticId, target };
}

function mapping(
  identities = [
    identity(FILTER_SOURCE_KEY, FILTER_TARGET),
    identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
    identity(DYNAMIC_SOURCE_KEY, DYNAMIC_TARGET),
  ],
  values = [value('semantic.number', NUMBER_VALUE), value('semantic.string', STRING_VALUE)],
): ExternalNodeCatalogProjectionMapping {
  return {
    schemaVersion: 1,
    contributorId: 'external.fixture',
    identities,
    values,
  };
}

function metadataWithProperties(count: number): Record<string, boolean> {
  const metadata: Record<string, boolean> = {};
  for (let index = 0; index < count; index += 1) metadata[`property${index}`] = true;
  return metadata;
}

function nestedMetadata(objectCount: number): Record<string, unknown> {
  if (objectCount < 1) throw new Error('Nested metadata requires at least one object.');
  let current: Record<string, unknown> = { terminal: true };
  for (let index = 1; index < objectCount; index += 1) current = { next: current };
  return current;
}

function entryWithPortCounts(
  inputCount: number,
  outputCount: number,
): ExternalStaticNodeCatalogEntry {
  return {
    kind: 'static',
    sourceTypeKey: 'source.port-limit@1',
    inputs: Array.from({ length: inputCount }, (_, index) => ({
      kind: 'fixed' as const,
      id: `input-${index}`,
      valueSemanticId: 'semantic.number',
    })),
    outputs: Array.from({ length: outputCount }, (_, index) => ({
      kind: 'fixed' as const,
      id: `output-${index}`,
      valueSemanticId: 'semantic.number',
    })),
    designTime: { label: 'Port limit' },
  };
}

function expectedFilterDescriptor(): NodeTypeDescriptor {
  return {
    ...FILTER_TARGET,
    inputs: [
      {
        id: 'source',
        label: 'Source',
        description: 'Incoming number',
        value: clone(NUMBER_VALUE),
        required: true,
      },
    ],
    outputs: [
      {
        id: 'accepted',
        label: 'Accepted',
        description: 'Accepted number',
        value: clone(NUMBER_VALUE),
      },
    ],
    designTime: {
      label: 'Number filter',
      description: 'Filters one number',
      category: 'data',
      icon: 'filter',
      tags: ['data', 'transform'],
    },
  };
}

function unrelatedDescriptor(): NodeTypeDescriptor {
  return {
    id: 'workbench.builtin.constant',
    version: '1.0.0',
    inputs: [],
    outputs: [{ id: 'value', value: { type: 'number' } }],
    designTime: { label: 'Constant', category: 'data' },
  };
}

function nodeRequirement(descriptor = expectedFilterDescriptor()): AuthoringDevelopmentRequirement {
  return {
    schemaVersion: 1,
    requirementId: 'requirement.external.number-filter',
    target: { kind: 'node-type', descriptor },
    intent: {
      summary: 'Provide the exact static number filter descriptor.',
      acceptance: ['Expose the declared fixed input and output.'],
      nonGoals: ['Do not install, activate, preview or execute code.'],
    },
  };
}

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      expectDeepFrozen(descriptor.value, seen);
    }
  }
}

function issueCodes(result: ExternalNodeCatalogProjectionResult): readonly string[] {
  return result.issues.map((issue) => issue.code);
}

function expectNoContribution(
  result: Extract<
    ExternalNodeCatalogProjectionResult,
    { readonly status: 'rejected' | 'invalid' | 'unsupported-version' }
  >,
): void {
  expect(result).not.toHaveProperty('contribution');
  expect(result.accepted).toEqual([]);
}

describe('external node catalog projection status and survivors', () => {
  it('exposes frozen constants and returns a frozen empty complete contribution', () => {
    expect(Object.isFrozen(EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES)).toBe(true);
    expect(Object.isFrozen(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS)).toBe(true);

    const result = projectExternalNodeCatalogContribution(snapshot([]), mapping([], []));

    expect(result).toEqual({
      status: 'complete',
      contribution: { contributorId: 'external.fixture', nodeTypes: [] },
      accepted: [],
      issues: [],
    });
    expectDeepFrozen(result);
  });

  it('keeps complete output in source order, detached from both caller operands', () => {
    const rawSnapshot = clone(snapshot([formatEntry(), filterEntry()])) as unknown as {
      schemaVersion: 1;
      entries: Array<{
        sourceTypeKey: string;
        designTime: { label: string };
        inputs: Array<{ valueSemanticId: string }>;
      }>;
    };
    const rawMapping = clone(mapping()) as unknown as {
      schemaVersion: 1;
      contributorId: string;
      identities: Array<{ sourceTypeKey: string; target: { id: string; version: string } }>;
      values: Array<{ sourceSemanticId: string; target: { type: string } }>;
    };

    const result = projectExternalNodeCatalogContribution(rawSnapshot, rawMapping);
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error('Expected complete projection.');

    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([0, 1]);
    expect(result.accepted.map((entry) => entry.target.id)).toEqual([
      FORMAT_TARGET.id,
      FILTER_TARGET.id,
    ]);
    expect(result.contribution.nodeTypes.map((entry) => entry.id)).toEqual([
      FORMAT_TARGET.id,
      FILTER_TARGET.id,
    ]);

    rawSnapshot.entries[0]!.sourceTypeKey = 'mutated.source';
    rawSnapshot.entries[0]!.designTime.label = 'Mutated label';
    rawSnapshot.entries[0]!.inputs[0]!.valueSemanticId = 'mutated.semantic';
    rawMapping.identities[0]!.target.id = 'mutated.target';
    rawMapping.values[0]!.target.type = 'boolean';

    expect(result.accepted[0]).toEqual({
      sourceIndex: 0,
      sourceTypeKey: FORMAT_SOURCE_KEY,
      target: FORMAT_TARGET,
    });
    expect(result.contribution.nodeTypes[0]!.designTime.label).toBe('Text format');
    expect(result.contribution.nodeTypes[0]!.inputs[0]!.value).toEqual(STRING_VALUE);
    expectDeepFrozen(result);
  });

  it('returns partial with static survivors around a recognized dynamic row', () => {
    const result = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), dynamicEntry(), formatEntry()]),
      mapping(),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([0, 2]);
    expect(result.contribution.nodeTypes.map((entry) => entry.id)).toEqual([
      FILTER_TARGET.id,
      FORMAT_TARGET.id,
    ]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'unsupported-dynamic-shape',
        sourceIndex: 1,
        sourceTypeKey: DYNAMIC_SOURCE_KEY,
      }),
    ]);
    expectDeepFrozen(result);
  });

  it.each([
    {
      label: 'dynamic input',
      mutate(entry: ExternalStaticNodeCatalogEntry) {
        (entry.inputs as ExternalStaticNodeCatalogEntry['inputs'][number][])[0] = {
          kind: 'dynamic',
          id: 'source',
          label: 'Source',
        };
      },
      code: 'unsupported-foreign-input',
    },
    {
      label: 'dynamic output',
      mutate(entry: ExternalStaticNodeCatalogEntry) {
        (entry.outputs as ExternalStaticNodeCatalogEntry['outputs'][number][])[0] = {
          kind: 'dynamic',
          id: 'accepted',
          label: 'Accepted',
        };
      },
      code: 'unsupported-foreign-output',
    },
  ])('excludes one recognized $label while retaining an unrelated row', ({ mutate, code }) => {
    const unsupported = clone(filterEntry());
    mutate(unsupported);
    const result = projectExternalNodeCatalogContribution(
      snapshot([unsupported, formatEntry()]),
      mapping(),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([1]);
    expect(issueCodes(result)).toEqual([code]);
    expect(result.issues[0]).toMatchObject({ sourceIndex: 0, sourceTypeKey: FILTER_SOURCE_KEY });
  });

  it('orders mapping issues before source issues and suppresses secondary missing diagnostics', () => {
    const invalidFilterIdentity = identity(FILTER_SOURCE_KEY, {
      id: ' invalid ',
      version: '1.0.0',
    });
    const result = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), dynamicEntry(), formatEntry()]),
      mapping([
        invalidFilterIdentity,
        identity(DYNAMIC_SOURCE_KEY, DYNAMIC_TARGET),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ]),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([2]);
    expect(issueCodes(result)).toEqual(['invalid-projection-mapping', 'unsupported-dynamic-shape']);
    expect(result.issues[0]).toMatchObject({ mappingIndex: 0 });
    expect(result.issues[0]).not.toHaveProperty('sourceIndex');
    expect(result.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing-identity-mapping' })]),
    );
  });

  it('suppresses a secondary missing issue for a semantically invalid value mapping row', () => {
    const result = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), formatEntry()]),
      mapping(
        [identity(FILTER_SOURCE_KEY, FILTER_TARGET), identity(FORMAT_SOURCE_KEY, FORMAT_TARGET)],
        [value('semantic.number', { type: ' invalid ' }), value('semantic.string', STRING_VALUE)],
      ),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([1]);
    expect(issueCodes(result)).toEqual(['invalid-projection-mapping']);
    expect(result.issues[0]).toMatchObject({ mappingIndex: 0 });
    expect(issueCodes(result)).not.toContain('missing-value-semantic-mapping');
  });

  it.each([
    {
      label: 'identity mapping',
      identities: [
        identity(FILTER_SOURCE_KEY, FILTER_TARGET),
        identity(FILTER_SOURCE_KEY, { ...FILTER_TARGET, version: '2.0.0' }),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ],
      values: [value('semantic.number', NUMBER_VALUE), value('semantic.string', STRING_VALUE)],
      duplicateCode: 'duplicate-identity-mapping',
      missingCode: 'missing-identity-mapping',
    },
    {
      label: 'value-semantic mapping',
      identities: [
        identity(FILTER_SOURCE_KEY, FILTER_TARGET),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ],
      values: [
        value('semantic.number', NUMBER_VALUE),
        value('semantic.number', { type: 'string' }),
        value('semantic.string', STRING_VALUE),
      ],
      duplicateCode: 'duplicate-value-semantic-mapping',
      missingCode: 'missing-value-semantic-mapping',
    },
  ])(
    'excludes every duplicate $label row and dependent source without a secondary missing issue',
    ({ identities, values, duplicateCode, missingCode }) => {
      const result = projectExternalNodeCatalogContribution(
        snapshot([filterEntry(), formatEntry()]),
        mapping(identities, values),
      );

      expect(result.status).toBe('partial');
      if (result.status !== 'partial') throw new Error('Expected partial projection.');
      expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([1]);
      expect(issueCodes(result)).toEqual([duplicateCode, duplicateCode]);
      expect(
        result.issues.map((issue) => ('mappingIndex' in issue ? issue.mappingIndex : undefined)),
      ).toEqual([0, 1]);
      expect(issueCodes(result)).not.toContain(missingCode);
    },
  );

  it('excludes every duplicate source-key member without a first or last winner', () => {
    const result = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), filterEntry(), formatEntry()]),
      mapping(),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([2]);
    expect(issueCodes(result)).toEqual(['duplicate-source-type-key', 'duplicate-source-type-key']);
    expect(
      result.issues.map((issue) => ('sourceIndex' in issue ? issue.sourceIndex : undefined)),
    ).toEqual([0, 1]);
    expect(issueCodes(result)).not.toContain('duplicate-projected-node-ref');
  });

  it('excludes every within-attempt duplicate target member and preserves an unrelated survivor', () => {
    const secondFilter = formatEntry('source.second-filter@1');
    const result = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), secondFilter, formatEntry()]),
      mapping([
        identity(FILTER_SOURCE_KEY, FILTER_TARGET),
        identity('source.second-filter@1', FILTER_TARGET),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ]),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([2]);
    expect(issueCodes(result)).toEqual([
      'duplicate-projected-node-ref',
      'duplicate-projected-node-ref',
    ]);
    expect(
      result.issues.map((issue) => ('sourceIndex' in issue ? issue.sourceIndex : undefined)),
    ).toEqual([0, 1]);
  });

  it.each([
    {
      label: 'identity',
      identities: [identity(FORMAT_SOURCE_KEY, FORMAT_TARGET)],
      values: [value('semantic.number', NUMBER_VALUE), value('semantic.string', STRING_VALUE)],
      code: 'missing-identity-mapping',
    },
    {
      label: 'value semantic',
      identities: [
        identity(FILTER_SOURCE_KEY, FILTER_TARGET),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ],
      values: [value('semantic.string', STRING_VALUE)],
      code: 'missing-value-semantic-mapping',
    },
  ])(
    'reports one missing $label mapping for the affected source only',
    ({ identities, values, code }) => {
      const result = projectExternalNodeCatalogContribution(
        snapshot([filterEntry(), formatEntry()]),
        mapping(identities, values),
      );

      expect(result.status).toBe('partial');
      if (result.status !== 'partial') throw new Error('Expected partial projection.');
      expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([1]);
      expect(issueCodes(result)).toEqual([code]);
      expect(result.issues[0]).toMatchObject({ sourceIndex: 0, sourceTypeKey: FILTER_SOURCE_KEY });
    },
  );

  it('distinguishes unsafe and plain-invalid source rows while retaining a valid row', () => {
    const getter = vi.fn(() => FILTER_SOURCE_KEY);
    const hostile: Record<string, unknown> = {
      kind: 'static',
      inputs: [],
      outputs: [],
      designTime: { label: 'Hostile' },
    };
    Object.defineProperty(hostile, 'sourceTypeKey', { enumerable: true, get: getter });
    const invalid = { ...filterEntry('source.invalid@1'), unexpected: true };

    const result = projectExternalNodeCatalogContribution(
      { schemaVersion: 1, entries: [hostile, invalid, formatEntry()] },
      mapping([
        identity(FILTER_SOURCE_KEY, FILTER_TARGET),
        identity('source.invalid@1', { id: 'workbench.external.invalid', version: '1.0.0' }),
        identity(FORMAT_SOURCE_KEY, FORMAT_TARGET),
      ]),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(getter).not.toHaveBeenCalled();
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([2]);
    expect(issueCodes(result)).toEqual(['unsafe-foreign-entry', 'invalid-foreign-entry']);
    expect(result.issues[0]).toMatchObject({ sourceIndex: 0 });
    expect(result.issues[0]).not.toHaveProperty('sourceTypeKey');
    expect(result.issues[1]).toMatchObject({ sourceIndex: 1 });
  });

  it('nests canonical descriptor validation and retains an unrelated source', () => {
    const invalidDescriptorEntry = clone(filterEntry());
    (invalidDescriptorEntry.outputs as ExternalStaticNodeCatalogEntry['outputs'][number][])[0] = {
      kind: 'fixed',
      id: 'source',
      valueSemanticId: 'semantic.number',
    };

    const result = projectExternalNodeCatalogContribution(
      snapshot([invalidDescriptorEntry, formatEntry()]),
      mapping(),
    );

    expect(result.status).toBe('partial');
    if (result.status !== 'partial') throw new Error('Expected partial projection.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual([1]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'projected-descriptor-invalid',
        sourceIndex: 0,
        sourceTypeKey: FILTER_SOURCE_KEY,
        nodeIssue: expect.objectContaining({ code: 'duplicate-port-id' }),
      }),
    ]);
    expectDeepFrozen(result.issues[0]!.nodeIssue);
  });

  it('returns rejected for row-local issues when no source survives', () => {
    const result = projectExternalNodeCatalogContribution(snapshot([dynamicEntry()]), mapping());

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') throw new Error('Expected rejected projection.');
    expectNoContribution(result);
    expect(issueCodes(result)).toEqual(['unsupported-dynamic-shape']);
    expectDeepFrozen(result);
  });
});

describe('external node catalog projection top-level precedence', () => {
  it('returns one invalid snapshot issue without inspecting the mapping operand', () => {
    const mappingVersion = vi.fn(() => 1);
    const hostileMapping = {
      get schemaVersion() {
        return mappingVersion();
      },
      contributorId: 'unread',
      identities: [],
      values: [],
    };

    const result = projectExternalNodeCatalogContribution(
      { schemaVersion: 1, entries: 'not-an-array' },
      hostileMapping,
    );

    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') throw new Error('Expected invalid projection.');
    expectNoContribution(result);
    expect(issueCodes(result)).toEqual(['invalid-foreign-snapshot']);
    expect(result.issues).toHaveLength(1);
    expect(mappingVersion).not.toHaveBeenCalled();
  });

  it('lets snapshot unsupported-version win without inspecting the mapping operand', () => {
    const mappingVersion = vi.fn(() => 1);
    const hostileMapping = {
      get schemaVersion() {
        return mappingVersion();
      },
      contributorId: 'unread',
      identities: [],
      values: [],
    };

    const result = projectExternalNodeCatalogContribution(
      { schemaVersion: 2, entries: [] },
      hostileMapping,
    );

    expect(result.status).toBe('unsupported-version');
    if (result.status !== 'unsupported-version') {
      throw new Error('Expected unsupported-version projection.');
    }
    expectNoContribution(result);
    expect(issueCodes(result)).toEqual(['unsupported-schema-version']);
    expect(result.issues).toHaveLength(1);
    expect(mappingVersion).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'malformed mapping envelope',
      rawMapping: {
        schemaVersion: 1,
        contributorId: 'bad',
        identities: 'not-an-array',
        values: [],
      },
      status: 'invalid',
      code: 'invalid-projection-mapping',
    },
    {
      label: 'unsupported mapping envelope',
      rawMapping: { schemaVersion: 2, contributorId: 'future', identities: [], values: [] },
      status: 'unsupported-version',
      code: 'unsupported-schema-version',
    },
  ])(
    'returns $status for a $label without inspecting source rows',
    ({ rawMapping, status, code }) => {
      const sourceKey = vi.fn(() => FILTER_SOURCE_KEY);
      const unreadRow: Record<string, unknown> = {
        kind: 'static',
        inputs: [],
        outputs: [],
        designTime: { label: 'Unread row' },
      };
      Object.defineProperty(unreadRow, 'sourceTypeKey', { enumerable: true, get: sourceKey });

      const result = projectExternalNodeCatalogContribution(
        { schemaVersion: 1, entries: [unreadRow] },
        rawMapping,
      );

      expect(result.status).toBe(status);
      if (result.status !== 'invalid' && result.status !== 'unsupported-version') {
        throw new Error('Expected a top-level projection result.');
      }
      expectNoContribution(result);
      expect(issueCodes(result)).toEqual([code]);
      expect(result.issues).toHaveLength(1);
      expect(sourceKey).not.toHaveBeenCalled();
    },
  );

  it('fails the whole attempt one entry beyond the inclusive entry limit', () => {
    const entries = Array.from(
      { length: EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxEntries + 1 },
      (_, index) => dynamicEntry(`source.dynamic-${index}@1`),
    );
    const result = projectExternalNodeCatalogContribution(snapshot(entries), mapping([], []));

    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') throw new Error('Expected invalid projection.');
    expectNoContribution(result);
    expect(issueCodes(result)).toEqual(['admission-limit-exceeded']);
    expect(result.issues).toHaveLength(1);
  });

  it('accepts the exact entry limit with unique mappings and preserves source order', () => {
    const sourceKeys = Array.from(
      { length: EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxEntries },
      (_, index) => `source.entry-limit-${index}@1`,
    );
    const targetIds = sourceKeys.map((_, index) => `workbench.external.entry-limit-${index}`);
    const entries = sourceKeys.map((sourceTypeKey, index): ExternalStaticNodeCatalogEntry => ({
      kind: 'static',
      sourceTypeKey,
      inputs: [
        {
          kind: 'fixed',
          id: `input-${index}`,
          valueSemanticId: 'semantic.number',
        },
      ],
      outputs: [],
      designTime: { label: `Entry limit ${index}` },
    }));
    const identities = sourceKeys.map((sourceTypeKey, index) =>
      identity(sourceTypeKey, { id: targetIds[index]!, version: '1.0.0' }),
    );

    const result = projectExternalNodeCatalogContribution(
      snapshot(entries),
      mapping(identities, [value('semantic.number', NUMBER_VALUE)]),
    );

    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error('Expected exact entry limit to be accepted.');
    expect(result.accepted.map((entry) => entry.sourceIndex)).toEqual(
      sourceKeys.map((_, index) => index),
    );
    expect(result.accepted.map((entry) => entry.sourceTypeKey)).toEqual(sourceKeys);
    expect(result.contribution.nodeTypes.map((entry) => entry.id)).toEqual(targetIds);
  });

  it('accepts the exact combined port limit and rejects one additional port', () => {
    const exactInputCount = EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortsPerEntry / 2;
    const exactOutputCount =
      EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortsPerEntry - exactInputCount;
    const exactEntry = entryWithPortCounts(exactInputCount, exactOutputCount);
    const exact = projectExternalNodeCatalogContribution(
      snapshot([exactEntry]),
      mapping(
        [
          identity('source.port-limit@1', {
            id: 'workbench.external.port-limit',
            version: '1.0.0',
          }),
        ],
        [value('semantic.number', NUMBER_VALUE)],
      ),
    );
    expect(exact.status).toBe('complete');
    if (exact.status !== 'complete') throw new Error('Expected exact port limit to be accepted.');
    expect(
      exact.contribution.nodeTypes[0]!.inputs.length +
        exact.contribution.nodeTypes[0]!.outputs.length,
    ).toBe(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortsPerEntry);

    const over = projectExternalNodeCatalogContribution(
      snapshot([entryWithPortCounts(exactInputCount, exactOutputCount + 1)]),
      mapping(
        [
          identity('source.port-limit@1', {
            id: 'workbench.external.port-limit',
            version: '1.0.0',
          }),
        ],
        [value('semantic.number', NUMBER_VALUE)],
      ),
    );
    expect(over.status).toBe('invalid');
    if (over.status !== 'invalid') throw new Error('Expected over-limit ports to be invalid.');
    expect(issueCodes(over)).toEqual(['admission-limit-exceeded']);
  });

  it('accepts the exact combined mapping limit and rejects one additional mapping', () => {
    const exactIdentityCount = EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxMappings / 2;
    const exactValueCount =
      EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxMappings - exactIdentityCount;
    const exactIdentities = Array.from({ length: exactIdentityCount }, (_, index) =>
      identity(`source.mapping-${index}@1`, {
        id: `workbench.external.mapping-${index}`,
        version: '1.0.0',
      }),
    );
    const exactValues = Array.from({ length: exactValueCount }, (_, index) =>
      value(`semantic.mapping-${index}`, { type: 'string' }),
    );
    const exact = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(exactIdentities, exactValues),
    );
    expect(exact.status).toBe('complete');

    const over = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [...exactIdentities],
        [...exactValues, value('semantic.mapping-over', { type: 'string' })],
      ),
    );
    expect(over.status).toBe('invalid');
    if (over.status !== 'invalid') throw new Error('Expected over-limit mappings to be invalid.');
    expect(issueCodes(over)).toEqual(['admission-limit-exceeded']);
  });

  it('measures every nested string in UTF-16 code units at the exact and plus-one boundary', () => {
    const exactString = '😀'.repeat(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxStringLength / 2);
    const exact = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.utf16', {
            type: 'string',
            editor: { id: 'text', metadata: { sample: exactString } },
          }),
        ],
      ),
    );
    expect(exactString.length).toBe(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxStringLength);
    expect(exact.status).toBe('complete');

    const over = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.utf16', {
            type: 'string',
            editor: { id: 'text', metadata: { sample: `${exactString}a` } },
          }),
        ],
      ),
    );
    expect(over.status).toBe('invalid');
    if (over.status !== 'invalid') throw new Error('Expected over-limit string to be invalid.');
    expect(issueCodes(over)).toEqual(['admission-limit-exceeded']);
  });

  it('accepts portable object depth 32 and rejects depth 33', () => {
    const exact = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.depth', {
            type: 'string',
            editor: { id: 'text', metadata: nestedMetadata(30) },
          }),
        ],
      ),
    );
    expect(exact.status).toBe('complete');

    const over = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.depth', {
            type: 'string',
            editor: { id: 'text', metadata: nestedMetadata(31) },
          }),
        ],
      ),
    );
    expect(over.status).toBe('invalid');
    if (over.status !== 'invalid') throw new Error('Expected depth 33 to be invalid.');
    expect(issueCodes(over)).toEqual(['admission-limit-exceeded']);
  });

  it('counts a repeated acyclic object once within one admitted row', () => {
    const fixedEnvelopeAndRowProperties = 14;
    const shared = metadataWithProperties(
      EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortableProperties - fixedEnvelopeAndRowProperties,
    );
    const exact = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.shared-within-row', {
            type: 'string',
            constraints: shared,
            editor: { id: 'text', metadata: shared },
          }),
        ],
      ),
    );

    expect(exact.status).toBe('complete');
    expectDeepFrozen(exact);
  });

  it('shares the property budget but counts a repeated object again for each admitted row', () => {
    const fixedEnvelopeAndRowsProperties = 16;
    const exactSharedPropertyCount =
      (EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortableProperties -
        fixedEnvelopeAndRowsProperties) /
      2;
    const exactShared = metadataWithProperties(exactSharedPropertyCount);
    const exact = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.shared-row-a', { type: 'string', constraints: exactShared }),
          value('semantic.shared-row-b', { type: 'string', constraints: exactShared }),
        ],
      ),
    );
    expect(exact.status).toBe('complete');

    const overShared = metadataWithProperties(exactSharedPropertyCount + 1);
    const over = projectExternalNodeCatalogContribution(
      snapshot([]),
      mapping(
        [],
        [
          value('semantic.shared-row-a', { type: 'string', constraints: overShared }),
          value('semantic.shared-row-b', { type: 'string', constraints: overShared }),
        ],
      ),
    );
    expect(over.status).toBe('invalid');
    if (over.status !== 'invalid') {
      throw new Error('Expected independently recounted shared rows to exceed the budget.');
    }
    expect(issueCodes(over)).toEqual(['admission-limit-exceeded']);
  });
});

describe('canonical catalog and explicit 071B retry composition', () => {
  it('moves an independent node requirement from missing to fulfilled only after a fresh catalog and explicit retry', () => {
    const builtinContribution: NodeTypeCatalogContribution = {
      contributorId: 'builtin.fixture',
      nodeTypes: [unrelatedDescriptor()],
    };
    const initialCatalogResolution = resolveNodeTypeCatalog([builtinContribution]);
    const requirement = nodeRequirement();
    const componentLookup = vi.fn(() => {
      throw new Error('The unselected component catalog must not be used.');
    });
    const componentEnumeration = vi.fn(() => {
      throw new Error('The unselected component catalog must not be enumerated.');
    });
    const components: UiComponentCatalogContract = {
      component: componentLookup,
      components: componentEnumeration,
    };

    const initial = resolveAuthoringDevelopmentRequirement(requirement, {
      components,
      nodeTypes: initialCatalogResolution.catalog,
    });
    expect(initial.status).toBe('missing');
    expect(initialCatalogResolution.issues).toEqual([]);
    expect(componentLookup).not.toHaveBeenCalled();
    expect(componentEnumeration).not.toHaveBeenCalled();

    const apply = vi.fn();
    const activate = vi.fn();
    const invokeRuntime = vi.fn();
    const preview = vi.fn();
    const registerExtension = vi.fn();
    const advanceTask = vi.fn();
    const document = { revision: 7, nodes: ['existing-node'] };
    const history = ['existing-command'];
    const task = { status: 'waiting' };
    const initialDocument = clone(document);
    const initialHistory = clone(history);
    const initialTask = clone(task);

    const projection = projectExternalNodeCatalogContribution(
      snapshot([filterEntry(), dynamicEntry(), formatEntry()]),
      mapping(),
    );
    expect(projection.status).toBe('partial');
    if (projection.status !== 'partial') throw new Error('Expected partial projection.');
    expect(projection.accepted.map((entry) => entry.sourceIndex)).toEqual([0, 2]);
    expect(issueCodes(projection)).toEqual(['unsupported-dynamic-shape']);

    const retry = vi.fn((catalog: NodeTypeCatalog) =>
      resolveAuthoringDevelopmentRequirement(requirement, { components, nodeTypes: catalog }),
    );
    expect(retry).not.toHaveBeenCalled();
    expect(initialCatalogResolution.catalog.nodeType(FILTER_TARGET)).toBeUndefined();

    const freshCatalogResolution = resolveNodeTypeCatalog([
      builtinContribution,
      projection.contribution,
    ]);
    expect(freshCatalogResolution.issues).toEqual([]);
    expect(freshCatalogResolution.catalog).not.toBe(initialCatalogResolution.catalog);
    expect(freshCatalogResolution.catalog.nodeTypes().map((entry) => entry.id)).toEqual([
      'workbench.builtin.constant',
      FILTER_TARGET.id,
      FORMAT_TARGET.id,
    ]);
    expect(initialCatalogResolution.catalog.nodeType(FILTER_TARGET)).toBeUndefined();
    expect(freshCatalogResolution.catalog.nodeType(FILTER_TARGET)).toBeDefined();
    expect(retry).not.toHaveBeenCalled();

    for (const effect of [
      apply,
      activate,
      invokeRuntime,
      preview,
      registerExtension,
      advanceTask,
    ]) {
      expect(effect).not.toHaveBeenCalled();
    }
    expect(document).toEqual(initialDocument);
    expect(history).toEqual(initialHistory);
    expect(task).toEqual(initialTask);

    const fulfilled = retry(freshCatalogResolution.catalog);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(fulfilled.status).toBe('fulfilled');
    if (fulfilled.status !== 'fulfilled' || fulfilled.existingNodeType === undefined) {
      throw new Error('Expected an explicitly retried fulfilled node requirement.');
    }
    expect(fulfilled.existingNodeType).toEqual(expectedFilterDescriptor());
    expect(fulfilled.existingNodeType).not.toBe(
      freshCatalogResolution.catalog.nodeType(FILTER_TARGET),
    );
    expectDeepFrozen(fulfilled.existingNodeType);
    expect(componentLookup).not.toHaveBeenCalled();
    expect(componentEnumeration).not.toHaveBeenCalled();
    for (const effect of [
      apply,
      activate,
      invokeRuntime,
      preview,
      registerExtension,
      advanceTask,
    ]) {
      expect(effect).not.toHaveBeenCalled();
    }
    expect(document).toEqual(initialDocument);
    expect(history).toEqual(initialHistory);
    expect(task).toEqual(initialTask);
  });

  it('leaves cross-contribution exact-ref conflicts to the canonical catalog resolver', () => {
    const projection = projectExternalNodeCatalogContribution(
      snapshot([filterEntry()]),
      mapping(
        [identity(FILTER_SOURCE_KEY, FILTER_TARGET)],
        [value('semantic.number', NUMBER_VALUE)],
      ),
    );
    expect(projection.status).toBe('complete');
    if (projection.status !== 'complete') throw new Error('Expected complete projection.');

    const conflict = resolveNodeTypeCatalog([
      projection.contribution,
      { contributorId: 'other.fixture', nodeTypes: [expectedFilterDescriptor()] },
    ]);

    expect(conflict.catalog.nodeType(FILTER_TARGET)).toBeUndefined();
    expect(conflict.catalog.nodeTypes()).toEqual([]);
    expect(
      conflict.issues.filter((issue) => issue.code === 'duplicate-node-type-ref'),
    ).toHaveLength(2);
  });
});
