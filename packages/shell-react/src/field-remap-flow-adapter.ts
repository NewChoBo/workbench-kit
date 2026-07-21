import type { Edge, Node } from '@xyflow/react';
import {
  flattenSourceFields,
  flattenTargetSlots,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

export type FieldRemapFlowNodeKind = 'source-object' | 'target-object' | 'transform';

export type FieldRemapPort = {
  fieldId: string;
  label: string;
  dataType?: string;
};

/** XYFlow requires node/edge `data` to extend `Record<string, unknown>`. */
export type FieldRemapSourceObjectNodeData = {
  kind: 'source-object';
  title: string;
  ports: FieldRemapPort[];
} & Record<string, unknown>;

export type FieldRemapTargetObjectNodeData = {
  kind: 'target-object';
  title: string;
  ports: FieldRemapPort[];
} & Record<string, unknown>;

export type FieldRemapTransformNodeData = {
  kind: 'transform';
  mappingEdgeId: string;
  stepIndex: number;
  transformId: string;
  label: string;
} & Record<string, unknown>;

export type FieldRemapFlowNodeData =
  FieldRemapSourceObjectNodeData | FieldRemapTargetObjectNodeData | FieldRemapTransformNodeData;

export type FieldRemapFlowEdgeData = {
  mappingEdgeId: string;
  segment: 'in' | 'mid' | 'out' | 'direct';
} & Record<string, unknown>;

export const SOURCE_OBJECT_NODE_ID = 'obj:source' as const;
export const TARGET_OBJECT_NODE_ID = 'obj:target' as const;

const SOURCE_X = 24;
const TRANSFORM_X = 320;
const TARGET_X = 620;
const TRANSFORM_ROW_GAP = 72;

export function sourceObjectNodeId(): string {
  return SOURCE_OBJECT_NODE_ID;
}

export function targetObjectNodeId(): string {
  return TARGET_OBJECT_NODE_ID;
}

/** Handle id for a field/slot port on an object node. */
export function portHandleId(fieldOrSlotId: string): string {
  return fieldOrSlotId;
}

export function transformNodeId(mappingEdgeId: string, stepIndex: number): string {
  return `xf:${mappingEdgeId}:${stepIndex}`;
}

function fieldLabel(field: SourceField | TargetSlot): string {
  return field.path ?? field.label;
}

function toPorts(fields: readonly (SourceField | TargetSlot)[]): FieldRemapPort[] {
  return fields.map((field) => ({
    fieldId: field.id,
    label: fieldLabel(field),
    dataType: field.dataType,
  }));
}

/**
 * Build React Flow nodes/edges from kit shapes + MappingEdge[].
 * Layout: one multi-port source object, transform chain, one multi-port target object.
 */
export function mappingToFlowGraph(input: {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
  readonly sourceTitle?: string;
  readonly targetTitle?: string;
}): { nodes: Node<FieldRemapFlowNodeData>[]; edges: Edge<FieldRemapFlowEdgeData>[] } {
  const sourcePorts = toPorts(flattenSourceFields(input.sources));
  const targetPorts = toPorts(flattenTargetSlots(input.targets));

  const nodes: Node<FieldRemapFlowNodeData>[] = [
    {
      id: SOURCE_OBJECT_NODE_ID,
      type: 'fieldRemapSourceObject',
      position: { x: SOURCE_X, y: 24 },
      data: {
        kind: 'source-object',
        title: input.sourceTitle?.trim() || 'Source',
        ports: sourcePorts,
      },
      draggable: true,
    },
    {
      id: TARGET_OBJECT_NODE_ID,
      type: 'fieldRemapTargetObject',
      position: { x: TARGET_X, y: 24 },
      data: {
        kind: 'target-object',
        title: input.targetTitle?.trim() || 'Target',
        ports: targetPorts,
      },
      draggable: true,
    },
  ];

  const flowEdges: Edge<FieldRemapFlowEdgeData>[] = [];

  input.edges.forEach((edge, edgeIndex) => {
    const chain = edge.transformIds ?? [];
    const baseY = 40 + edgeIndex * TRANSFORM_ROW_GAP;

    if (chain.length === 0) {
      flowEdges.push({
        id: `fe:${edge.id}:direct`,
        source: SOURCE_OBJECT_NODE_ID,
        sourceHandle: portHandleId(edge.sourceFieldId),
        target: TARGET_OBJECT_NODE_ID,
        targetHandle: portHandleId(edge.targetSlotId),
        type: 'smoothstep',
        data: { mappingEdgeId: edge.id, segment: 'direct' },
      });
      return;
    }

    chain.forEach((transformId, stepIndex) => {
      const definition = input.transforms.get(transformId);
      nodes.push({
        id: transformNodeId(edge.id, stepIndex),
        type: 'fieldRemapTransform',
        position: {
          x: TRANSFORM_X + stepIndex * 36,
          y: baseY + stepIndex * 48,
        },
        data: {
          kind: 'transform',
          mappingEdgeId: edge.id,
          stepIndex,
          transformId,
          label: definition?.label ?? transformId,
        },
        draggable: true,
      });
    });

    flowEdges.push({
      id: `fe:${edge.id}:in`,
      source: SOURCE_OBJECT_NODE_ID,
      sourceHandle: portHandleId(edge.sourceFieldId),
      target: transformNodeId(edge.id, 0),
      targetHandle: 'in',
      type: 'smoothstep',
      data: { mappingEdgeId: edge.id, segment: 'in' },
    });

    for (let stepIndex = 0; stepIndex < chain.length - 1; stepIndex += 1) {
      flowEdges.push({
        id: `fe:${edge.id}:mid:${stepIndex}`,
        source: transformNodeId(edge.id, stepIndex),
        sourceHandle: 'out',
        target: transformNodeId(edge.id, stepIndex + 1),
        targetHandle: 'in',
        type: 'smoothstep',
        data: { mappingEdgeId: edge.id, segment: 'mid' },
      });
    }

    flowEdges.push({
      id: `fe:${edge.id}:out`,
      source: transformNodeId(edge.id, chain.length - 1),
      sourceHandle: 'out',
      target: TARGET_OBJECT_NODE_ID,
      targetHandle: portHandleId(edge.targetSlotId),
      type: 'smoothstep',
      data: { mappingEdgeId: edge.id, segment: 'out' },
    });
  });

  return { nodes, edges: flowEdges };
}

/** Parse React Flow connection (object ports or legacy) into a kit MappingEdge. */
export function connectionToMappingEdge(input: {
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
  readonly existing: readonly MappingEdge[];
}): MappingEdge | null {
  let sourceFieldId: string | undefined;
  let targetSlotId: string | undefined;

  if (input.sourceNodeId === SOURCE_OBJECT_NODE_ID && input.sourceHandle) {
    sourceFieldId = input.sourceHandle;
  } else if (input.sourceNodeId.startsWith('src:')) {
    // Legacy single-field node ids (older graphs / tests).
    sourceFieldId = input.sourceNodeId.slice('src:'.length);
  }

  if (input.targetNodeId === TARGET_OBJECT_NODE_ID && input.targetHandle) {
    targetSlotId = input.targetHandle;
  } else if (input.targetNodeId.startsWith('tgt:')) {
    targetSlotId = input.targetNodeId.slice('tgt:'.length);
  }

  if (!sourceFieldId || !targetSlotId) {
    return null;
  }

  const existing = input.existing.find((edge) => edge.targetSlotId === targetSlotId);
  return {
    id: existing?.id ?? `e-${sourceFieldId}-${targetSlotId}-${Date.now()}`,
    sourceFieldId,
    targetSlotId,
    ...(existing?.transformIds ? { transformIds: existing.transformIds } : {}),
    ...(existing?.transformOptionSteps
      ? { transformOptionSteps: existing.transformOptionSteps }
      : {}),
    ...(existing?.itemSourcePath ? { itemSourcePath: existing.itemSourcePath } : {}),
    ...(existing?.itemEdges ? { itemEdges: existing.itemEdges } : {}),
  };
}
