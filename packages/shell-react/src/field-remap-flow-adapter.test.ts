import { describe, expect, it } from 'vitest';
import {
  createBuiltinValueTransformRegistry,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
  type MappingEdge,
} from '@workbench-kit/schema-mapper';

import {
  connectionToMappingEdge,
  mappingToFlowGraph,
  SOURCE_OBJECT_NODE_ID,
  TARGET_OBJECT_NODE_ID,
  transformNodeId,
} from './field-remap-flow-adapter.js';

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
});
