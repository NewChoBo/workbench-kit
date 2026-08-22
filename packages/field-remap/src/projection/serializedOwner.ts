import type {
  WorkbenchEditableProjectionDescriptor,
  WorkbenchEditableProjectionPort,
  WorkbenchProjectionSnapshot,
  WorkbenchProjectionTransaction,
  WorkbenchProjectionTransactionResult,
} from '@workbench-kit/contracts';
import { normalizeFieldRemapDocument } from '../domain/document/fieldRemapDocument.js';
import { normalizeMappingEdge } from '../domain/document/mappingEdge.js';
import { normalizeMappingOperators } from '../domain/mapping/mappingOperators.js';
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

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function assertRevision(value: string, label: string): void {
  if (!nonEmpty(value)) {
    throw new TypeError(`${label} must be a non-empty opaque revision.`);
  }
}

function cloneAndFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneAndFreeze(item))) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  const clone: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    clone[key] = cloneAndFreeze(item);
  }
  return Object.freeze(clone) as T;
}

function freezeDocument(document: FieldRemapDocument): FieldRemapDocument {
  return cloneAndFreeze(normalizeFieldRemapDocument(document));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function normalizeOperation(operation: FieldRemapProjectionOperation): NormalizedOperation | null {
  if (!operation || typeof operation !== 'object') {
    return null;
  }

  switch (operation.type) {
    case 'upsert-edge': {
      const edge = operation.edge;
      if (
        !edge ||
        !nonEmpty(edge.id) ||
        !nonEmpty(edge.sourceFieldId) ||
        !nonEmpty(edge.targetSlotId)
      ) {
        return null;
      }
      return { type: 'upsert-edge', edge: normalizeMappingEdge(edge) };
    }
    case 'remove-edge':
      return nonEmpty(operation.edgeId)
        ? { type: 'remove-edge', edgeId: operation.edgeId.trim() }
        : null;
    case 'upsert-operator': {
      const operator = normalizeMappingOperators([operation.operator])?.[0];
      return operator ? { type: 'upsert-operator', operator } : null;
    }
    case 'remove-operator':
      return nonEmpty(operation.operatorId)
        ? { type: 'remove-operator', operatorId: operation.operatorId.trim() }
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

function projectValue(
  descriptor: WorkbenchEditableProjectionDescriptor,
  canonicalRevision: string,
  document: FieldRemapDocument,
  semanticInputs: SemanticInputs,
  includeHidden: boolean,
): WorkbenchProjectionSnapshot<FieldRemapProjectionValue, WorkbenchEditableProjectionDescriptor> {
  const projected = projectShapes({
    sources: semanticInputs.sources,
    targets: semanticInputs.targets,
    edges: document.edges,
    options: { includeHidden },
  });
  const sourceIds = collectSourceFieldIds(projected.sources);
  const targetIds = collectTargetSlotIds(projected.targets);
  const operators = document.operators?.filter((operator) =>
    operatorIsVisible(operator, sourceIds, targetIds),
  );
  const projectedDocument = freezeDocument({
    version: 2,
    edges: projected.edges ?? [],
    ...(operators && operators.length > 0 ? { operators } : {}),
  });

  return cloneAndFreeze({
    descriptor,
    canonicalRevision,
    value: {
      document: projectedDocument,
      sources: projected.sources,
      targets: projected.targets,
      includeHidden,
    },
  });
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
  if (!nonEmpty(options.id)) {
    throw new TypeError('id must be non-empty.');
  }
  assertRevision(options.sourceShapeRevision, 'sourceShapeRevision');
  assertRevision(options.targetShapeRevision, 'targetShapeRevision');
  if (options.transformRevision !== undefined) {
    assertRevision(options.transformRevision, 'transformRevision');
  }
  if (options.publicationRevision !== undefined) {
    assertRevision(options.publicationRevision, 'publicationRevision');
  }

  const ownerToken = options.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'owner';
  const ownerTransactionPrefix = `field-remap-${ownerToken}-`;
  const ownerEpoch = createOwnerEpoch();
  const transactionPrefix = `${ownerTransactionPrefix}${ownerEpoch}-`;
  const descriptor = Object.freeze({
    id: options.id.trim(),
    documentKind: 'workbench.field-remap',
    projectionVersion: 1,
    kind: 'GUI_BUILDER',
    authority: 'ROUND_TRIP_EDITABLE',
  } as const satisfies WorkbenchEditableProjectionDescriptor);
  const requestedMaxEntries = options.maxTransactionEntries ?? MAX_TRANSACTION_ENTRIES;
  const maxEntries = Number.isFinite(requestedMaxEntries)
    ? Math.min(MAX_TRANSACTION_ENTRIES, Math.max(1, Math.trunc(requestedMaxEntries)))
    : MAX_TRANSACTION_ENTRIES;
  const persist = options.persist ?? (async () => ({ status: 'committed' }) as const);
  const includeHidden = options.includeHidden === true;

  let document = freezeDocument(options.document);
  if (!uniqueIds(document.edges) || !uniqueIds(document.operators ?? [])) {
    throw new TypeError('Field Remap canonical edge and operator ids must be unique.');
  }
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
  const history: FieldRemapSemanticHistoryEntry[] = [];
  const reservations = new Map<string, Reservation>();

  const revision = (): string => `${ownerToken}:${ownerEpoch}:revision:${revisionSequence}`;
  let snapshot = projectValue(descriptor, revision(), document, semanticInputs, includeHidden);

  function enqueue(task: () => Promise<void> | void): Promise<void> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
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

  function hiddenOperatorOperands(
    visibleSourceIds: ReadonlySet<string>,
    visibleTargetIds: ReadonlySet<string>,
  ): {
    readonly sourceIds: ReadonlySet<string>;
    readonly targetIds: ReadonlySet<string>;
    readonly operatorIds: ReadonlySet<string>;
  } {
    if (includeHidden || !document.operators?.length) {
      return { sourceIds: new Set(), targetIds: new Set(), operatorIds: new Set() };
    }
    const sourceIds = new Set<string>();
    const targetIds = new Set<string>();
    const operatorIds = new Set<string>();
    for (const operator of document.operators) {
      if (operatorIsVisible(operator, visibleSourceIds, visibleTargetIds)) {
        continue;
      }
      operatorIds.add(operator.id);
      const operands = operatorOperandIds(operator);
      operands.sources.forEach((id) => sourceIds.add(id));
      operands.targets.forEach((id) => targetIds.add(id));
    }
    return { sourceIds, targetIds, operatorIds };
  }

  function applyOperations(operations: readonly NormalizedOperation[]):
    | { readonly status: 'accepted'; readonly document: FieldRemapDocument }
    | {
        readonly status: 'rejected';
        readonly code: 'invalid-operation' | 'unsupported-operation';
      } {
    const edgeOrder = document.edges.map((edge) => edge.id);
    const edgeIds = new Set(edgeOrder);
    const edgeById = new Map(document.edges.map((edge) => [edge.id, edge]));
    const operatorOrder = (document.operators ?? []).map((operator) => operator.id);
    const operatorIds = new Set(operatorOrder);
    const operatorById = new Map(
      (document.operators ?? []).map((operator) => [operator.id, operator]),
    );
    const visible = projectShapes({
      sources: semanticInputs.sources,
      targets: semanticInputs.targets,
      options: { includeHidden },
    });
    const visibleSourceIds = collectSourceFieldIds(visible.sources);
    const visibleTargetIds = collectTargetSlotIds(visible.targets);
    const protectedOperands = hiddenOperatorOperands(visibleSourceIds, visibleTargetIds);

    for (const operation of operations) {
      switch (operation.type) {
        case 'upsert-edge': {
          const current = edgeById.get(operation.edge.id);
          const touchesOmittedOperator =
            protectedOperands.sourceIds.has(operation.edge.sourceFieldId) ||
            protectedOperands.targetIds.has(operation.edge.targetSlotId) ||
            (current !== undefined &&
              (protectedOperands.sourceIds.has(current.sourceFieldId) ||
                protectedOperands.targetIds.has(current.targetSlotId)));
          if (
            !visibleSourceIds.has(operation.edge.sourceFieldId) ||
            !visibleTargetIds.has(operation.edge.targetSlotId) ||
            touchesOmittedOperator
          ) {
            return { status: 'rejected', code: 'unsupported-operation' };
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
            return { status: 'rejected', code: 'invalid-operation' };
          }
          if (
            !visibleSourceIds.has(current.sourceFieldId) ||
            !visibleTargetIds.has(current.targetSlotId) ||
            protectedOperands.sourceIds.has(current.sourceFieldId) ||
            protectedOperands.targetIds.has(current.targetSlotId)
          ) {
            return { status: 'rejected', code: 'unsupported-operation' };
          }
          edgeById.delete(operation.edgeId);
          break;
        }
        case 'upsert-operator': {
          const current = operatorById.get(operation.operator.id);
          if (
            protectedOperands.operatorIds.has(operation.operator.id) ||
            (current !== undefined && protectedOperands.operatorIds.has(current.id)) ||
            !operatorIsVisible(operation.operator, visibleSourceIds, visibleTargetIds)
          ) {
            return { status: 'rejected', code: 'unsupported-operation' };
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
            return { status: 'rejected', code: 'invalid-operation' };
          }
          if (protectedOperands.operatorIds.has(operation.operatorId)) {
            return { status: 'rejected', code: 'unsupported-operation' };
          }
          operatorById.delete(operation.operatorId);
          break;
        }
      }
    }

    const edges = edgeOrder.flatMap((id) => {
      const edge = edgeById.get(id);
      return edge ? [edge] : [];
    });
    const operators = operatorOrder.flatMap((id) => {
      const operator = operatorById.get(id);
      return operator ? [operator] : [];
    });
    if (!uniqueIds(edges) || !uniqueIds(operators)) {
      return { status: 'rejected', code: 'invalid-operation' };
    }
    return {
      status: 'accepted',
      document: freezeDocument({
        version: 2,
        edges,
        ...(operators.length > 0 ? { operators } : {}),
      }),
    };
  }

  function applyTransaction(
    transaction: WorkbenchProjectionTransaction<FieldRemapProjectionOperation>,
  ): Promise<WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>> {
    if (closed) {
      return immediate(unavailable(transaction.id));
    }
    if (reconciliationPending) {
      return immediate(unavailable(transaction.id));
    }
    if (
      !nonEmpty(transaction.id) ||
      !nonEmpty(transaction.projectionId) ||
      !nonEmpty(transaction.baseRevision) ||
      transaction.projectionId !== descriptor.id ||
      !Array.isArray(transaction.operations) ||
      transaction.operations.length === 0
    ) {
      return immediate(reject(transaction.id, 'invalid-operation'));
    }

    const normalizedOperations: NormalizedOperation[] = [];
    for (const operation of transaction.operations) {
      const normalized = normalizeOperation(operation);
      if (!normalized) {
        return immediate(reject(transaction.id, 'invalid-operation'));
      }
      normalizedOperations.push(normalized);
    }

    const fingerprint = stableSerialize({
      projectionId: transaction.projectionId,
      baseRevision: transaction.baseRevision,
      operations: normalizedOperations,
    });
    const retained = reservations.get(transaction.id);
    if (retained) {
      return retained.fingerprint === fingerprint
        ? retained.promise
        : immediate(reject(transaction.id, 'invalid-operation'));
    }

    const sequence = transactionSequenceOf(transaction.id);
    if (sequence === null) {
      return immediate(
        reject(
          transaction.id,
          transaction.id.startsWith(ownerTransactionPrefix) && /-live-\d+$/.test(transaction.id)
            ? 'expired-transaction'
            : 'invalid-operation',
        ),
      );
    }
    if (sequence <= expiredThrough) {
      return immediate(reject(transaction.id, 'expired-transaction'));
    }
    while (reservations.size >= maxEntries && evictTerminalReservation()) {
      // Keep evicting terminal work until one slot is available.
    }
    if (reservations.size >= maxEntries) {
      return immediate(reject(transaction.id, 'capacity-exceeded'));
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
    reservations.set(transaction.id, reservation);

    void enqueue(async () => {
      let result: WorkbenchProjectionTransactionResult<FieldRemapProjectionConflict>;
      try {
        if (reconciliationPending) {
          result = unavailable(transaction.id);
        } else if (transaction.baseRevision !== revision()) {
          result = {
            status: 'conflict',
            transactionId: transaction.id,
            currentRevision: revision(),
            conflicts: [{ code: 'stale-canonical-revision' }],
          };
        } else {
          const translated = applyOperations(normalizedOperations);
          if (translated.status === 'rejected') {
            result = reject(transaction.id, translated.code);
          } else {
            const nextRevision = `${ownerToken}:${ownerEpoch}:revision:${revisionSequence + 1}`;
            let persistenceResult: FieldRemapPersistenceResult;
            try {
              persistenceResult = await persist({
                previousDocument: document,
                nextDocument: translated.document,
                expectedRevision: revision(),
                nextRevision,
              });
            } catch {
              persistenceResult = { status: 'indeterminate' };
            }

            if (persistenceResult.status === 'committed') {
              const nextSnapshot = projectValue(
                descriptor,
                nextRevision,
                translated.document,
                semanticInputs,
                includeHidden,
              );
              document = translated.document;
              revisionSequence += 1;
              snapshot = nextSnapshot;
              history.push(
                Object.freeze({
                  transactionId: transaction.id,
                  canonicalRevision: revision(),
                  document,
                }),
              );
              result = {
                status: 'applied',
                transactionId: transaction.id,
                canonicalRevision: revision(),
              };
            } else if (persistenceResult.status === 'rolled-back') {
              result = {
                status: 'failed',
                transactionId: transaction.id,
                code: 'commit-failed',
                canonicalRevision: revision(),
              };
            } else {
              reconciliationPending = true;
              result = unavailable(transaction.id);
            }
          }
        }
      } catch {
        reconciliationPending = true;
        result = unavailable(transaction.id);
      }

      reservation.terminal = true;
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
      return enqueue(() => {
        if (closed || reconciliationPending) {
          return;
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
          return;
        }
        const nextRevision = `${ownerToken}:${ownerEpoch}:revision:${revisionSequence + 1}`;
        const nextSnapshot = projectValue(descriptor, nextRevision, document, next, includeHidden);
        semanticInputs = next;
        revisionSequence += 1;
        snapshot = nextSnapshot;
      });
    },
    dispose: () => {
      if (disposePromise) {
        return disposePromise;
      }
      closed = true;
      disposePromise = queue.then(() => {
        reservations.clear();
      });
      return disposePromise;
    },
  };
}
