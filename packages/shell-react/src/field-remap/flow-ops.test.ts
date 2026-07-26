import { describe, expect, it } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/field-remap';

import {
  addTransformStepToEdge,
  canEditListContext,
  listCompatibleTransforms,
  setTransformStepIdOnEdge,
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
});
