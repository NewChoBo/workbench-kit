import { describe, expect, it } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/field-remap';

import {
  applyFieldRemapFlowConnection,
  connectionToMappingEdge,
  draftTransformNodeId,
  isValidFieldRemapFlowConnection,
  mappingToFlowGraph,
  parseTransformNodeId,
  SOURCE_OBJECT_NODE_ID,
  TARGET_OBJECT_NODE_ID,
  transformNodeId,
} from './flow-adapter.js';

describe('field-remap-flow-adapter', () => {
  const sources = sourceFieldsFromPlainObject(
    { user_name: 'Ada', tags: [{ name: 'a' }] },
    { idPrefix: 'a' },
  );
  const targets = targetSlotsFromPlainObject(
    { name: '', title: '', firstTag: '' },
    { idPrefix: 'b' },
  );
  const transforms = createBuiltinValueTransformRegistry();

  it('builds one multi-port source and target object with handle-linked edges', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-title',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.title',
        transformIds: ['string:trim', 'string:upper'],
      },
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
      },
    ];

    const graph = mappingToFlowGraph({
      sources,
      targets,
      edges,
      transforms,
      sourceTitle: 'A',
      targetTitle: 'B',
    });

    const sourceNode = graph.nodes.find((node) => node.id === SOURCE_OBJECT_NODE_ID);
    const targetNode = graph.nodes.find((node) => node.id === TARGET_OBJECT_NODE_ID);
    expect(sourceNode?.type).toBe('fieldRemapSourceObject');
    expect(targetNode?.type).toBe('fieldRemapTargetObject');
    expect(
      sourceNode?.data.kind === 'source-object' && sourceNode.data.ports.length,
    ).toBeGreaterThan(1);
    expect(
      targetNode?.data.kind === 'target-object' && targetNode.data.ports.length,
    ).toBeGreaterThan(1);

    expect(graph.nodes.some((node) => node.id === transformNodeId('e-title', 0))).toBe(true);
    expect(graph.nodes.some((node) => node.id === transformNodeId('e-title', 1))).toBe(true);

    const direct = graph.edges.find((edge) => edge.id === 'fe:e-name:direct');
    expect(direct?.source).toBe(SOURCE_OBJECT_NODE_ID);
    expect(direct?.sourceHandle).toBe('a.user_name');
    expect(direct?.target).toBe(TARGET_OBJECT_NODE_ID);
    expect(direct?.targetHandle).toBe('b.name');

    const inbound = graph.edges.find((edge) => edge.id === 'fe:e-title:in');
    expect(inbound?.sourceHandle).toBe('a.user_name');
    expect(inbound?.target).toBe(transformNodeId('e-title', 0));
  });

  it('creates a mapping edge from object port handles (fan-out friendly)', () => {
    const edge = connectionToMappingEdge({
      sourceNodeId: SOURCE_OBJECT_NODE_ID,
      targetNodeId: TARGET_OBJECT_NODE_ID,
      sourceHandle: 'a.user_name',
      targetHandle: 'b.name',
      existing: [],
    });
    expect(edge?.sourceFieldId).toBe('a.user_name');
    expect(edge?.targetSlotId).toBe('b.name');
  });

  it('allows object↔object connects and rejects incomplete handles', () => {
    expect(
      isValidFieldRemapFlowConnection({
        source: SOURCE_OBJECT_NODE_ID,
        target: TARGET_OBJECT_NODE_ID,
        sourceHandle: 'a.user_name',
        targetHandle: 'b.name',
      }),
    ).toBe(true);

    expect(
      isValidFieldRemapFlowConnection({
        source: SOURCE_OBJECT_NODE_ID,
        target: TARGET_OBJECT_NODE_ID,
        sourceHandle: 'a.user_name',
        targetHandle: null,
      }),
    ).toBe(false);

    expect(parseTransformNodeId(transformNodeId('e-title', 1))).toEqual({
      mappingEdgeId: 'e-title',
      stepIndex: 1,
    });
  });

  it('splices / appends persisted xf connects into MappingEdge updates', () => {
    const edges: MappingEdge[] = [
      {
        id: 'e-title',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.title',
        transformIds: ['string:trim', 'string:upper'],
      },
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:lower'],
      },
    ];
    const context = { sources, targets, edges, transforms };
    const xf0 = transformNodeId('e-title', 0);
    const xf1 = transformNodeId('e-title', 1);
    const xfName = transformNodeId('e-name', 0);

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: xf1,
          sourceHandle: 'a.user_name',
        },
        context,
      ),
    ).toBe(true);
    expect(
      applyFieldRemapFlowConnection({
        sourceNodeId: SOURCE_OBJECT_NODE_ID,
        targetNodeId: xf1,
        sourceHandle: 'a.user_name',
        existing: edges,
      }),
    ).toEqual({
      edge: {
        id: 'e-title',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.title',
        transformIds: ['string:upper'],
        transformOptionSteps: undefined,
      },
    });

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: xf0,
          target: TARGET_OBJECT_NODE_ID,
          targetHandle: 'b.firstTag',
        },
        context,
      ),
    ).toBe(true);
    expect(
      applyFieldRemapFlowConnection({
        sourceNodeId: xf0,
        targetNodeId: TARGET_OBJECT_NODE_ID,
        targetHandle: 'b.firstTag',
        existing: edges,
      }),
    ).toEqual({
      edge: {
        id: 'e-title',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.firstTag',
        transformIds: ['string:trim'],
        transformOptionSteps: undefined,
      },
    });

    // Same-edge xf↔xf stays blocked (already materialized as mid segments).
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: xf0,
          target: xf1,
        },
        context,
      ),
    ).toBe(false);

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: xf1,
          target: xfName,
        },
        context,
      ),
    ).toBe(true);
    expect(
      applyFieldRemapFlowConnection({
        sourceNodeId: xf1,
        targetNodeId: xfName,
        existing: edges,
      }),
    ).toEqual({
      edge: {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:trim', 'string:upper', 'string:lower'],
        transformOptionSteps: undefined,
        itemSourcePath: undefined,
        itemEdges: undefined,
        itemTransformIds: undefined,
        itemTransformOptionSteps: undefined,
        itemTransformOptions: undefined,
      },
      removeEdgeIds: ['e-title'],
    });

    // Object→xf without an existing edge still cannot materialize a new chain.
    expect(
      connectionToMappingEdge({
        sourceNodeId: SOURCE_OBJECT_NODE_ID,
        targetNodeId: xf0,
        sourceHandle: 'a.user_name',
        targetHandle: 'in',
        existing: [],
      }),
    ).toBeNull();
    expect(
      applyFieldRemapFlowConnection({
        sourceNodeId: SOURCE_OBJECT_NODE_ID,
        targetNodeId: xf0,
        sourceHandle: 'a.user_name',
        existing: [],
      }),
    ).toBeNull();
  });

  it('gates object↔object connects by FieldDataType via arePortsCompatible', () => {
    const typedSources = [
      { id: 'src.name', label: 'name', dataType: 'string' as const },
      { id: 'src.tags', label: 'tags', dataType: 'array' as const },
      { id: 'src.mystery', label: 'mystery', dataType: 'unknown' as const },
      { id: 'src.loose', label: 'loose' },
    ];
    const typedTargets = [
      { id: 'tgt.name', label: 'name', dataType: 'string' as const },
      { id: 'tgt.count', label: 'count', dataType: 'number' as const },
      { id: 'tgt.maybe', label: 'maybe', dataType: 'unknown' as const },
    ];
    const baseContext = {
      sources: typedSources,
      targets: typedTargets,
      edges: [] as MappingEdge[],
      transforms,
    };

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.name',
          targetHandle: 'tgt.name',
        },
        baseContext,
      ),
    ).toBe(true);

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.name',
          targetHandle: 'tgt.count',
        },
        baseContext,
      ),
    ).toBe(false);

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.mystery',
          targetHandle: 'tgt.count',
        },
        baseContext,
      ),
    ).toBe(true);
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.name',
          targetHandle: 'tgt.maybe',
        },
        baseContext,
      ),
    ).toBe(true);
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.loose',
          targetHandle: 'tgt.count',
        },
        baseContext,
      ),
    ).toBe(true);

    // Replacing a binding keeps the target's existing transformIds for the type gate.
    const withArrayJoin: MappingEdge[] = [
      {
        id: 'e-tags',
        sourceFieldId: 'src.tags',
        targetSlotId: 'tgt.name',
        transformIds: ['array:join'],
      },
    ];
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.tags',
          targetHandle: 'tgt.name',
        },
        { ...baseContext, edges: withArrayJoin },
      ),
    ).toBe(true);
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: TARGET_OBJECT_NODE_ID,
          sourceHandle: 'src.name',
          targetHandle: 'tgt.name',
        },
        { ...baseContext, edges: withArrayJoin },
      ),
    ).toBe(false);
  });

  it('allows source/target wiring through draft transform nodes', () => {
    const drafts = [{ localId: 'd1', transformId: 'string:trim' }];
    const draftId = draftTransformNodeId('d1');
    const context = { sources, targets, edges: [] as MappingEdge[], transforms, drafts };

    const graph = mappingToFlowGraph({
      sources,
      targets,
      edges: [],
      transforms,
      drafts,
    });
    expect(graph.nodes.some((node) => node.id === draftId)).toBe(true);

    expect(
      isValidFieldRemapFlowConnection(
        {
          source: SOURCE_OBJECT_NODE_ID,
          target: draftId,
          sourceHandle: 'a.user_name',
        },
        context,
      ),
    ).toBe(true);
    expect(
      isValidFieldRemapFlowConnection(
        {
          source: draftId,
          target: TARGET_OBJECT_NODE_ID,
          targetHandle: 'b.name',
        },
        {
          ...context,
          drafts: [{ localId: 'd1', transformId: 'string:trim', sourceFieldId: 'a.user_name' }],
        },
      ),
    ).toBe(true);
  });
});
