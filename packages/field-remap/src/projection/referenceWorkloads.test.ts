import { describe, expect, it, vi } from 'vitest';
import {
  buildFieldRemapReferenceFixture,
  FIELD_REMAP_REFERENCE_WORKLOADS,
  FieldRemapReferenceWorkloadError,
  runFieldRemapReferenceWorkload,
  runFieldRemapReferenceWorkloadWithOwnerFactory,
  type FieldRemapReferenceOwnerFactory,
  type FieldRemapReferenceRunEvidence,
  type FieldRemapReferenceWorkloadErrorCode,
  type FieldRemapReferenceWorkloadId,
} from '../../test-support/reference-workloads.js';
import {
  createFieldRemapProjectionOwner,
  type FieldRemapProjectionOwner,
  type FieldRemapTraversalSample,
} from './serializedOwner.js';
import type { FieldRemapDocument } from '../domain/types.js';

const sourceRevision = '0123456789abcdef0123456789abcdef01234567';
const evidence: FieldRemapReferenceRunEvidence = {
  sourceRevision,
  environment: 'node-22:windows',
  tool: 'vitest-3.2.4',
};
const smallWorkloadId = 'field-remap.projection.small';

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return;
  }
  const object = value as object;
  if (seen.has(object)) {
    return;
  }
  seen.add(object);
  expect(Object.isFrozen(object)).toBe(true);
  for (const key of Reflect.ownKeys(object)) {
    expectDeepFrozen(Reflect.get(object, key), seen);
  }
}

async function captureWorkloadError(
  promise: Promise<unknown>,
  code: FieldRemapReferenceWorkloadErrorCode,
): Promise<FieldRemapReferenceWorkloadError> {
  let failure: unknown;
  try {
    await promise;
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(FieldRemapReferenceWorkloadError);
  expect(failure).toMatchObject({ code });
  return failure as FieldRemapReferenceWorkloadError;
}

function decorateOwner(
  owner: FieldRemapProjectionOwner,
  overrides: Partial<FieldRemapProjectionOwner>,
): FieldRemapProjectionOwner {
  return { ...owner, ...overrides };
}

describe('Field Remap reference workloads', () => {
  it('owns the exact immutable SMALL/TYPICAL/STRESS manifest', () => {
    expect(FIELD_REMAP_REFERENCE_WORKLOADS).toEqual([
      {
        id: 'field-remap.projection.small',
        size: 'SMALL',
        sourceCount: 8,
        targetCount: 8,
        edgeCount: 8,
        operatorCount: 0,
        operationCount: 1,
        aggregateEntries: 25,
      },
      {
        id: 'field-remap.projection.typical',
        size: 'TYPICAL',
        sourceCount: 100,
        targetCount: 100,
        edgeCount: 100,
        operatorCount: 0,
        operationCount: 1,
        aggregateEntries: 301,
      },
      {
        id: 'field-remap.projection.stress',
        size: 'STRESS',
        sourceCount: 600,
        targetCount: 600,
        edgeCount: 600,
        operatorCount: 0,
        operationCount: 1,
        aggregateEntries: 1801,
      },
    ]);
    expectDeepFrozen(FIELD_REMAP_REFERENCE_WORKLOADS);
  });

  it('builds fresh deeply frozen fixtures with one real edge mutation', () => {
    const first = buildFieldRemapReferenceFixture(smallWorkloadId);
    const second = buildFieldRemapReferenceFixture(smallWorkloadId);

    expect(first).not.toBe(second);
    expect(first.document).not.toBe(second.document);
    expect(first.document.edges).not.toBe(second.document.edges);
    expect(first.sources).not.toBe(second.sources);
    expect(first.targets).not.toBe(second.targets);
    expect(first.operations).not.toBe(second.operations);
    expect(first).toEqual(second);
    expectDeepFrozen(first);
    expectDeepFrozen(second);
    expect(first.document.edges[0]).toEqual({
      id: 'edge.0',
      sourceFieldId: 'source.0',
      targetSlotId: 'target.0',
    });
    expect(first.operations).toEqual([
      {
        type: 'upsert-edge',
        edge: {
          id: 'edge.0',
          sourceFieldId: 'source.7',
          targetSlotId: 'target.0',
        },
      },
    ]);
    expect(() => {
      (first.sources[0] as { label: string }).label = 'mutated';
    }).toThrow(TypeError);
    expect(second.sources[0]?.label).toBe('Source 0');
  });

  it.each(FIELD_REMAP_REFERENCE_WORKLOADS)(
    'applies the exact mutation and clears the $id owner retention',
    async (definition) => {
      const record = await runFieldRemapReferenceWorkload(definition.id, evidence);

      expect(record.structural).toMatchObject({
        workloadId: definition.id,
        dimensions: {
          sources: definition.sourceCount,
          targets: definition.targetCount,
          edges: definition.edgeCount,
          operators: 0,
          operations: 1,
          aggregateEntries: definition.aggregateEntries,
        },
        result: {
          status: 'applied',
          documentVersion: 2,
          documentEdgeCount: definition.edgeCount,
          changedEdge: {
            id: 'edge.0',
            sourceFieldId: `source.${definition.sourceCount - 1}`,
            targetSlotId: 'target.0',
          },
          historyLength: 1,
        },
        traversal: {
          size: definition.size,
          aggregateEntries: definition.aggregateEntries,
        },
        lifecycle: { retainedBeforeDispose: 1, retainedAfterDispose: 0 },
      });
      expectDeepFrozen(record);
    },
  );

  it('executes the mutation against the real owner and changes only edge.0', async () => {
    const fixture = buildFieldRemapReferenceFixture(smallWorkloadId);
    let settledDocument: FieldRemapDocument | undefined;
    let retainedBeforeDispose = -1;
    let retainedAfterDispose = -1;
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner(options);
      return decorateOwner(owner, {
        dispose: async () => {
          settledDocument = owner.getCanonicalDocument();
          retainedBeforeDispose = owner.getRetentionSize();
          await owner.dispose();
          retainedAfterDispose = owner.getRetentionSize();
        },
      });
    };

    await runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory);

    expect(settledDocument).toEqual({
      ...fixture.document,
      edges: fixture.document.edges.map((edge, index) =>
        index === 0 ? { ...edge, sourceFieldId: 'source.7' } : edge,
      ),
    });
    expect(retainedBeforeDispose).toBe(1);
    expect(retainedAfterDispose).toBe(0);
  });

  it('normalizes sequential and parallel runs without sharing evidence or fixture state', async () => {
    const evidenceA = { ...evidence, environment: 'node-22:sequential-a' };
    const evidenceB = { ...evidence, environment: 'node-22:sequential-b' };
    const sequentialA = await runFieldRemapReferenceWorkload(smallWorkloadId, evidenceA);
    const sequentialB = await runFieldRemapReferenceWorkload(smallWorkloadId, evidenceB);
    const [parallelA, parallelB] = await Promise.all([
      runFieldRemapReferenceWorkload(smallWorkloadId, {
        ...evidence,
        environment: 'node-22:parallel-a',
      }),
      runFieldRemapReferenceWorkload(smallWorkloadId, {
        ...evidence,
        environment: 'node-22:parallel-b',
      }),
    ]);

    expect(sequentialA.structural).toEqual(sequentialB.structural);
    expect(parallelA.structural).toEqual(parallelB.structural);
    expect(parallelA.structural).toEqual(sequentialA.structural);
    expect(sequentialA.structural).not.toBe(sequentialB.structural);
    expect(parallelA.structural).not.toBe(parallelB.structural);
    expect(sequentialA.evidence).toEqual(evidenceA);
    expect(sequentialB.evidence).toEqual(evidenceB);
    expect(sequentialA.evidence).not.toBe(evidenceA);
    expect(sequentialB.evidence).not.toBe(evidenceB);
    evidenceA.environment = 'node-22:changed-later';
    expect(sequentialA.evidence.environment).toBe('node-22:sequential-a');
  });

  it('accepts only exact lowercase revisions and strict public-safe evidence identifiers', async () => {
    const longestIdentifier = 'a'.repeat(64);
    await expect(
      runFieldRemapReferenceWorkload(smallWorkloadId, {
        sourceRevision: 'a'.repeat(40),
        environment: longestIdentifier,
        tool: 'tool._:-09',
      }),
    ).resolves.toMatchObject({
      evidence: {
        sourceRevision: 'a'.repeat(40),
        environment: longestIdentifier,
        tool: 'tool._:-09',
      },
    });

    const invalidEvidence: readonly FieldRemapReferenceRunEvidence[] = [
      { ...evidence, sourceRevision: 'a'.repeat(39) },
      { ...evidence, sourceRevision: 'A'.repeat(40) },
      { ...evidence, environment: '' },
      { ...evidence, environment: ' node-22' },
      { ...evidence, environment: 'node/windows' },
      { ...evidence, environment: 'a'.repeat(65) },
      { ...evidence, tool: 'vitest 3' },
    ];
    for (const invalid of invalidEvidence) {
      await captureWorkloadError(
        runFieldRemapReferenceWorkload(smallWorkloadId, invalid),
        'invalid-evidence',
      );
    }
  });

  it('rejects unknown workloads and invalid evidence before calling the owner factory', async () => {
    const ownerFactory = vi.fn<FieldRemapReferenceOwnerFactory>();

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(
        'field-remap.projection.unknown' as FieldRemapReferenceWorkloadId,
        evidence,
        ownerFactory,
      ),
      'unknown-workload',
    );
    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(
        smallWorkloadId,
        { ...evidence, tool: 'invalid tool' },
        ownerFactory,
      ),
      'invalid-evidence',
    );
    expect(ownerFactory).not.toHaveBeenCalled();
  });

  it('maps malformed, non-string, and accessor evidence to invalid-evidence before admission', async () => {
    const throwingEvidence = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(throwingEvidence, {
      sourceRevision: {
        enumerable: true,
        get: () => {
          throw new Error('evidence getter must not escape');
        },
      },
      environment: { enumerable: true, value: evidence.environment },
      tool: { enumerable: true, value: evidence.tool },
    });
    const malformedEvidence: readonly unknown[] = [
      null,
      undefined,
      42,
      'evidence',
      {},
      { ...evidence, sourceRevision: 40 },
      { ...evidence, environment: false },
      { ...evidence, tool: ['vitest'] },
      throwingEvidence,
    ];
    const ownerFactory = vi.fn<FieldRemapReferenceOwnerFactory>();

    for (const malformed of malformedEvidence) {
      await captureWorkloadError(
        runFieldRemapReferenceWorkloadWithOwnerFactory(
          smallWorkloadId,
          malformed as FieldRemapReferenceRunEvidence,
          ownerFactory,
        ),
        'invalid-evidence',
      );
    }
    expect(ownerFactory).not.toHaveBeenCalled();
  });

  it('echoes only the three validated evidence fields', async () => {
    const record = await runFieldRemapReferenceWorkload(smallWorkloadId, {
      ...evidence,
      extra: 'must-not-be-echoed',
    } as FieldRemapReferenceRunEvidence & { readonly extra: string });

    expect(record.evidence).toEqual(evidence);
    expect(Object.keys(record.evidence).sort()).toEqual(['environment', 'sourceRevision', 'tool']);
    expect(record.evidence).not.toHaveProperty('extra');
  });

  it('emits transaction-not-applied and still disposes the admitted owner', async () => {
    let disposeCalls = 0;
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner(options);
      const currentRevision = owner.port.getSnapshot().canonicalRevision;
      return decorateOwner(owner, {
        port: {
          ...owner.port,
          applyTransaction: vi.fn(async (transaction) => ({
            status: 'conflict' as const,
            transactionId: transaction.id,
            currentRevision,
            conflicts: [],
          })),
        },
        dispose: async () => {
          disposeCalls += 1;
          await owner.dispose();
        },
      });
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'transaction-not-applied',
    );
    expect(disposeCalls).toBe(1);
  });

  it('emits revision-not-changed after an applied transaction and still disposes', async () => {
    let disposeCalls = 0;
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner(options);
      const applyTransaction = owner.port.applyTransaction.bind(owner.port);
      return decorateOwner(owner, {
        port: {
          ...owner.port,
          applyTransaction: vi.fn(async (transaction) => {
            const beforeRevision = owner.port.getSnapshot().canonicalRevision;
            const result = await applyTransaction(transaction);
            return result.status === 'applied'
              ? { ...result, canonicalRevision: beforeRevision }
              : result;
          }),
        },
        dispose: async () => {
          disposeCalls += 1;
          await owner.dispose();
        },
      });
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'revision-not-changed',
    );
    expect(disposeCalls).toBe(1);
  });

  it('distinguishes missing and duplicate traversal samples and disposes both owners', async () => {
    let disposeCalls = 0;
    const missingFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner({ ...options, onTraversal: undefined });
      return decorateOwner(owner, {
        dispose: async () => {
          disposeCalls += 1;
          await owner.dispose();
        },
      });
    };
    const duplicateFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner({
        ...options,
        onTraversal: (sample) => {
          options.onTraversal?.(sample);
          options.onTraversal?.(sample);
        },
      });
      return decorateOwner(owner, {
        dispose: async () => {
          disposeCalls += 1;
          await owner.dispose();
        },
      });
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, missingFactory),
      'missing-traversal-sample',
    );
    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, duplicateFactory),
      'duplicate-traversal-sample',
    );
    expect(disposeCalls).toBe(2);
  });

  it('fails closed on a structural mismatch and still disposes the owner', async () => {
    let disposeCalls = 0;
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner({
        ...options,
        onTraversal: (sample) =>
          options.onTraversal?.({ ...sample, aggregateEntries: sample.aggregateEntries + 1 }),
      });
      return decorateOwner(owner, {
        dispose: async () => {
          disposeCalls += 1;
          await owner.dispose();
        },
      });
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'structural-mismatch',
    );
    expect(disposeCalls).toBe(1);
  });

  it.each([
    {
      name: 'document extra key',
      corrupt: (document: FieldRemapDocument) => ({ ...document, extra: true }),
    },
    {
      name: 'edge extra key',
      corrupt: (document: FieldRemapDocument) => ({
        ...document,
        edges: document.edges.map((edge, index) => (index === 0 ? { ...edge, extra: true } : edge)),
      }),
    },
    {
      name: 'transform metadata',
      corrupt: (document: FieldRemapDocument) => ({
        ...document,
        edges: document.edges.map((edge, index) =>
          index === 0 ? { ...edge, transformIds: ['string:trim'] } : edge,
        ),
      }),
    },
    {
      name: 'item metadata',
      corrupt: (document: FieldRemapDocument) => ({
        ...document,
        edges: document.edges.map((edge, index) =>
          index === 0 ? { ...edge, itemSourcePath: 'name' } : edge,
        ),
      }),
    },
  ])('rejects canonical $name as structural-mismatch', async ({ corrupt }) => {
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner(options);
      return decorateOwner(owner, {
        getCanonicalDocument: () => corrupt(owner.getCanonicalDocument()),
      });
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'structural-mismatch',
    );
  });

  it.each([
    {
      name: 'missing stage',
      corrupt: (sample: FieldRemapTraversalSample) => {
        const { freeze: _freeze, ...stages } = sample.stages;
        return {
          ...sample,
          stages,
          visitedEntries: Object.values(stages).reduce((sum, count) => sum + count, 0),
        } as FieldRemapTraversalSample;
      },
    },
    {
      name: 'extra stage',
      corrupt: (sample: FieldRemapTraversalSample) => ({
        ...sample,
        stages: { ...sample.stages, extra: 1 },
        visitedEntries: sample.visitedEntries + 1,
      }),
    },
    {
      name: 'non-finite stage',
      corrupt: (sample: FieldRemapTraversalSample) => ({
        ...sample,
        stages: { ...sample.stages, freeze: Number.POSITIVE_INFINITY },
        visitedEntries: Number.POSITIVE_INFINITY,
      }),
    },
    {
      name: 'fractional stage',
      corrupt: (sample: FieldRemapTraversalSample) => ({
        ...sample,
        stages: { ...sample.stages, freeze: 1.5 },
        visitedEntries: sample.visitedEntries - sample.stages.freeze + 1.5,
      }),
    },
    {
      name: 'non-finite visitedEntries',
      corrupt: (sample: FieldRemapTraversalSample) => ({
        ...sample,
        visitedEntries: Number.NaN,
      }),
    },
    {
      name: 'fractional visitedEntries',
      corrupt: (sample: FieldRemapTraversalSample) => ({ ...sample, visitedEntries: 1.5 }),
    },
  ])('rejects traversal with $name as structural-mismatch', async ({ corrupt }) => {
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner({
        ...options,
        onTraversal: (sample) => options.onTraversal?.(corrupt(sample)),
      });
      return owner;
    };

    await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'structural-mismatch',
    );
  });

  it('reports a disposal throw as dispose-failed after successful execution', async () => {
    const disposeCause = new Error('injected disposal failure');
    const dispose = vi.fn(async () => {
      throw disposeCause;
    });
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) =>
      decorateOwner(createFieldRemapProjectionOwner(options), { dispose });

    const failure = await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'dispose-failed',
    );
    expect(failure.primary).toBeUndefined();
    expect(failure.disposeCause).toBe(disposeCause);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('reports non-zero post-disposal retention as dispose-failed', async () => {
    let disposed = false;
    let postDisposeSamples = 0;
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) => {
      const owner = createFieldRemapProjectionOwner(options);
      return decorateOwner(owner, {
        getRetentionSize: () => {
          if (!disposed) {
            return owner.getRetentionSize();
          }
          postDisposeSamples += 1;
          return 1;
        },
        dispose: async () => {
          await owner.dispose();
          disposed = true;
        },
      });
    };

    const failure = await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'dispose-failed',
    );
    expect(failure.disposeCause).toEqual({ retainedAfterDispose: 1 });
    expectDeepFrozen(failure.disposeCause);
    expect(postDisposeSamples).toBe(1);
  });

  it.each([
    {
      name: 'rejects undefined',
      createDispose: () => () => Promise.reject<void>(undefined),
    },
    {
      name: 'throws undefined',
      createDispose: () => () => {
        throw undefined;
      },
    },
  ])('maps a dispose that $name to explicit disposal failures', async ({ createDispose }) => {
    const disposalOnlyFactory: FieldRemapReferenceOwnerFactory = (options) =>
      decorateOwner(createFieldRemapProjectionOwner(options), {
        dispose: createDispose(),
      });
    const combinedFactory: FieldRemapReferenceOwnerFactory = (options) =>
      decorateOwner(createFieldRemapProjectionOwner({ ...options, onTraversal: undefined }), {
        dispose: createDispose(),
      });

    const disposalOnly = await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(
        smallWorkloadId,
        evidence,
        disposalOnlyFactory,
      ),
      'dispose-failed',
    );
    expect(disposalOnly.primary).toBeUndefined();
    expect(disposalOnly.disposeCause).toBeUndefined();

    const combined = await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, combinedFactory),
      'run-and-dispose-failed',
    );
    expect(combined.primary).toMatchObject({ code: 'missing-traversal-sample' });
    expect(combined.disposeCause).toBeUndefined();
  });

  it('gives combined execution and disposal failure explicit precedence', async () => {
    const disposeCause = new Error('injected combined disposal failure');
    const dispose = vi.fn(async () => {
      throw disposeCause;
    });
    const ownerFactory: FieldRemapReferenceOwnerFactory = (options) =>
      decorateOwner(createFieldRemapProjectionOwner({ ...options, onTraversal: undefined }), {
        dispose,
      });

    const failure = await captureWorkloadError(
      runFieldRemapReferenceWorkloadWithOwnerFactory(smallWorkloadId, evidence, ownerFactory),
      'run-and-dispose-failed',
    );
    expect(failure.primary).toMatchObject({ code: 'missing-traversal-sample' });
    expect(failure.disposeCause).toBe(disposeCause);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
