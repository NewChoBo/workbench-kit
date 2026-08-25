import { describe, expect, it } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/field-remap';

import {
  addTransformStepToEdge,
  bindDraftSource,
  bindDraftTarget,
  bindOperatorInput,
  bindOperatorOutput,
  canEditListContext,
  createCombineOperator,
  createDraftTransform,
  createSplitOperator,
  finalizeDraftTransform,
  listFieldRemapBulkSelectionRefs,
  listCompatibleTransforms,
  normalizeFieldRemapBulkSelection,
  planFieldRemapBulkDelete,
  removeMappingOperator,
  setTransformStepIdOnEdge,
  updateFieldRemapBulkSelection,
  upsertItemEdgeOnParent,
} from './flow-ops.js';

describe('field-remap flow-ops', () => {
  const registry = createBuiltinValueTransformRegistry();
  const sources = sourceFieldsFromPlainObject(
    {
      user_name: 'Ada',
      tags: [{ name: 'math', rank: 1 }],
    },
    { idPrefix: 'a' },
  );
  const targets = targetSlotsFromPlainObject(
    {
      name: '',
      title: '',
      labels: [{ title: '', order: 0 }],
      firstTag: '',
    },
    { idPrefix: 'b' },
  );

  it('appends a compatible transform and rejects incompatible picks', () => {
    const edge: MappingEdge = {
      id: 'e-name',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.name',
    };

    const withTrim = addTransformStepToEdge(edge, 'string:trim', {
      registry,
      sourceType: 'string',
      targetType: 'string',
    });
    expect(withTrim?.transformIds).toEqual(['string:trim']);

    const withArrayJoin = addTransformStepToEdge(edge, 'array:join', {
      registry,
      sourceType: 'string',
      targetType: 'string',
    });
    expect(withArrayJoin).toBeNull();
  });

  it('changes step id and migrates only matching option keys', () => {
    const edge: MappingEdge = {
      id: 'e-title',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.title',
      transformIds: ['string:prefix'],
      transformOptionSteps: [{ value: 'Hi ', junk: true }],
    };

    const next = setTransformStepIdOnEdge(edge, 0, 'string:suffix', {
      registry,
      sourceType: 'string',
      targetType: 'string',
    });
    expect(next?.transformIds).toEqual(['string:suffix']);
    // `value` is also valid on string:suffix — keep it; drop unknown keys.
    expect(next?.transformOptionSteps?.[0]).toEqual({ value: 'Hi ' });

    const cleared = setTransformStepIdOnEdge(
      {
        ...edge,
        transformIds: ['string:prefix'],
        transformOptionSteps: [{ template: 'x' }],
      },
      0,
      'string:upper',
      {
        registry,
        sourceType: 'string',
        targetType: 'string',
      },
    );
    expect(cleared?.transformIds).toEqual(['string:upper']);
    expect(cleared?.transformOptionSteps?.[0]).toBeUndefined();
  });

  it('lists compatible palette transforms for append', () => {
    const edge: MappingEdge = {
      id: 'e-first',
      sourceFieldId: 'a.tags',
      targetSlotId: 'b.firstTag',
    };
    const catalog = listCompatibleTransforms({
      registry,
      edge,
      stepIndex: 0,
      sourceType: 'array',
      targetType: 'string',
      mode: 'append',
    });
    expect(catalog.some((item) => item.id === 'array:first')).toBe(true);
    expect(catalog.some((item) => item.id === 'string:trim')).toBe(false);
  });

  it('supports list-context enable + item edge upsert', () => {
    const edge: MappingEdge = {
      id: 'e-tags',
      sourceFieldId: 'a.tags',
      targetSlotId: 'b.labels',
    };
    expect(canEditListContext(edge, sources, targets)).toBe(true);

    const withChild = upsertItemEdgeOnParent(edge, {
      id: 'ie-1',
      sourceFieldId: 'a.tags.item.name',
      targetSlotId: 'b.labels.item.title',
    });
    expect(withChild.itemEdges).toHaveLength(1);

    const replaced = upsertItemEdgeOnParent(withChild, {
      id: 'ie-2',
      sourceFieldId: 'a.tags.item.rank',
      targetSlotId: 'b.labels.item.title',
    });
    expect(replaced.itemEdges).toHaveLength(1);
    expect(replaced.itemEdges?.[0]?.sourceFieldId).toBe('a.tags.item.rank');
  });

  it('finalizes place-then-wire drafts when both ports are bound', () => {
    const draft = createDraftTransform('string:trim');
    expect(finalizeDraftTransform(draft, { registry, sources, targets, existing: [] })).toBeNull();

    const wired = bindDraftTarget(bindDraftSource(draft, 'a.user_name'), 'b.name');
    const edge = finalizeDraftTransform(wired, { registry, sources, targets, existing: [] });
    expect(edge).toMatchObject({
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.name',
      transformIds: ['string:trim'],
    });

    expect(
      finalizeDraftTransform(bindDraftTarget(bindDraftSource(draft, 'a.tags'), 'b.name'), {
        registry,
        sources,
        targets,
        existing: [],
      }),
    ).toBeNull();
  });

  it('authors combine/split operators with create/wire/delete helpers', () => {
    const combine = bindOperatorOutput(
      bindOperatorInput(bindOperatorInput(createCombineOperator(), 'a.user_name'), 'a.tags'),
      'b.name',
    );
    expect(combine).toMatchObject({
      kind: 'combine',
      inputFieldIds: ['a.user_name', 'a.tags'],
      outputSlotId: 'b.name',
    });
    const split = bindOperatorOutput(
      bindOperatorOutput(bindOperatorInput(createSplitOperator(), 'a.tags'), 'b.name'),
      'b.labels',
    );
    expect(removeMappingOperator([combine, split], combine.id)).toEqual([split]);
  });

  it('uses edge order then ascending transform steps as the only membership order', () => {
    const edges: readonly MappingEdge[] = [
      {
        id: 'e-b',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        transformIds: ['array:first', 'string:trim'],
      },
      { id: 'e-a', sourceFieldId: 'a.user_name', targetSlotId: 'b.name' },
    ];

    expect(listFieldRemapBulkSelectionRefs(edges)).toEqual([
      { kind: 'edge', edgeId: 'e-b' },
      { kind: 'transformStep', edgeId: 'e-b', stepIndex: 0 },
      { kind: 'transformStep', edgeId: 'e-b', stepIndex: 1 },
      { kind: 'edge', edgeId: 'e-a' },
    ]);
    expect(
      normalizeFieldRemapBulkSelection(edges, [
        { kind: 'edge', edgeId: 'e-a' },
        { kind: 'transformStep', edgeId: 'e-b', stepIndex: 1 },
        { kind: 'edge', edgeId: 'e-a' },
        { kind: 'edge', edgeId: 'stale' },
      ]),
    ).toEqual([
      { kind: 'transformStep', edgeId: 'e-b', stepIndex: 1 },
      { kind: 'edge', edgeId: 'e-a' },
    ]);
  });

  it('keeps the primary anchored across additive and toggle gestures', () => {
    const edges: readonly MappingEdge[] = [
      { id: 'e-a', sourceFieldId: 'a.user_name', targetSlotId: 'b.name' },
      { id: 'e-b', sourceFieldId: 'a.user_name', targetSlotId: 'b.title' },
    ];
    const primary = { kind: 'edge', edgeId: 'e-a' } as const;
    const added = updateFieldRemapBulkSelection({
      edges,
      membership: [primary],
      primary,
      target: { kind: 'edge', edgeId: 'e-b' },
      gesture: 'add',
    });
    expect(added).toEqual({
      membership: [primary, { kind: 'edge', edgeId: 'e-b' }],
      primary,
    });

    const toggledOut = updateFieldRemapBulkSelection({
      edges,
      membership: added.membership,
      primary,
      target: { kind: 'edge', edgeId: 'e-b' },
      gesture: 'toggle',
    });
    expect(toggledOut).toEqual({ membership: [primary], primary });
    expect(
      updateFieldRemapBulkSelection({
        edges,
        membership: toggledOut.membership,
        primary,
        target: primary,
        gesture: 'toggle',
      }),
    ).toEqual({ membership: [primary], primary });
  });

  it('treats a stale primary gesture as a fresh canonical singleton', () => {
    const edges: readonly MappingEdge[] = [
      { id: 'e-a', sourceFieldId: 'a.user_name', targetSlotId: 'b.name' },
    ];
    expect(
      updateFieldRemapBulkSelection({
        edges,
        membership: [{ kind: 'edge', edgeId: 'stale' }],
        primary: { kind: 'edge', edgeId: 'stale' },
        target: { kind: 'edge', edgeId: 'e-a' },
        gesture: 'add',
      }),
    ).toEqual({
      membership: [{ kind: 'edge', edgeId: 'e-a' }],
      primary: { kind: 'edge', edgeId: 'e-a' },
    });
  });

  it('plans overlap and descending original-index removal as one immutable result', () => {
    const edgeA: MappingEdge = {
      id: 'e-a',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.name',
      transformIds: ['string:trim', 'string:upper', 'string:suffix'],
      transformOptionSteps: [undefined, undefined, { value: '!' }],
    };
    const edgeB: MappingEdge = {
      id: 'e-b',
      sourceFieldId: 'a.tags',
      targetSlotId: 'b.labels',
      transformIds: ['array:first'],
    };
    const edgeC: MappingEdge = {
      id: 'e-c',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.title',
    };

    const plan = planFieldRemapBulkDelete(
      [edgeA, edgeB, edgeC],
      [
        { kind: 'transformStep', edgeId: 'e-a', stepIndex: 2 },
        { kind: 'transformStep', edgeId: 'e-a', stepIndex: 0 },
        { kind: 'edge', edgeId: 'e-b' },
        { kind: 'transformStep', edgeId: 'e-b', stepIndex: 0 },
      ],
    );
    expect(plan.status).toBe('changed');
    if (plan.status !== 'changed') {
      return;
    }
    expect(plan.edges).toEqual([
      { ...edgeA, transformIds: ['string:upper'], transformOptionSteps: undefined },
      edgeC,
    ]);
    expect(plan.edges[1]).toBe(edgeC);
    expect(edgeA.transformIds).toEqual(['string:trim', 'string:upper', 'string:suffix']);
  });

  it('retains an edge when every step is removed and rejects any stale member atomically', () => {
    const edge: MappingEdge = {
      id: 'e-a',
      sourceFieldId: 'a.user_name',
      targetSlotId: 'b.name',
      transformIds: ['string:trim'],
      transformOptionSteps: [{ value: 'ignored' }],
    };
    expect(
      planFieldRemapBulkDelete([edge], [{ kind: 'transformStep', edgeId: 'e-a', stepIndex: 0 }]),
    ).toEqual({
      status: 'changed',
      edges: [{ ...edge, transformIds: undefined, transformOptionSteps: undefined }],
    });
    expect(
      planFieldRemapBulkDelete(
        [edge],
        [
          { kind: 'transformStep', edgeId: 'e-a', stepIndex: 0 },
          { kind: 'edge', edgeId: 'stale' },
        ],
      ),
    ).toEqual({ status: 'invalid' });
    expect(
      planFieldRemapBulkDelete([edge], [{ kind: 'transformStep', edgeId: 'e-a', stepIndex: 0.5 }]),
    ).toEqual({ status: 'invalid' });
    expect(
      planFieldRemapBulkDelete(
        [edge],
        [{ kind: 'transformStep', edgeId: 'e-a', stepIndex: Number.NaN }],
      ),
    ).toEqual({ status: 'invalid' });
  });
});
