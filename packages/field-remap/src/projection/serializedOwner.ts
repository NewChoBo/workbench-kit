import type {
  WorkbenchEditableProjectionDescriptor,
  WorkbenchEditableProjectionPort,
  WorkbenchProjectionSnapshot,
  WorkbenchProjectionTransaction,
  WorkbenchProjectionTransactionResult,
} from '@workbench-kit/contracts';
import { normalizeFieldRemapDocument } from '../domain/document/fieldRemapDocument.js';
import { MAX_TRANSFORM_CHAIN, normalizeMappingEdge } from '../domain/document/mappingEdge.js';
import {
  MAX_MAPPING_FAN_IN,
  MAX_MAPPING_FAN_OUT,
  normalizeMappingOperators,
} from '../domain/mapping/mappingOperators.js';
import { collectSourceFieldIds, collectTargetSlotIds } from '../domain/shapes/shapeEdit.js';
import { projectShapes } from '../domain/shapes/projectShapes.js';
import type {
  FieldRemapDocument,
  MappingEdge,
  MappingOperator,
  SourceField,
  TargetSlot,
} from '../domain/types.js';

const MAX_TRANSACTION_ENTRIES = 1_024;
const MAX_TRANSACTION_OPERATIONS = 256;
const MAX_HISTORY_ENTRIES = 256;
const DEFAULT_PERSIST_TIMEOUT_MS = 5_000;
const MAX_PERSIST_TIMEOUT_MS = 60_000;
let fallbackOwnerEpoch = 0;

export type FieldRemapProjectionOperation =
  | { readonly type: 'upsert-edge'; readonly edge: MappingEdge }
  | { readonly type: 'remove-edge'; readonly edgeId: string }
  | { readonly type: 'upsert-operator'; readonly operator: MappingOperator }
  | { readonly type: 'remove-operator'; readonly operatorId: string };

export interface FieldRemapProjectionValue {
  readonly document: FieldRemapDocument;
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly includeHidden: boolean;
}

export interface FieldRemapProjectionConflict {
  readonly code: 'stale-canonical-revision';
}

export type FieldRemapPersistenceResult =
  | { readonly status: 'committed' }
  | { readonly status: 'rolled-back' }
  | { readonly status: 'indeterminate' };

export interface FieldRemapPersistenceInput {
  readonly previousDocument: FieldRemapDocument;
  readonly nextDocument: FieldRemapDocument;
  readonly expectedRevision: string;
  readonly nextRevision: string;
  readonly signal: AbortSignal;
}

export interface FieldRemapTraversalSample {
  readonly size: 'SMALL' | 'TYPICAL' | 'STRESS';
  readonly aggregateEntries: number;
  readonly visitedEntries: number;
  readonly stages: {
    readonly normalization: number;
    readonly fingerprint: number;
    readonly translation: number;
    readonly freeze: number;
    readonly reprojection: number;
  };
}

export interface CreateFieldRemapProjectionOwnerOptions {
  readonly id: string;
  readonly document: FieldRemapDocument;
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly sourceShapeRevision: string;
  readonly targetShapeRevision: string;
  readonly transformRevision?: string;
  readonly publicationRevision?: string;
  readonly includeHidden?: boolean;
  readonly maxTransactionEntries?: number;
  readonly persistTimeoutMs?: number;
  readonly onTraversal?: (sample: FieldRemapTraversalSample) => void;
  readonly persist?: (input: FieldRemapPersistenceInput) => Promise<FieldRemapPersistenceResult>;
}

export interface ReplaceFieldRemapSemanticInputs {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly sourceShapeRevision: string;
  readonly targetShapeRevision: string;
  readonly transformRevision?: string;
  readonly publicationRevision?: string;
}

export interface FieldRemapSemanticHistoryEntry {
  readonly transactionId: string;
  readonly canonicalRevision: string;
  readonly document: FieldRemapDocument;
}

export interface FieldRemapPreviewTicket {
  readonly canonicalRevision: string;
}

export interface FieldRemapProjectionOwner {
  readonly port: WorkbenchEditableProjectionPort<
    FieldRemapProjectionValue,
    FieldRemapProjectionOperation,
    FieldRemapProjectionConflict
  >;
  getCanonicalDocument(): FieldRemapDocument;
  getHistory(): readonly FieldRemapSemanticHistoryEntry[];
  getRetentionSize(): number;
  isReconciliationPending(): boolean;
  createPreviewTicket(): FieldRemapPreviewTicket;
  isPreviewTicketCurrent(ticket: FieldRemapPreviewTicket): boolean;
  replaceSemanticInputs(input: ReplaceFieldRemapSemanticInputs): Promise<void>;
  dispose(): Promise<void>;
}

type NormalizedOperation = FieldRemapProjectionOperation;

interface SemanticInputs {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly sourceShapeRevision: string;
  readonly targetShapeRevision: string;
  readonly transformRevision: string;
  readonly publicationRevision: string;
}

interface Reservation {
  readonly sequence: number;
  readonly fingerprint: string;
  readonly promise: Promise<WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>>;
  resolve(result: WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>): void;
  terminal: boolean;
}

type TraversalStage = keyof FieldRemapTraversalSample['stages'];

interface TraversalCounter {
  readonly aggregateEntries: number;
  readonly stages: Record<TraversalStage, number>;
}

function createTraversalCounter(aggregateEntries: number): TraversalCounter {
  return {
    aggregateEntries,
    stages: {
      normalization: 0,
      fingerprint: 0,
      translation: 0,
      freeze: 0,
      reprojection: 0,
    },
  };
}

function visit(
  counter: TraversalCounter | undefined,
  stage: TraversalStage,
  count: number = 1,
): void {
  if (counter) {
    counter.stages[stage] += count;
  }
}

function traversalSample(counter: TraversalCounter): FieldRemapTraversalSample {
  const visitedEntries = Object.values(counter.stages).reduce((sum, count) => sum + count, 0);
  return Object.freeze({
    size:
      counter.aggregateEntries <= 32
        ? 'SMALL'
        : counter.aggregateEntries <= 512
          ? 'TYPICAL'
          : 'STRESS',
    aggregateEntries: counter.aggregateEntries,
    visitedEntries,
    stages: Object.freeze({ ...counter.stages }),
  });
}

function isStrictToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function assertRevision(value: string, label: string): void {
  if (!isStrictToken(value)) {
    throw new TypeError(`${label} must be a trimmed, non-empty opaque revision.`);
  }
}

function cloneAndFreeze<T>(
  value: T,
  ancestors: Set<object> = new Set(),
  counter?: TraversalCounter,
  stage: TraversalStage = 'freeze',
): T {
  visit(counter, stage);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Projection payload numbers must be finite.');
    }
    return value;
  }
  if (value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError('Projection payload contains an unsupported value.');
  }
  if (ancestors.has(value)) {
    throw new TypeError('Projection payload must be acyclic.');
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    const clone = value.map((item) => cloneAndFreeze(item, ancestors, counter, stage));
    ancestors.delete(value);
    return Object.freeze(clone) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    ancestors.delete(value);
    throw new TypeError('Projection payload objects must be plain records.');
  }
  const clone: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      ancestors.delete(value);
      throw new TypeError('Projection payload contains an unsupported record key.');
    }
    clone[key] = cloneAndFreeze(item, ancestors, counter, stage);
  }
  ancestors.delete(value);
  return Object.freeze(clone) as T;
}

function normalizeAndFreezeDocument(document: FieldRemapDocument): FieldRemapDocument {
  return cloneAndFreeze(normalizeFieldRemapDocument(document));
}

function freezeOwnedDocument(
  document: FieldRemapDocument,
  counter?: TraversalCounter,
): FieldRemapDocument {
  return cloneAndFreeze(document, new Set(), counter, 'freeze');
}

function frame(tag: string, payload: string): string {
  return `${tag}${payload.length}:${payload}`;
}

function stableSerialize(value: unknown, counter?: TraversalCounter): string {
  visit(counter, 'fingerprint');
  if (value === undefined) {
    return 'u0:';
  }
  if (value === null) {
    return 'n0:';
  }
  if (typeof value === 'string') {
    return frame('s', value);
  }
  if (typeof value === 'boolean') {
    return value ? 'b1:1' : 'b1:0';
  }
  if (typeof value === 'number') {
    return frame('d', Object.is(value, -0) ? '-0' : String(value));
  }
  if (Array.isArray(value)) {
    return frame('a', value.map((entry) => frame('e', stableSerialize(entry, counter))).join(''));
  }
  const record = value as Readonly<Record<string, unknown>>;
  return frame(
    'o',
    Object.keys(record)
      .sort()
      .map((key) => frame('k', key) + frame('v', stableSerialize(record[key], counter)))
      .join(''),
  );
}

function validTransformIds(value: unknown): value is readonly string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.length <= MAX_TRANSFORM_CHAIN &&
      value.every((id) => isStrictToken(id)))
  );
}

function validOptionSteps(value: unknown, transformCount: number): boolean {
  return value === undefined || (Array.isArray(value) && value.length <= transformCount);
}

function validEdge(value: unknown, depth: number = 0): value is MappingEdge {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const edge = value as Partial<MappingEdge>;
  if (
    !isStrictToken(edge.id) ||
    !isStrictToken(edge.sourceFieldId) ||
    !isStrictToken(edge.targetSlotId) ||
    !validTransformIds(edge.transformIds) ||
    !validTransformIds(edge.itemTransformIds) ||
    !validOptionSteps(edge.transformOptionSteps, edge.transformIds?.length ?? 0) ||
    !validOptionSteps(edge.itemTransformOptionSteps, edge.itemTransformIds?.length ?? 0) ||
    (edge.itemSourcePath !== undefined && !isStrictToken(edge.itemSourcePath))
  ) {
    return false;
  }
  if (edge.itemEdges === undefined) {
    return true;
  }
  return (
    depth === 0 &&
    Array.isArray(edge.itemEdges) &&
    edge.itemEdges.every((child) => validEdge(child, depth + 1))
  );
}

function validOperator(value: unknown): value is MappingOperator {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const operator = value as Partial<MappingOperator>;
  if (!isStrictToken(operator.id) || !validTransformIds(operator.transformIds)) {
    return false;
  }
  if (operator.kind === 'combine') {
    return (
      Array.isArray(operator.inputFieldIds) &&
      operator.inputFieldIds.length >= 2 &&
      operator.inputFieldIds.length <= MAX_MAPPING_FAN_IN &&
      operator.inputFieldIds.every((id) => isStrictToken(id)) &&
      isStrictToken(operator.outputSlotId)
    );
  }
  return (
    operator.kind === 'split' &&
    isStrictToken(operator.inputFieldId) &&
    Array.isArray(operator.outputSlotIds) &&
    operator.outputSlotIds.length >= 2 &&
    operator.outputSlotIds.length <= MAX_MAPPING_FAN_OUT &&
    operator.outputSlotIds.every((id) => isStrictToken(id))
  );
}

function validDocument(document: FieldRemapDocument): boolean {
  return (
    document.version === 2 &&
    Array.isArray(document.edges) &&
    document.edges.every((edge) => validEdge(edge)) &&
    (document.operators === undefined ||
      (Array.isArray(document.operators) &&
        document.operators.every((operator) => validOperator(operator)))) &&
    uniqueIds(document.edges) &&
    uniqueIds(document.operators ?? [])
  );
}

function normalizeOperation(
  operation: unknown,
  counter?: TraversalCounter,
): NormalizedOperation | null {
  visit(counter, 'normalization');
  if (!operation || typeof operation !== 'object') {
    return null;
  }

  const record = operation as Record<string, unknown>;
  switch (record.type) {
    case 'upsert-edge': {
      const edge = cloneAndFreeze(record.edge, new Set(), counter, 'normalization');
      if (!validEdge(edge)) {
        return null;
      }
      return cloneAndFreeze(
        { type: 'upsert-edge', edge: normalizeMappingEdge(edge) },
        new Set(),
        counter,
        'normalization',
      );
    }
    case 'remove-edge':
      return isStrictToken(record.edgeId)
        ? cloneAndFreeze(
            { type: 'remove-edge', edgeId: record.edgeId },
            new Set(),
            counter,
            'normalization',
          )
        : null;
    case 'upsert-operator': {
      const input = cloneAndFreeze(record.operator, new Set(), counter, 'normalization');
      if (!validOperator(input)) {
        return null;
      }
      const operator = normalizeMappingOperators([input])?.[0];
      return operator
        ? cloneAndFreeze({ type: 'upsert-operator', operator }, new Set(), counter, 'normalization')
        : null;
    }
    case 'remove-operator':
      return isStrictToken(record.operatorId)
        ? cloneAndFreeze(
            { type: 'remove-operator', operatorId: record.operatorId },
            new Set(),
            counter,
            'normalization',
          )
        : null;
    default:
      return null;
  }
}

function operatorOperandIds(operator: MappingOperator): {
  readonly sources: readonly string[];
  readonly targets: readonly string[];
} {
  return operator.kind === 'combine'
    ? { sources: operator.inputFieldIds, targets: [operator.outputSlotId] }
    : { sources: [operator.inputFieldId], targets: operator.outputSlotIds };
}

function operatorIsVisible(
  operator: MappingOperator,
  sourceIds: ReadonlySet<string>,
  targetIds: ReadonlySet<string>,
): boolean {
  const operands = operatorOperandIds(operator);
  return (
    operands.sources.every((id) => sourceIds.has(id)) &&
    operands.targets.every((id) => targetIds.has(id))
  );
}

function visitShapeTree<T extends { readonly children?: readonly T[] }>(
  values: readonly T[],
  counter: TraversalCounter | undefined,
): void {
  if (!counter) {
    return;
  }
  for (const value of values) {
    visit(counter, 'reprojection');
    if (value.children) {
      visitShapeTree(value.children, counter);
    }
  }
}

function visitEdgeTree(edges: readonly MappingEdge[], counter: TraversalCounter | undefined): void {
  if (!counter) {
    return;
  }
  for (const edge of edges) {
    visit(counter, 'reprojection');
    if (edge.itemEdges) {
      visitEdgeTree(edge.itemEdges, counter);
    }
  }
}

function projectValue(
  descriptor: WorkbenchEditableProjectionDescriptor,
  canonicalRevision: string,
  document: FieldRemapDocument,
  semanticInputs: SemanticInputs,
  includeHidden: boolean,
  counter?: TraversalCounter,
): WorkbenchProjectionSnapshot<FieldRemapProjectionValue, WorkbenchEditableProjectionDescriptor> {
  visitShapeTree(semanticInputs.sources, counter);
  visitShapeTree(semanticInputs.targets, counter);
  visitEdgeTree(document.edges, counter);
  const projected = projectShapes({
    sources: semanticInputs.sources,
    targets: semanticInputs.targets,
    edges: document.edges,
    options: { includeHidden },
  });
  const sourceIds = collectSourceFieldIds(projected.sources);
  const targetIds = collectTargetSlotIds(projected.targets);
  const operators = document.operators?.filter((operator) => {
    visit(counter, 'reprojection');
    return operatorIsVisible(operator, sourceIds, targetIds);
  });
  const projectedDocument = freezeOwnedDocument(
    {
      version: 2,
      edges: projected.edges ?? [],
      ...(operators && operators.length > 0 ? { operators } : {}),
    },
    counter,
  );

  return cloneAndFreeze(
    {
      descriptor,
      canonicalRevision,
      value: {
        document: projectedDocument,
        sources: projected.sources,
        targets: projected.targets,
        includeHidden,
      },
    },
    new Set(),
    counter,
    'freeze',
  );
}

function uniqueIds(values: readonly { readonly id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function createOwnerEpoch(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  fallbackOwnerEpoch += 1;
  return `local-${Date.now()}-${fallbackOwnerEpoch}`;
}

/**
 * Package-internal reference owner for the projection contract. It is intentionally absent from
 * the package root: hosts continue to own persistence and the existing callback APIs stay intact.
 */
export function createFieldRemapProjectionOwner(
  options: CreateFieldRemapProjectionOwnerOptions,
): FieldRemapProjectionOwner {
  if (!isStrictToken(options.id)) {
    throw new TypeError('id must be trimmed and non-empty.');
  }
  assertRevision(options.sourceShapeRevision, 'sourceShapeRevision');
  assertRevision(options.targetShapeRevision, 'targetShapeRevision');
  if (options.transformRevision !== undefined) {
    assertRevision(options.transformRevision, 'transformRevision');
  }
  if (options.publicationRevision !== undefined) {
    assertRevision(options.publicationRevision, 'publicationRevision');
  }

  const ownerToken = options.id.replace(/[^a-zA-Z0-9_-]/g, '-') || 'owner';
  const ownerTransactionPrefix = `field-remap-${ownerToken}-`;
  const ownerEpoch = createOwnerEpoch();
  const transactionPrefix = `${ownerTransactionPrefix}${ownerEpoch}-`;
  const descriptor = Object.freeze({
    id: options.id,
    documentKind: 'workbench.field-remap',
    projectionVersion: 1,
    kind: 'GUI_BUILDER',
    authority: 'ROUND_TRIP_EDITABLE',
  } as const satisfies WorkbenchEditableProjectionDescriptor);
  const requestedMaxEntries = options.maxTransactionEntries ?? MAX_TRANSACTION_ENTRIES;
  const maxEntries = Number.isFinite(requestedMaxEntries)
    ? Math.min(MAX_TRANSACTION_ENTRIES, Math.max(1, Math.trunc(requestedMaxEntries)))
    : MAX_TRANSACTION_ENTRIES;
  const persistTimeoutMs = options.persistTimeoutMs ?? DEFAULT_PERSIST_TIMEOUT_MS;
  if (
    !Number.isInteger(persistTimeoutMs) ||
    persistTimeoutMs < 1 ||
    persistTimeoutMs > MAX_PERSIST_TIMEOUT_MS
  ) {
    throw new TypeError(`persistTimeoutMs must be an integer from 1 to ${MAX_PERSIST_TIMEOUT_MS}.`);
  }
  const persist = options.persist ?? (async () => ({ status: 'committed' }) as const);
  const includeHidden = options.includeHidden === true;

  const ownedInitialDocument = cloneAndFreeze(options.document);
  if (!validDocument(ownedInitialDocument)) {
    throw new TypeError('Field Remap canonical document is malformed or exceeds owner limits.');
  }
  let document = normalizeAndFreezeDocument(ownedInitialDocument);
  let semanticInputs: SemanticInputs = {
    sources: cloneAndFreeze([...options.sources]),
    targets: cloneAndFreeze([...options.targets]),
    sourceShapeRevision: options.sourceShapeRevision,
    targetShapeRevision: options.targetShapeRevision,
    transformRevision: options.transformRevision ?? 'transform:unversioned',
    publicationRevision: options.publicationRevision ?? 'publication:unversioned',
  };
  let revisionSequence = 0;
  let transactionSequence = 0;
  let expiredThrough = 0;
  let closed = false;
  let reconciliationPending = false;
  let queue: Promise<void> = Promise.resolve();
  let disposePromise: Promise<void> | undefined;
  let activePersistenceAbort: AbortController | undefined;
  const history: FieldRemapSemanticHistoryEntry[] = [];
  const reservations = new Map<string, Reservation>();

  const revision = (): string => `${ownerToken}:${ownerEpoch}:revision:${revisionSequence}`;
  let snapshot = projectValue(descriptor, revision(), document, semanticInputs, includeHidden);

  function enqueue(task: () => Promise<void> | void): Promise<void> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  function isPersistenceResult(value: unknown): value is FieldRemapPersistenceResult {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const status = (value as { readonly status?: unknown }).status;
    return status === 'committed' || status === 'rolled-back' || status === 'indeterminate';
  }

  async function runPersistence(
    input: Omit<FieldRemapPersistenceInput, 'signal'>,
  ): Promise<FieldRemapPersistenceResult> {
    const controller = new AbortController();
    activePersistenceAbort = controller;
    const aborted = new Promise<FieldRemapPersistenceResult>((resolve) => {
      controller.signal.addEventListener('abort', () => resolve({ status: 'indeterminate' }), {
        once: true,
      });
    });
    const pending: Promise<FieldRemapPersistenceResult> = Promise.resolve()
      .then(() => persist({ ...input, signal: controller.signal }))
      .then((result): FieldRemapPersistenceResult =>
        isPersistenceResult(result) ? result : { status: 'indeterminate' },
      )
      .catch((): FieldRemapPersistenceResult => ({ status: 'indeterminate' }));
    const timeout = setTimeout(() => controller.abort(), persistTimeoutMs);
    try {
      return await Promise.race([pending, aborted]);
    } finally {
      clearTimeout(timeout);
      if (activePersistenceAbort === controller) {
        activePersistenceAbort = undefined;
      }
    }
  }

  function issueTransactionId(epoch: 'live' | 'closed'): string {
    transactionSequence += 1;
    return `${transactionPrefix}${epoch}-${transactionSequence}`;
  }

  function transactionSequenceOf(id: string): number | null {
    const match = new RegExp(`^${transactionPrefix}live-(\\d+)$`).exec(id);
    if (!match) {
      return null;
    }
    const sequence = Number(match[1]);
    return Number.isSafeInteger(sequence) && sequence > 0 && sequence <= transactionSequence
      ? sequence
      : null;
  }

  function immediate(
    result: WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>,
  ): Promise<WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>> {
    return Promise.resolve(result);
  }

  function reject(
    transactionId: string,
    code:
      'invalid-operation' | 'unsupported-operation' | 'expired-transaction' | 'capacity-exceeded',
  ): WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict> {
    return {
      status: 'rejected',
      transactionId,
      canonicalRevision: revision(),
      code,
    };
  }

  function unavailable(
    transactionId: string,
  ): WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict> {
    return {
      status: 'failed',
      transactionId,
      code: 'unavailable',
      ...(snapshot.canonicalRevision ? { lastKnownRevision: snapshot.canonicalRevision } : {}),
    };
  }

  function evictTerminalReservation(): boolean {
    for (const [id, reservation] of reservations) {
      if (!reservation.terminal) {
        continue;
      }
      reservations.delete(id);
      expiredThrough = Math.max(expiredThrough, reservation.sequence);
      return true;
    }
    return false;
  }

  function hiddenOperatorIds(
    visibleSourceIds: ReadonlySet<string>,
    visibleTargetIds: ReadonlySet<string>,
    counter?: TraversalCounter,
  ): ReadonlySet<string> {
    if (includeHidden || !document.operators?.length) {
      return new Set();
    }
    const operatorIds = new Set<string>();
    for (const operator of document.operators) {
      visit(counter, 'translation');
      if (operatorIsVisible(operator, visibleSourceIds, visibleTargetIds)) {
        continue;
      }
      operatorIds.add(operator.id);
    }
    return operatorIds;
  }

  function applyOperations(
    operations: readonly NormalizedOperation[],
    counter?: TraversalCounter,
  ):
    | { readonly status: 'accepted'; readonly document: FieldRemapDocument }
    | {
        readonly status: 'rejected';
        readonly code: 'invalid-operation' | 'unsupported-operation';
      } {
    const edgeOrder = document.edges.map((edge) => {
      visit(counter, 'translation');
      return edge.id;
    });
    const edgeIds = new Set(edgeOrder);
    visit(counter, 'translation', edgeOrder.length);
    const edgeById = new Map(
      document.edges.map((edge) => {
        visit(counter, 'translation');
        return [edge.id, edge] as const;
      }),
    );
    const operatorOrder = (document.operators ?? []).map((operator) => {
      visit(counter, 'translation');
      return operator.id;
    });
    const operatorIds = new Set(operatorOrder);
    visit(counter, 'translation', operatorOrder.length);
    const operatorById = new Map(
      (document.operators ?? []).map((operator) => {
        visit(counter, 'translation');
        return [operator.id, operator] as const;
      }),
    );
    visitShapeTree(semanticInputs.sources, counter);
    visitShapeTree(semanticInputs.targets, counter);
    visitEdgeTree(document.edges, counter);
    const visible = projectShapes({
      sources: semanticInputs.sources,
      targets: semanticInputs.targets,
      edges: document.edges,
      options: { includeHidden },
    });
    const visibleSourceIds = collectSourceFieldIds(visible.sources);
    visitShapeTree(visible.sources, counter);
    const visibleTargetIds = collectTargetSlotIds(visible.targets);
    visitShapeTree(visible.targets, counter);
    const visibleEdgeIds = new Set(
      (visible.edges ?? []).map((edge) => {
        visit(counter, 'translation');
        return edge.id;
      }),
    );
    const omittedOperatorIds = hiddenOperatorIds(visibleSourceIds, visibleTargetIds, counter);
    const rejected = (
      code: 'invalid-operation' | 'unsupported-operation',
    ): { readonly status: 'rejected'; readonly code: typeof code } => ({
      status: 'rejected',
      code,
    });

    for (const operation of operations) {
      visit(counter, 'translation');
      switch (operation.type) {
        case 'upsert-edge': {
          const current = edgeById.get(operation.edge.id);
          if (
            !visibleSourceIds.has(operation.edge.sourceFieldId) ||
            !visibleTargetIds.has(operation.edge.targetSlotId) ||
            (current !== undefined && !visibleEdgeIds.has(current.id))
          ) {
            return rejected('unsupported-operation');
          }
          if (!edgeIds.has(operation.edge.id)) {
            edgeIds.add(operation.edge.id);
            edgeOrder.push(operation.edge.id);
          }
          edgeById.set(operation.edge.id, operation.edge);
          break;
        }
        case 'remove-edge': {
          const current = edgeById.get(operation.edgeId);
          if (!current) {
            return rejected('invalid-operation');
          }
          if (!visibleEdgeIds.has(current.id)) {
            return rejected('unsupported-operation');
          }
          edgeById.delete(operation.edgeId);
          break;
        }
        case 'upsert-operator': {
          const current = operatorById.get(operation.operator.id);
          if (
            omittedOperatorIds.has(operation.operator.id) ||
            (current !== undefined && omittedOperatorIds.has(current.id)) ||
            !operatorIsVisible(operation.operator, visibleSourceIds, visibleTargetIds)
          ) {
            return rejected('unsupported-operation');
          }
          if (!operatorIds.has(operation.operator.id)) {
            operatorIds.add(operation.operator.id);
            operatorOrder.push(operation.operator.id);
          }
          operatorById.set(operation.operator.id, operation.operator);
          break;
        }
        case 'remove-operator': {
          if (!operatorById.has(operation.operatorId)) {
            return rejected('invalid-operation');
          }
          if (omittedOperatorIds.has(operation.operatorId)) {
            return rejected('unsupported-operation');
          }
          operatorById.delete(operation.operatorId);
          break;
        }
      }
    }

    const edges = edgeOrder.flatMap((id) => {
      visit(counter, 'translation');
      const edge = edgeById.get(id);
      return edge ? [edge] : [];
    });
    const operators = operatorOrder.flatMap((id) => {
      visit(counter, 'translation');
      const operator = operatorById.get(id);
      return operator ? [operator] : [];
    });
    return {
      status: 'accepted',
      document: freezeOwnedDocument(
        {
          version: 2,
          edges,
          ...(operators.length > 0 ? { operators } : {}),
        },
        counter,
      ),
    };
  }

  function applyTransaction(
    transaction: WorkbenchProjectionTransaction<FieldRemapProjectionOperation>,
  ): Promise<WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>> {
    const candidate = transaction as Partial<
      WorkbenchProjectionTransaction<FieldRemapProjectionOperation>
    > | null;
    const transactionId = candidate && typeof candidate.id === 'string' ? candidate.id : '';
    if (closed) {
      return immediate(unavailable(transactionId));
    }
    if (reconciliationPending) {
      return immediate(unavailable(transactionId));
    }
    if (
      !candidate ||
      !isStrictToken(candidate.id) ||
      !isStrictToken(candidate.projectionId) ||
      !isStrictToken(candidate.baseRevision) ||
      candidate.projectionId !== descriptor.id ||
      !Array.isArray(candidate.operations) ||
      candidate.operations.length === 0 ||
      candidate.operations.length > MAX_TRANSACTION_OPERATIONS
    ) {
      return immediate(reject(transactionId, 'invalid-operation'));
    }

    const traversal = options.onTraversal
      ? createTraversalCounter(
          semanticInputs.sources.length +
            semanticInputs.targets.length +
            document.edges.length +
            (document.operators?.length ?? 0) +
            candidate.operations.length,
        )
      : undefined;
    let normalizedOperations: readonly NormalizedOperation[];
    let fingerprint: string;
    try {
      const normalized: NormalizedOperation[] = [];
      for (const operation of candidate.operations) {
        const ownedOperation = normalizeOperation(operation, traversal);
        if (!ownedOperation) {
          return immediate(reject(transactionId, 'invalid-operation'));
        }
        normalized.push(ownedOperation);
      }
      normalizedOperations = Object.freeze(normalized);
      fingerprint = stableSerialize(
        {
          projectionId: candidate.projectionId,
          baseRevision: candidate.baseRevision,
          operations: normalizedOperations,
        },
        traversal,
      );
    } catch {
      return immediate(reject(transactionId, 'invalid-operation'));
    }
    const admittedId = candidate.id;
    const admittedBaseRevision = candidate.baseRevision;

    const retained = reservations.get(admittedId);
    if (retained) {
      return retained.fingerprint === fingerprint
        ? retained.promise
        : immediate(reject(admittedId, 'invalid-operation'));
    }

    const sequence = transactionSequenceOf(admittedId);
    if (sequence === null) {
      return immediate(
        reject(
          admittedId,
          admittedId.startsWith(ownerTransactionPrefix) && /-live-\d+$/.test(admittedId)
            ? 'expired-transaction'
            : 'invalid-operation',
        ),
      );
    }
    if (sequence <= expiredThrough) {
      return immediate(reject(admittedId, 'expired-transaction'));
    }
    while (reservations.size >= maxEntries && evictTerminalReservation()) {
      // Keep evicting terminal work until one slot is available.
    }
    if (reservations.size >= maxEntries) {
      return immediate(reject(admittedId, 'capacity-exceeded'));
    }

    let settle!: (
      result: WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>,
    ) => void;
    const promise = new Promise<WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>>(
      (resolve) => {
        settle = resolve;
      },
    );
    const reservation: Reservation = {
      sequence,
      fingerprint,
      promise,
      resolve: settle,
      terminal: false,
    };
    reservations.set(admittedId, reservation);

    void enqueue(async () => {
      let result: WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>;
      try {
        if (closed || reconciliationPending) {
          result = unavailable(admittedId);
        } else if (admittedBaseRevision !== revision()) {
          result = {
            status: 'conflict',
            transactionId: admittedId,
            currentRevision: revision(),
            conflicts: [{ code: 'stale-canonical-revision' }],
          };
        } else {
          const translated = applyOperations(normalizedOperations, traversal);
          if (translated.status === 'rejected') {
            result = reject(admittedId, translated.code);
          } else {
            const expectedRevision = revision();
            const nextRevision = `${ownerToken}:${ownerEpoch}:revision:${revisionSequence + 1}`;
            const persistenceResult = await runPersistence({
              previousDocument: document,
              nextDocument: translated.document,
              expectedRevision,
              nextRevision,
            });
            const semanticRevisionDrifted = revision() !== expectedRevision;

            if (closed) {
              if (persistenceResult.status !== 'rolled-back') {
                reconciliationPending = true;
              }
              result = unavailable(admittedId);
            } else if (semanticRevisionDrifted) {
              if (persistenceResult.status === 'rolled-back') {
                result = {
                  status: 'conflict',
                  transactionId: admittedId,
                  currentRevision: revision(),
                  conflicts: [{ code: 'stale-canonical-revision' }],
                };
              } else {
                reconciliationPending = true;
                result = unavailable(admittedId);
              }
            } else if (persistenceResult.status === 'committed') {
              const nextSnapshot = projectValue(
                descriptor,
                nextRevision,
                translated.document,
                semanticInputs,
                includeHidden,
                traversal,
              );
              document = translated.document;
              revisionSequence += 1;
              snapshot = nextSnapshot;
              history.push(
                Object.freeze({
                  transactionId: admittedId,
                  canonicalRevision: revision(),
                  document,
                }),
              );
              if (history.length > MAX_HISTORY_ENTRIES) {
                history.shift();
              }
              result = {
                status: 'applied',
                transactionId: admittedId,
                canonicalRevision: revision(),
              };
            } else if (persistenceResult.status === 'rolled-back') {
              result = {
                status: 'failed',
                transactionId: admittedId,
                code: 'commit-failed',
                canonicalRevision: revision(),
              };
            } else {
              reconciliationPending = true;
              result = unavailable(admittedId);
            }
          }
        }
      } catch {
        reconciliationPending = true;
        result = unavailable(admittedId);
      }

      reservation.terminal = true;
      if (traversal) {
        options.onTraversal?.(traversalSample(traversal));
      }
      reservation.resolve(result);
    });

    return promise;
  }

  const port: FieldRemapProjectionOwner['port'] = Object.freeze({
    descriptor,
    getSnapshot: () => snapshot,
    createTransaction: (operations: readonly FieldRemapProjectionOperation[]) => ({
      id: issueTransactionId(closed ? 'closed' : 'live'),
      projectionId: descriptor.id,
      baseRevision: snapshot.canonicalRevision,
      operations,
    }),
    applyTransaction,
  });

  return {
    port,
    getCanonicalDocument: () => document,
    getHistory: () => Object.freeze([...history]),
    getRetentionSize: () => reservations.size,
    isReconciliationPending: () => reconciliationPending,
    createPreviewTicket: () => ({ canonicalRevision: snapshot.canonicalRevision }),
    isPreviewTicketCurrent: (ticket) =>
      !closed && !reconciliationPending && ticket.canonicalRevision === revision(),
    replaceSemanticInputs: (input) => {
      assertRevision(input.sourceShapeRevision, 'sourceShapeRevision');
      assertRevision(input.targetShapeRevision, 'targetShapeRevision');
      if (input.transformRevision !== undefined) {
        assertRevision(input.transformRevision, 'transformRevision');
      }
      if (input.publicationRevision !== undefined) {
        assertRevision(input.publicationRevision, 'publicationRevision');
      }
      if (closed || reconciliationPending) {
        return Promise.resolve();
      }
      const next: SemanticInputs = {
        sources: cloneAndFreeze([...input.sources]),
        targets: cloneAndFreeze([...input.targets]),
        sourceShapeRevision: input.sourceShapeRevision,
        targetShapeRevision: input.targetShapeRevision,
        transformRevision: input.transformRevision ?? semanticInputs.transformRevision,
        publicationRevision: input.publicationRevision ?? semanticInputs.publicationRevision,
      };
      if (
        next.sourceShapeRevision === semanticInputs.sourceShapeRevision &&
        next.targetShapeRevision === semanticInputs.targetShapeRevision &&
        next.transformRevision === semanticInputs.transformRevision &&
        next.publicationRevision === semanticInputs.publicationRevision
      ) {
        return Promise.resolve();
      }
      const nextRevision = `${ownerToken}:${ownerEpoch}:revision:${revisionSequence + 1}`;
      const nextSnapshot = projectValue(descriptor, nextRevision, document, next, includeHidden);
      semanticInputs = next;
      revisionSequence += 1;
      snapshot = nextSnapshot;
      return Promise.resolve();
    },
    dispose: () => {
      if (disposePromise) {
        return disposePromise;
      }
      closed = true;
      activePersistenceAbort?.abort();
      disposePromise = queue.then(() => {
        reservations.clear();
      });
      return disposePromise;
    },
  };
}
