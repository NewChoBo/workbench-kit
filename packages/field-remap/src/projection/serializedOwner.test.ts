import { describe, expect, it, vi } from 'vitest';
import type { WorkbenchProjectionTransaction } from '@workbench-kit/contracts';
import type { FieldRemapDocument, SourceField, TargetSlot } from '../domain/types.js';
import {
  createFieldRemapProjectionOwner,
  type FieldRemapPersistenceInput,
  type FieldRemapPersistenceResult,
  type FieldRemapProjectionOperation,
  type FieldRemapTraversalSample,
} from './serializedOwner.js';

const sources: readonly SourceField[] = [
  { id: 'source.visible', label: 'Visible source' },
  { id: 'source.other', label: 'Other source' },
  { id: 'source.hidden', label: 'Hidden source', hidden: true },
];

const targets: readonly TargetSlot[] = [
  { id: 'target.visible', label: 'Visible target' },
  { id: 'target.other', label: 'Other target' },
  { id: 'target.combined', label: 'Combined target' },
  { id: 'target.hidden', label: 'Hidden target', hidden: true },
];

const baseDocument: FieldRemapDocument = {
  version: 2,
  edges: [
    {
      id: 'edge-visible',
      sourceFieldId: 'source.visible',
      targetSlotId: 'target.visible',
      transformIds: ['string:trim'],
    },
    {
      id: 'edge-hidden',
      sourceFieldId: 'source.hidden',
      targetSlotId: 'target.hidden',
    },
  ],
  operators: [
    {
      kind: 'combine',
      id: 'operator-hidden',
      inputFieldIds: ['source.visible', 'source.hidden'],
      outputSlotId: 'target.combined',
    },
  ],
};

function createOwner(
  overrides: Partial<Parameters<typeof createFieldRemapProjectionOwner>[0]> = {},
) {
  return createFieldRemapProjectionOwner({
    id: 'field-remap-flow',
    document: baseDocument,
    sources,
    targets,
    sourceShapeRevision: 'source:1',
    targetShapeRevision: 'target:1',
    ...overrides,
  });
}

function upsertOtherEdge(transformIds?: readonly string[]): FieldRemapProjectionOperation {
  return {
    type: 'upsert-edge',
    edge: {
      id: 'edge-other',
      sourceFieldId: 'source.other',
      targetSlotId: 'target.other',
      ...(transformIds ? { transformIds } : {}),
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('package-internal Field Remap projection owner', () => {
  it('projects hidden shapes, mappings, and operators without changing canonical state', () => {
    const owner = createOwner();
    const snapshot = owner.port.getSnapshot();

    expect(snapshot.descriptor).toMatchObject({
      kind: 'GUI_BUILDER',
      authority: 'ROUND_TRIP_EDITABLE',
    });
    expect(snapshot.value.sources.map((source) => source.id)).toEqual([
      'source.visible',
      'source.other',
    ]);
    expect(snapshot.value.document.edges.map((edge) => edge.id)).toEqual(['edge-visible']);
    expect(snapshot.value.document.edges[0]?.transformIds).toEqual(['string:trim']);
    expect(snapshot.value.document.operators).toBeUndefined();
    expect(Object.isFrozen(snapshot.value.document.edges[0])).toBe(true);
    expect(Object.isFrozen(snapshot.value.sources[0])).toBe(true);
    expect(owner.getCanonicalDocument()).toEqual(baseDocument);
    expect(JSON.stringify(owner.getCanonicalDocument())).not.toContain('preview');
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('applies a safe visible edit while preserving hidden mappings and omitted operators', async () => {
    const owner = createOwner();
    const before = owner.port.getSnapshot().canonicalRevision;
    const result = await owner.port.applyTransaction(
      owner.port.createTransaction([upsertOtherEdge(['string:trim', 'identity'])]),
    );

    expect(result).toMatchObject({ status: 'applied' });
    expect(result.status === 'applied' && result.canonicalRevision).not.toBe(before);
    expect(owner.getCanonicalDocument().edges.map((edge) => edge.id)).toEqual([
      'edge-visible',
      'edge-hidden',
      'edge-other',
    ]);
    expect(owner.getCanonicalDocument().operators?.map((operator) => operator.id)).toEqual([
      'operator-hidden',
    ]);
    expect(owner.getHistory()).toHaveLength(1);
  });

  it('allows an edge edit that only shares an operand with an omitted operator', async () => {
    const owner = createOwner();
    const transaction = owner.port.createTransaction([
      {
        type: 'upsert-edge',
        edge: {
          id: 'edge-visible',
          sourceFieldId: 'source.visible',
          targetSlotId: 'target.other',
        },
      },
    ]);

    await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
      status: 'applied',
    });
    expect(owner.getCanonicalDocument().operators).toEqual(baseDocument.operators);
    expect(owner.getHistory()).toHaveLength(1);
  });

  it('rejects replacing an omitted hidden edge id and preserves canonical state', async () => {
    const owner = createOwner();
    const transaction = owner.port.createTransaction([
      {
        type: 'upsert-edge',
        edge: {
          id: 'edge-hidden',
          sourceFieldId: 'source.other',
          targetSlotId: 'target.other',
        },
      },
    ]);

    await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
      status: 'rejected',
      code: 'unsupported-operation',
    });
    expect(owner.getCanonicalDocument()).toEqual(baseDocument);
  });

  it('rejects replacing an omitted operator that requires hidden interpretation', async () => {
    const owner = createOwner();
    const transaction = owner.port.createTransaction([
      {
        type: 'upsert-operator',
        operator: {
          kind: 'split',
          id: 'operator-hidden',
          inputFieldId: 'source.other',
          outputSlotIds: ['target.visible', 'target.other'],
        },
      },
    ]);

    await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
      status: 'rejected',
      code: 'unsupported-operation',
    });
    expect(owner.getCanonicalDocument()).toEqual(baseDocument);
  });

  it('commits edge and operator changes atomically with one persistence write and history entry', async () => {
    const persist = vi.fn(async (_input: FieldRemapPersistenceInput) => {
      return { status: 'committed' } as const;
    });
    const owner = createOwner({ includeHidden: true, persist });
    const transaction = owner.port.createTransaction([
      upsertOtherEdge(),
      {
        type: 'upsert-operator',
        operator: {
          kind: 'split',
          id: 'operator-split',
          inputFieldId: 'source.visible',
          outputSlotIds: ['target.visible', 'target.other'],
        },
      },
    ]);

    await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
      status: 'applied',
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[0].nextDocument).toMatchObject({
      edges: expect.arrayContaining([expect.objectContaining({ id: 'edge-other' })]),
      operators: expect.arrayContaining([expect.objectContaining({ id: 'operator-split' })]),
    });
    expect(owner.getHistory()).toHaveLength(1);
  });

  it('serializes concurrent same-base transactions so only one applies', async () => {
    const owner = createOwner();
    const first = owner.port.createTransaction([upsertOtherEdge()]);
    const second = owner.port.createTransaction([
      {
        type: 'remove-edge',
        edgeId: 'edge-visible',
      },
    ]);

    const [firstResult, secondResult] = await Promise.all([
      owner.port.applyTransaction(first),
      owner.port.applyTransaction(second),
    ]);

    expect(firstResult.status).toBe('applied');
    expect(secondResult).toMatchObject({
      status: 'conflict',
      conflicts: [{ code: 'stale-canonical-revision' }],
    });
    expect(owner.getHistory()).toHaveLength(1);
  });

  it('reserves normalized duplicates before persistence and replays one terminal result', async () => {
    const persistence = deferred<FieldRemapPersistenceResult>();
    const persist = vi.fn((_input: FieldRemapPersistenceInput) => persistence.promise);
    const owner = createOwner({ persist });
    const transaction = owner.port.createTransaction([
      upsertOtherEdge(['string:trim', 'identity']),
    ]);
    const equivalent: typeof transaction = {
      ...transaction,
      operations: [upsertOtherEdge(['string:trim'])],
    };

    const first = owner.port.applyTransaction(transaction);
    const duplicate = owner.port.applyTransaction(equivalent);
    expect(duplicate).toBe(first);
    expect(owner.getRetentionSize()).toBe(1);

    const mismatched = owner.port.applyTransaction({
      ...transaction,
      operations: [upsertOtherEdge(['string:upper'])],
    });
    await expect(mismatched).resolves.toMatchObject({
      status: 'rejected',
      code: 'invalid-operation',
    });

    persistence.resolve({ status: 'committed' });
    const result = await first;
    expect(await owner.port.applyTransaction(equivalent)).toBe(result);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(owner.getHistory()).toHaveLength(1);
  });

  it.each([
    ['nested undefined', { nested: undefined }, {}],
    ['negative zero', -0, 0],
  ] as const)(
    'rejects a same-id payload mismatch that differs only by %s',
    async (_label, firstValue, secondValue) => {
      const persistence = deferred<FieldRemapPersistenceResult>();
      const persist = vi.fn((_input: FieldRemapPersistenceInput) => persistence.promise);
      const owner = createOwner({ persist });
      const operation = (value: unknown): FieldRemapProjectionOperation => ({
        type: 'upsert-edge',
        edge: {
          id: 'edge-other',
          sourceFieldId: 'source.other',
          targetSlotId: 'target.other',
          transformIds: ['string:trim'],
          transformOptionSteps: [{ value }],
        },
      });
      const transaction = owner.port.createTransaction([operation(firstValue)]);
      const first = owner.port.applyTransaction(transaction);

      await expect(
        owner.port.applyTransaction({
          ...transaction,
          operations: [operation(secondValue)],
        }),
      ).resolves.toMatchObject({ status: 'rejected', code: 'invalid-operation' });
      await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

      persistence.resolve({ status: 'committed' });
      await expect(first).resolves.toMatchObject({ status: 'applied' });
      expect(owner.getHistory()).toHaveLength(1);
    },
  );

  it.each([
    ['id', ''],
    ['projectionId', ''],
    ['baseRevision', ''],
  ] as const)('rejects empty %s before stale revision comparison', async (field, empty) => {
    const persist = vi.fn(async () => ({ status: 'committed' }) as const);
    const owner = createOwner({ persist });
    const transaction = owner.port.createTransaction([upsertOtherEdge()]);
    const malformed = {
      ...transaction,
      baseRevision: 'stale-revision',
      [field]: empty,
    };

    await expect(owner.port.applyTransaction(malformed)).resolves.toMatchObject({
      status: 'rejected',
      code: 'invalid-operation',
    });
    expect(persist).not.toHaveBeenCalled();
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('rejects untrimmed ids, over-limit batches, and transform/operator bounds in envelopes', async () => {
    const persist = vi.fn(async () => ({ status: 'committed' }) as const);
    const owner = createOwner({ includeHidden: true, persist });
    const untrimmed = owner.port.createTransaction([
      { type: 'remove-edge', edgeId: ' edge-visible ' },
    ]);
    const oversizedBatch = owner.port.createTransaction(
      Array.from({ length: 257 }, () => ({
        type: 'remove-edge' as const,
        edgeId: 'edge-visible',
      })),
    );
    const oversizedTransform = owner.port.createTransaction([
      upsertOtherEdge(['one', 'two', 'three', 'four']),
    ]);
    const oversizedOperator = owner.port.createTransaction([
      {
        type: 'upsert-operator',
        operator: {
          kind: 'combine',
          id: 'operator-over-limit',
          inputFieldIds: Array.from({ length: 9 }, (_, index) => `source.${index}`),
          outputSlotId: 'target.visible',
        },
      },
    ]);

    for (const transaction of [untrimmed, oversizedBatch, oversizedTransform, oversizedOperator]) {
      await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
        status: 'rejected',
        code: 'invalid-operation',
      });
    }
    expect(persist).not.toHaveBeenCalled();
  });

  it('contains cyclic and unsupported payloads as invalid-operation results', async () => {
    const owner = createOwner({ includeHidden: true });
    const cyclicOptions: Record<string, unknown> = {};
    cyclicOptions.self = cyclicOptions;
    const cyclic = owner.port.createTransaction([
      {
        type: 'upsert-edge',
        edge: {
          id: 'edge-cycle',
          sourceFieldId: 'source.other',
          targetSlotId: 'target.other',
          transformIds: ['string:trim'],
          transformOptionSteps: [cyclicOptions],
        },
      },
    ]);
    const unsupported = owner.port.createTransaction([
      {
        type: 'upsert-edge',
        edge: {
          id: 'edge-function',
          sourceFieldId: 'source.other',
          targetSlotId: 'target.other',
          transformIds: ['string:trim'],
          transformOptionSteps: [{ callback: () => undefined }],
        },
      },
    ] as unknown as readonly FieldRemapProjectionOperation[]);

    await expect(owner.port.applyTransaction(cyclic)).resolves.toMatchObject({
      status: 'rejected',
      code: 'invalid-operation',
    });
    await expect(owner.port.applyTransaction(unsupported)).resolves.toMatchObject({
      status: 'rejected',
      code: 'invalid-operation',
    });
  });

  it('owns and freezes the admitted payload before fingerprinting or queued persistence', async () => {
    const persistence = deferred<FieldRemapPersistenceResult>();
    const persist = vi.fn((_input: FieldRemapPersistenceInput) => persistence.promise);
    const owner = createOwner({ includeHidden: true, persist });
    const mutableEdge = {
      id: 'edge-owned',
      sourceFieldId: 'source.other',
      targetSlotId: 'target.other',
      transformIds: ['string:trim'],
    };
    const transaction = owner.port.createTransaction([{ type: 'upsert-edge', edge: mutableEdge }]);
    const result = owner.port.applyTransaction(transaction);
    mutableEdge.targetSlotId = 'target.visible';
    mutableEdge.transformIds = ['string:upper'];
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const persisted = persist.mock.calls[0]?.[0].nextDocument;
    expect(persisted?.edges.find((edge) => edge.id === 'edge-owned')).toMatchObject({
      targetSlotId: 'target.other',
      transformIds: ['string:trim'],
    });
    expect(Object.isFrozen(persisted?.edges.find((edge) => edge.id === 'edge-owned'))).toBe(true);
    persistence.resolve({ status: 'committed' });
    await expect(result).resolves.toMatchObject({ status: 'applied' });
  });

  it('distinguishes proven rollback from indeterminate persistence', async () => {
    const rolledBackOwner = createOwner({
      persist: async () => ({ status: 'rolled-back' }),
    });
    const before = rolledBackOwner.port.getSnapshot();
    await expect(
      rolledBackOwner.port.applyTransaction(
        rolledBackOwner.port.createTransaction([upsertOtherEdge()]),
      ),
    ).resolves.toEqual({
      status: 'failed',
      transactionId: expect.any(String),
      code: 'commit-failed',
      canonicalRevision: before.canonicalRevision,
    });
    expect(rolledBackOwner.port.getSnapshot()).toBe(before);
    expect(rolledBackOwner.getCanonicalDocument()).toEqual(baseDocument);
    expect(rolledBackOwner.getHistory()).toHaveLength(0);

    const persist = vi.fn(async () => ({ status: 'indeterminate' }) as const);
    const indeterminateOwner = createOwner({ persist });
    const failed = await indeterminateOwner.port.applyTransaction(
      indeterminateOwner.port.createTransaction([upsertOtherEdge()]),
    );
    expect(failed).toMatchObject({ status: 'failed', code: 'unavailable' });
    expect(indeterminateOwner.isReconciliationPending()).toBe(true);
    expect(indeterminateOwner.getCanonicalDocument()).toEqual(baseDocument);
    expect(indeterminateOwner.getHistory()).toHaveLength(0);

    await expect(
      indeterminateOwner.port.applyTransaction(
        indeterminateOwner.port.createTransaction([upsertOtherEdge()]),
      ),
    ).resolves.toMatchObject({ status: 'failed', code: 'unavailable' });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('folds shape revisions into the canonical cohort and invalidates preview tickets', async () => {
    const owner = createOwner();
    const staleTransaction = owner.port.createTransaction([upsertOtherEdge()]);
    const preview = owner.createPreviewTicket();

    const replacement = owner.replaceSemanticInputs({
      sources,
      targets,
      sourceShapeRevision: 'source:2',
      targetShapeRevision: 'target:1',
      transformRevision: 'transform:2',
      publicationRevision: 'publication:2',
    });

    expect(owner.isPreviewTicketCurrent(preview)).toBe(false);
    expect(owner.port.getSnapshot().canonicalRevision).not.toBe(staleTransaction.baseRevision);
    await replacement;
    await expect(owner.port.applyTransaction(staleTransaction)).resolves.toMatchObject({
      status: 'conflict',
    });
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('publishes semantic input revisions immediately and conflicts pending old transactions', async () => {
    const persistence = deferred<FieldRemapPersistenceResult>();
    const persist = vi.fn(() => persistence.promise);
    const owner = createOwner({ persist });
    const firstTransaction = owner.port.createTransaction([upsertOtherEdge()]);
    const pendingTransaction = owner.port.createTransaction([
      { type: 'remove-edge', edgeId: 'edge-visible' },
    ]);
    const preview = owner.createPreviewTicket();
    const first = owner.port.applyTransaction(firstTransaction);
    const pending = owner.port.applyTransaction(pendingTransaction);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const replacement = owner.replaceSemanticInputs({
      sources,
      targets,
      sourceShapeRevision: 'source:2',
      targetShapeRevision: 'target:1',
    });

    expect(owner.isPreviewTicketCurrent(preview)).toBe(false);
    expect(owner.port.getSnapshot().canonicalRevision).not.toBe(firstTransaction.baseRevision);
    await replacement;
    persistence.resolve({ status: 'rolled-back' });
    await expect(first).resolves.toMatchObject({ status: 'conflict' });
    await expect(pending).resolves.toMatchObject({ status: 'conflict' });
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('evicts terminal entries, rejects expired replays, and caps all-in-flight work', async () => {
    const terminalOwner = createOwner({ maxTransactionEntries: 1 });
    const first = terminalOwner.port.createTransaction([upsertOtherEdge()]);
    await terminalOwner.port.applyTransaction(first);
    const second = terminalOwner.port.createTransaction([
      { type: 'remove-edge', edgeId: 'edge-other' },
    ]);
    await terminalOwner.port.applyTransaction(second);
    await expect(terminalOwner.port.applyTransaction(first)).resolves.toMatchObject({
      status: 'rejected',
      code: 'expired-transaction',
    });

    const persistence = deferred<FieldRemapPersistenceResult>();
    const cappedOwner = createOwner({
      maxTransactionEntries: 2,
      persist: () => persistence.promise,
    });
    const one = cappedOwner.port.applyTransaction(
      cappedOwner.port.createTransaction([upsertOtherEdge()]),
    );
    const two = cappedOwner.port.applyTransaction(
      cappedOwner.port.createTransaction([{ type: 'remove-edge', edgeId: 'edge-visible' }]),
    );
    await expect(
      cappedOwner.port.applyTransaction(
        cappedOwner.port.createTransaction([
          {
            type: 'upsert-edge',
            edge: {
              id: 'edge-third',
              sourceFieldId: 'source.other',
              targetSlotId: 'target.visible',
            },
          },
        ]),
      ),
    ).resolves.toMatchObject({ status: 'rejected', code: 'capacity-exceeded' });
    persistence.resolve({ status: 'committed' });
    await Promise.all([one, two]);
  });

  it('never allows a configured retention limit above the hard 1,024-entry cap', async () => {
    const persistence = deferred<FieldRemapPersistenceResult>();
    const owner = createOwner({
      maxTransactionEntries: 10_000,
      persist: () => persistence.promise,
    });
    const inFlight = Array.from({ length: 1_024 }, (_, index) =>
      owner.port.applyTransaction(
        owner.port.createTransaction([
          {
            type: 'upsert-edge',
            edge: {
              id: `edge-cap-${index}`,
              sourceFieldId: 'source.other',
              targetSlotId: 'target.other',
            },
          },
        ]),
      ),
    );

    expect(owner.getRetentionSize()).toBe(1_024);
    await expect(
      owner.port.applyTransaction(
        owner.port.createTransaction([
          {
            type: 'upsert-edge',
            edge: {
              id: 'edge-over-cap',
              sourceFieldId: 'source.other',
              targetSlotId: 'target.other',
            },
          },
        ]),
      ),
    ).resolves.toMatchObject({ status: 'rejected', code: 'capacity-exceeded' });

    persistence.resolve({ status: 'committed' });
    await Promise.all(inFlight);
  });

  it('rejects a transaction from a disposed owner epoch without replaying it', async () => {
    const previous = createOwner({ includeHidden: true });
    const oldTransaction = previous.port.createTransaction([upsertOtherEdge()]);
    await previous.dispose();

    const replacementPersist = vi.fn(async () => ({ status: 'committed' }) as const);
    const replacement = createOwner({ includeHidden: true, persist: replacementPersist });
    await expect(replacement.port.applyTransaction(oldTransaction)).resolves.toMatchObject({
      status: 'rejected',
      code: 'expired-transaction',
    });
    expect(replacementPersist).not.toHaveBeenCalled();
    expect(replacement.getHistory()).toHaveLength(0);
  });

  it('aborts a never-settling persistence task so disposal and all duplicates resolve', async () => {
    const persist = vi.fn(
      (_input: FieldRemapPersistenceInput) => new Promise<FieldRemapPersistenceResult>(() => {}),
    );
    const owner = createOwner({ persist, persistTimeoutMs: 1_000 });
    const transaction = owner.port.createTransaction([upsertOtherEdge()]);
    const snapshot = owner.port.getSnapshot();
    const first = owner.port.applyTransaction(transaction);
    const duplicate = owner.port.applyTransaction(transaction);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    const disposal = owner.dispose();

    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      expect.objectContaining({ status: 'failed', code: 'unavailable' }),
      expect.objectContaining({ status: 'failed', code: 'unavailable' }),
    ]);
    await disposal;
    expect(persist.mock.calls[0]?.[0].signal.aborted).toBe(true);
    expect(owner.getRetentionSize()).toBe(0);
    expect(owner.isPreviewTicketCurrent({ canonicalRevision: snapshot.canonicalRevision })).toBe(
      false,
    );

    const historical = owner.port.getSnapshot();
    const closedTransaction = owner.port.createTransaction([upsertOtherEdge()]);
    expect(historical).toBe(snapshot);
    expect(closedTransaction.id).toContain('-closed-');
    expect(closedTransaction.baseRevision).toBe(historical.canonicalRevision);
    await expect(owner.port.applyTransaction(closedTransaction)).resolves.toEqual({
      status: 'failed',
      transactionId: closedTransaction.id,
      code: 'unavailable',
      lastKnownRevision: historical.canonicalRevision,
    });
  });

  it('times out a never-settling persistence task without leaving callers pending', async () => {
    const owner = createOwner({
      persistTimeoutMs: 10,
      persist: () => new Promise<FieldRemapPersistenceResult>(() => {}),
    });
    const transaction = owner.port.createTransaction([upsertOtherEdge()]);
    const first = owner.port.applyTransaction(transaction);
    const duplicate = owner.port.applyTransaction(transaction);

    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      expect.objectContaining({ status: 'failed', code: 'unavailable' }),
      expect.objectContaining({ status: 'failed', code: 'unavailable' }),
    ]);
    expect(owner.isReconciliationPending()).toBe(true);
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('keeps invalid operation batches atomic with no persistence or history', async () => {
    const persist = vi.fn(async () => ({ status: 'committed' }) as const);
    const owner = createOwner({ includeHidden: true, persist });
    const transaction = owner.port.createTransaction([
      upsertOtherEdge(),
      { type: 'remove-edge', edgeId: 'missing-edge' },
    ]);

    await expect(owner.port.applyTransaction(transaction)).resolves.toMatchObject({
      status: 'rejected',
      code: 'invalid-operation',
    });
    expect(persist).not.toHaveBeenCalled();
    expect(owner.getCanonicalDocument()).toEqual(baseDocument);
    expect(owner.getHistory()).toHaveLength(0);
  });

  it('supports a new explicit transaction after a stale transaction conflicts', async () => {
    const owner = createOwner({ includeHidden: true });
    const stale = owner.port.createTransaction([{ type: 'remove-edge', edgeId: 'edge-visible' }]);
    await owner.port.applyTransaction(owner.port.createTransaction([upsertOtherEdge()]));
    await expect(owner.port.applyTransaction(stale)).resolves.toMatchObject({
      status: 'conflict',
    });

    const rebased = owner.port.createTransaction([{ type: 'remove-edge', edgeId: 'edge-visible' }]);
    await expect(owner.port.applyTransaction(rebased)).resolves.toMatchObject({
      status: 'applied',
    });
    expect(owner.getHistory()).toHaveLength(2);
  });

  it('bounds retained semantic history while canonical revisions continue advancing', async () => {
    const owner = createOwner({ includeHidden: true });
    for (let index = 0; index < 300; index += 1) {
      await owner.port.applyTransaction(
        owner.port.createTransaction([
          {
            type: 'upsert-edge',
            edge: {
              id: 'edge-history',
              sourceFieldId: 'source.other',
              targetSlotId: index % 2 === 0 ? 'target.other' : 'target.visible',
            },
          },
        ]),
      );
    }

    const history = owner.getHistory();
    expect(history).toHaveLength(256);
    expect(history[0]?.canonicalRevision).toContain(':revision:45');
    expect(history[history.length - 1]?.canonicalRevision).toContain(':revision:300');
  });

  it('keeps SMALL/TYPICAL/STRESS reference traversals proportional to aggregate size', async () => {
    const samples: FieldRemapTraversalSample[] = [];
    for (const count of [8, 100, 600]) {
      const fixtureSources = Array.from({ length: count }, (_, index) => ({
        id: `source.${index}`,
        label: `Source ${index}`,
      }));
      const fixtureTargets = Array.from({ length: count }, (_, index) => ({
        id: `target.${index}`,
        label: `Target ${index}`,
      }));
      const fixtureEdges = Array.from({ length: count }, (_, index) => ({
        id: `edge.${index}`,
        sourceFieldId: `source.${index}`,
        targetSlotId: `target.${index}`,
      }));
      const owner = createFieldRemapProjectionOwner({
        id: `traversal-${count}`,
        document: { version: 2, edges: fixtureEdges },
        sources: fixtureSources,
        targets: fixtureTargets,
        sourceShapeRevision: 'source:1',
        targetShapeRevision: 'target:1',
        onTraversal: (sample) => samples.push(sample),
      });

      await owner.port.applyTransaction(
        owner.port.createTransaction([
          {
            type: 'upsert-edge',
            edge: {
              id: 'edge.0',
              sourceFieldId: 'source.0',
              targetSlotId: 'target.0',
            },
          },
        ]),
      );
    }

    expect(samples.map((sample) => sample.size)).toEqual(['SMALL', 'TYPICAL', 'STRESS']);
    for (const sample of samples) {
      expect(Object.values(sample.stages).every((count) => count > 0)).toBe(true);
      expect(sample.visitedEntries).toBeLessThan(sample.aggregateEntries * 40);
    }
    const normalizedCosts = samples.map(
      (sample) => sample.visitedEntries / sample.aggregateEntries,
    );
    expect(normalizedCosts[2]).toBeLessThanOrEqual((normalizedCosts[0] ?? 0) + 2);
    expect(samples[2]?.visitedEntries).toBeLessThan((samples[1]?.visitedEntries ?? 0) * 7);
  });
});

describe('transaction shape compatibility', () => {
  it('accepts a readonly public transaction without private fields', () => {
    const transaction: WorkbenchProjectionTransaction<FieldRemapProjectionOperation> = {
      id: 'sample',
      projectionId: 'field-remap-flow',
      baseRevision: 'revision',
      operations: [upsertOtherEdge()],
    };
    expect(Object.keys(transaction).sort()).toEqual([
      'baseRevision',
      'id',
      'operations',
      'projectionId',
    ]);
  });
});
