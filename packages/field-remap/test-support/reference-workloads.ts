import type {
  FieldRemapDocument,
  MappingEdge,
  SourceField,
  TargetSlot,
} from '../src/domain/types.js';
import { normalizeFieldRemapDocument } from '../src/domain/document/fieldRemapDocument.js';
import {
  createFieldRemapProjectionOwner,
  type CreateFieldRemapProjectionOwnerOptions,
  type FieldRemapProjectionOperation,
  type FieldRemapProjectionOwner,
  type FieldRemapTraversalSample,
} from '../src/projection/serializedOwner.js';

export type FieldRemapReferenceWorkloadId =
  | 'field-remap.projection.small'
  | 'field-remap.projection.typical'
  | 'field-remap.projection.stress';

type FieldRemapReferenceWorkloadSize = FieldRemapTraversalSample['size'];

export interface FieldRemapReferenceWorkloadDefinition {
  readonly id: FieldRemapReferenceWorkloadId;
  readonly size: FieldRemapReferenceWorkloadSize;
  readonly sourceCount: number;
  readonly targetCount: number;
  readonly edgeCount: number;
  readonly operatorCount: 0;
  readonly operationCount: 1;
  readonly aggregateEntries: number;
}

export interface FieldRemapReferenceRunEvidence {
  readonly sourceRevision: string;
  readonly environment: string;
  readonly tool: string;
}

export interface FieldRemapReferenceFixture {
  readonly definition: FieldRemapReferenceWorkloadDefinition;
  readonly document: FieldRemapDocument;
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly operations: readonly FieldRemapProjectionOperation[];
}

export interface FieldRemapReferenceStructuralRecord {
  readonly schemaVersion: 1;
  readonly fixtureRevision: 'field-remap-reference-v1';
  readonly workloadId: FieldRemapReferenceWorkloadId;
  readonly dimensions: {
    readonly sources: number;
    readonly targets: number;
    readonly edges: number;
    readonly operators: 0;
    readonly operations: 1;
    readonly aggregateEntries: number;
  };
  readonly operation: 'change-edge-0-source';
  readonly result: {
    readonly status: 'applied';
    readonly documentVersion: 2;
    readonly documentEdgeCount: number;
    readonly changedEdge: {
      readonly id: 'edge.0';
      readonly sourceFieldId: string;
      readonly targetSlotId: 'target.0';
    };
    readonly historyLength: 1;
  };
  readonly traversal: FieldRemapTraversalSample;
  readonly lifecycle: {
    readonly retainedBeforeDispose: 1;
    readonly retainedAfterDispose: 0;
  };
}

export interface FieldRemapReferenceRunRecord {
  readonly evidence: FieldRemapReferenceRunEvidence;
  readonly structural: FieldRemapReferenceStructuralRecord;
}

export type FieldRemapReferenceWorkloadErrorCode =
  | 'unknown-workload'
  | 'invalid-evidence'
  | 'transaction-not-applied'
  | 'revision-not-changed'
  | 'missing-traversal-sample'
  | 'duplicate-traversal-sample'
  | 'structural-mismatch'
  | 'dispose-failed'
  | 'run-and-dispose-failed';

export class FieldRemapReferenceWorkloadError extends Error {
  readonly code: FieldRemapReferenceWorkloadErrorCode;
  readonly primary?: FieldRemapReferenceWorkloadError;
  readonly disposeCause?: unknown;

  constructor(
    code: FieldRemapReferenceWorkloadErrorCode,
    options: {
      readonly primary?: FieldRemapReferenceWorkloadError;
      readonly disposeCause?: unknown;
    } = {},
  ) {
    super(`Field Remap reference workload failed: ${code}.`);
    this.name = 'FieldRemapReferenceWorkloadError';
    this.code = code;
    this.primary = options.primary;
    this.disposeCause = options.disposeCause;
  }
}

export type FieldRemapReferenceOwnerFactory = (
  options: CreateFieldRemapProjectionOwnerOptions,
) => FieldRemapProjectionOwner;

const definitions = [
  defineWorkload('field-remap.projection.small', 8, 'SMALL'),
  defineWorkload('field-remap.projection.typical', 100, 'TYPICAL'),
  defineWorkload('field-remap.projection.stress', 600, 'STRESS'),
] as const;

export const FIELD_REMAP_REFERENCE_WORKLOADS: readonly FieldRemapReferenceWorkloadDefinition[] =
  deepFreeze([...definitions]);

const workloadById = new Map(definitions.map((definition) => [definition.id, definition]));
const evidenceIdentifierPattern = /^[A-Za-z0-9._:-]{1,64}$/;
const sourceRevisionPattern = /^[0-9a-f]{40}$/;
const traversalStageKeys = [
  'normalization',
  'fingerprint',
  'translation',
  'freeze',
  'reprojection',
] as const;

function defineWorkload(
  id: FieldRemapReferenceWorkloadId,
  count: number,
  size: FieldRemapReferenceWorkloadSize,
): FieldRemapReferenceWorkloadDefinition {
  return deepFreeze({
    id,
    size,
    sourceCount: count,
    targetCount: count,
    edgeCount: count,
    operatorCount: 0,
    operationCount: 1,
    aggregateEntries: count * 3 + 1,
  });
}

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  const object = value as object;
  if (seen.has(object)) {
    return value;
  }
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    deepFreeze(Reflect.get(object, key), seen);
  }
  return Object.freeze(value);
}

function resolveDefinition(
  id: FieldRemapReferenceWorkloadId,
): FieldRemapReferenceWorkloadDefinition;
function resolveDefinition(id: unknown): FieldRemapReferenceWorkloadDefinition;
function resolveDefinition(id: unknown): FieldRemapReferenceWorkloadDefinition {
  if (typeof id !== 'string') {
    throw new FieldRemapReferenceWorkloadError('unknown-workload');
  }
  const definition = workloadById.get(id as FieldRemapReferenceWorkloadId);
  if (!definition) {
    throw new FieldRemapReferenceWorkloadError('unknown-workload');
  }
  return definition;
}

function validateEvidence(
  evidence: FieldRemapReferenceRunEvidence,
): FieldRemapReferenceRunEvidence {
  if (evidence === null || typeof evidence !== 'object') {
    throw new FieldRemapReferenceWorkloadError('invalid-evidence');
  }

  let sourceRevision: unknown;
  let environment: unknown;
  let tool: unknown;
  try {
    sourceRevision = evidence.sourceRevision;
    environment = evidence.environment;
    tool = evidence.tool;
  } catch {
    throw new FieldRemapReferenceWorkloadError('invalid-evidence');
  }

  if (
    typeof sourceRevision !== 'string' ||
    typeof environment !== 'string' ||
    typeof tool !== 'string' ||
    !sourceRevisionPattern.test(sourceRevision) ||
    !evidenceIdentifierPattern.test(environment) ||
    !evidenceIdentifierPattern.test(tool) ||
    environment !== environment.trim() ||
    tool !== tool.trim()
  ) {
    throw new FieldRemapReferenceWorkloadError('invalid-evidence');
  }
  return deepFreeze({ sourceRevision, environment, tool });
}

export function buildFieldRemapReferenceFixture(
  id: FieldRemapReferenceWorkloadId,
): FieldRemapReferenceFixture {
  const definition = resolveDefinition(id);
  const sources = Array.from({ length: definition.sourceCount }, (_, index) => ({
    id: `source.${index}`,
    label: `Source ${index}`,
  }));
  const targets = Array.from({ length: definition.targetCount }, (_, index) => ({
    id: `target.${index}`,
    label: `Target ${index}`,
  }));
  const edges = Array.from({ length: definition.edgeCount }, (_, index) => ({
    id: `edge.${index}`,
    sourceFieldId: `source.${index}`,
    targetSlotId: `target.${index}`,
  }));
  const changedEdge: MappingEdge = {
    id: 'edge.0',
    sourceFieldId: `source.${definition.sourceCount - 1}`,
    targetSlotId: 'target.0',
  };

  return deepFreeze({
    definition,
    document: { version: 2, edges },
    sources,
    targets,
    operations: [{ type: 'upsert-edge', edge: changedEdge }],
  });
}

export function runFieldRemapReferenceWorkload(
  id: FieldRemapReferenceWorkloadId,
  evidence: FieldRemapReferenceRunEvidence,
): Promise<FieldRemapReferenceRunRecord> {
  return runWithOwnerFactory(id, evidence, createFieldRemapProjectionOwner);
}

/** Test-only failure injection seam; the normal runner always admits the real owner. */
export function runFieldRemapReferenceWorkloadWithOwnerFactory(
  id: FieldRemapReferenceWorkloadId,
  evidence: FieldRemapReferenceRunEvidence,
  ownerFactory: FieldRemapReferenceOwnerFactory,
): Promise<FieldRemapReferenceRunRecord> {
  return runWithOwnerFactory(id, evidence, ownerFactory);
}

async function runWithOwnerFactory(
  id: FieldRemapReferenceWorkloadId,
  evidenceInput: FieldRemapReferenceRunEvidence,
  ownerFactory: FieldRemapReferenceOwnerFactory,
): Promise<FieldRemapReferenceRunRecord> {
  resolveDefinition(id);
  const evidence = validateEvidence(evidenceInput);
  const fixture = buildFieldRemapReferenceFixture(id);
  const traversalSamples: FieldRemapTraversalSample[] = [];
  let owner: FieldRemapProjectionOwner | undefined;
  let primary: FieldRemapReferenceWorkloadError | undefined;
  let disposalFailed = false;
  let disposalFailure: unknown;
  let structural: FieldRemapReferenceStructuralRecord | undefined;

  try {
    owner = ownerFactory({
      id: fixture.definition.id,
      document: fixture.document,
      sources: fixture.sources,
      targets: fixture.targets,
      sourceShapeRevision: 'source:reference-v1',
      targetShapeRevision: 'target:reference-v1',
      onTraversal: (sample) => traversalSamples.push(sample),
    });
    const beforeRevision = owner.port.getSnapshot().canonicalRevision;
    const result = await owner.port.applyTransaction(
      owner.port.createTransaction(fixture.operations),
    );
    if (result.status !== 'applied') {
      fail('transaction-not-applied');
    }
    if (result.canonicalRevision === beforeRevision) {
      fail('revision-not-changed');
    }
    if (traversalSamples.length === 0) {
      fail('missing-traversal-sample');
    }
    if (traversalSamples.length !== 1) {
      fail('duplicate-traversal-sample');
    }

    const traversal = snapshotTraversalSample(traversalSamples[0]!, fixture.definition);
    const canonical = owner.getCanonicalDocument();
    if (!traversal || !matchesExpectedStructure(fixture, canonical, owner)) {
      fail('structural-mismatch');
    }

    const expectedSourceId = `source.${fixture.definition.sourceCount - 1}`;

    structural = {
      schemaVersion: 1,
      fixtureRevision: 'field-remap-reference-v1',
      workloadId: fixture.definition.id,
      dimensions: {
        sources: fixture.definition.sourceCount,
        targets: fixture.definition.targetCount,
        edges: fixture.definition.edgeCount,
        operators: 0,
        operations: 1,
        aggregateEntries: fixture.definition.aggregateEntries,
      },
      operation: 'change-edge-0-source',
      result: {
        status: 'applied',
        documentVersion: 2,
        documentEdgeCount: canonical.edges.length,
        changedEdge: {
          id: 'edge.0',
          sourceFieldId: expectedSourceId,
          targetSlotId: 'target.0',
        },
        historyLength: 1,
      },
      traversal,
      lifecycle: { retainedBeforeDispose: 1, retainedAfterDispose: 0 },
    };
  } catch (error) {
    primary = asWorkloadError(error);
  } finally {
    if (owner) {
      try {
        await owner.dispose();
        const retainedAfterDispose = owner.getRetentionSize();
        if (retainedAfterDispose !== 0) {
          disposalFailed = true;
          disposalFailure = Object.freeze({ retainedAfterDispose });
        }
      } catch (error) {
        disposalFailed = true;
        disposalFailure = error;
      }
    }
  }

  if (primary && disposalFailed) {
    throw new FieldRemapReferenceWorkloadError('run-and-dispose-failed', {
      primary,
      disposeCause: disposalFailure,
    });
  }
  if (primary) {
    throw primary;
  }
  if (disposalFailed) {
    throw new FieldRemapReferenceWorkloadError('dispose-failed', {
      disposeCause: disposalFailure,
    });
  }
  if (!structural) {
    throw new FieldRemapReferenceWorkloadError('structural-mismatch');
  }

  return deepFreeze({ evidence, structural });
}

function matchesExpectedStructure(
  fixture: FieldRemapReferenceFixture,
  canonical: FieldRemapDocument,
  owner: FieldRemapProjectionOwner,
): boolean {
  const expectedSourceId = `source.${fixture.definition.sourceCount - 1}`;
  const expectedDocument = normalizeFieldRemapDocument({
    ...fixture.document,
    edges: fixture.document.edges.map((edge, index) =>
      index === 0 ? { ...edge, sourceFieldId: expectedSourceId } : edge,
    ),
  });
  if (
    !exactlyMatches(canonical, expectedDocument) ||
    owner.getHistory().length !== 1 ||
    owner.getRetentionSize() !== 1
  ) {
    return false;
  }
  return true;
}

function snapshotTraversalSample(
  sample: FieldRemapTraversalSample,
  definition: FieldRemapReferenceWorkloadDefinition,
): FieldRemapTraversalSample | undefined {
  try {
    if (sample === null || typeof sample !== 'object') {
      return undefined;
    }
    const size = sample.size;
    const aggregateEntries = sample.aggregateEntries;
    const visitedEntries = sample.visitedEntries;
    const stages = sample.stages;
    if (
      stages === null ||
      typeof stages !== 'object' ||
      !hasExactOwnKeys(stages, traversalStageKeys)
    ) {
      return undefined;
    }

    const normalization = stages.normalization;
    const fingerprint = stages.fingerprint;
    const translation = stages.translation;
    const freeze = stages.freeze;
    const reprojection = stages.reprojection;
    const stageCounts = [normalization, fingerprint, translation, freeze, reprojection];
    if (
      size !== definition.size ||
      aggregateEntries !== definition.aggregateEntries ||
      !Number.isFinite(visitedEntries) ||
      !Number.isInteger(visitedEntries) ||
      visitedEntries < 0 ||
      stageCounts.some(
        (count) => !Number.isFinite(count) || !Number.isInteger(count) || count <= 0,
      ) ||
      visitedEntries !== normalization + fingerprint + translation + freeze + reprojection
    ) {
      return undefined;
    }

    return deepFreeze({
      size,
      aggregateEntries,
      visitedEntries,
      stages: { normalization, fingerprint, translation, freeze, reprojection },
    });
  } catch {
    return undefined;
  }
}

function hasExactOwnKeys(value: object, expectedKeys: readonly PropertyKey[]): boolean {
  return keysExactlyMatch(Reflect.ownKeys(value), expectedKeys);
}

function keysExactlyMatch(
  actualKeys: readonly PropertyKey[],
  expectedKeys: readonly PropertyKey[],
): boolean {
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  );
}

function exactlyMatches(
  actual: unknown,
  expected: unknown,
  seen = new Map<object, Set<object>>(),
): boolean {
  if (Object.is(actual, expected)) {
    return true;
  }
  if (
    actual === null ||
    expected === null ||
    typeof actual !== 'object' ||
    typeof expected !== 'object'
  ) {
    return false;
  }

  const priorExpected = seen.get(actual);
  if (priorExpected?.has(expected)) {
    return true;
  }
  if (priorExpected) {
    priorExpected.add(expected);
  } else {
    seen.set(actual, new Set([expected]));
  }

  const actualKeys = Reflect.ownKeys(actual);
  const expectedKeys = Reflect.ownKeys(expected);
  if (!keysExactlyMatch(actualKeys, expectedKeys)) {
    return false;
  }
  return actualKeys.every((key) =>
    exactlyMatches(Reflect.get(actual, key), Reflect.get(expected, key), seen),
  );
}

function fail(code: FieldRemapReferenceWorkloadErrorCode): never {
  throw new FieldRemapReferenceWorkloadError(code);
}

function asWorkloadError(error: unknown): FieldRemapReferenceWorkloadError {
  return error instanceof FieldRemapReferenceWorkloadError
    ? error
    : new FieldRemapReferenceWorkloadError('structural-mismatch');
}
