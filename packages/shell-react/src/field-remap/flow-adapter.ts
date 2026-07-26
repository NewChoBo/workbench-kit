import type { Edge, Node } from '@xyflow/react';
import {
  arePortsCompatible,
  findSourceField,
  findTargetSlot,
  flattenSourceFields,
  flattenTargetSlots,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

export type FieldRemapFlowNodeKind =
  | 'source-object'
  | 'target-object'
  | 'transform'
  | 'draft-transform';

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
  /** Set by the Flow host when this step is selected in the detail panel. */
  selected?: boolean;
} & Record<string, unknown>;

export type FieldRemapDraftTransformNodeData = {
  kind: 'draft-transform';
  localId: string;
  transformId: string;
  label: string;
  sourceFieldId?: string;
  targetSlotId?: string;
} & Record<string, unknown>;

export type FieldRemapFlowNodeData =
  | FieldRemapSourceObjectNodeData
  | FieldRemapTargetObjectNodeData
  | FieldRemapTransformNodeData
  | FieldRemapDraftTransformNodeData;

export type FieldRemapFlowEdgeData = {
  mappingEdgeId?: string;
  draftLocalId?: string;
  segment: 'in' | 'mid' | 'out' | 'direct' | 'draft-in' | 'draft-out';
} & Record<string, unknown>;

export const SOURCE_OBJECT_NODE_ID = 'obj:source' as const;
export const TARGET_OBJECT_NODE_ID = 'obj:target' as const;
export const DRAFT_NODE_PREFIX = 'draft:' as const;

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

export function draftTransformNodeId(localId: string): string {
  return `${DRAFT_NODE_PREFIX}${localId}`;
}

export function parseDraftTransformNodeId(nodeId: string): string | undefined {
  if (!nodeId.startsWith(DRAFT_NODE_PREFIX)) {
    return undefined;
  }
  return nodeId.slice(DRAFT_NODE_PREFIX.length);
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
  /** Ephemeral place-then-wire drafts (not persisted). */
  readonly drafts?: readonly {
    readonly localId: string;
    readonly transformId: string;
    readonly sourceFieldId?: string;
    readonly targetSlotId?: string;
  }[];
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

  (input.drafts ?? []).forEach((draft, draftIndex) => {
    const definition = input.transforms.get(draft.transformId);
    const nodeId = draftTransformNodeId(draft.localId);
    nodes.push({
      id: nodeId,
      type: 'fieldRemapDraftTransform',
      position: {
        x: TRANSFORM_X,
        y: 40 + (input.edges.length + draftIndex) * TRANSFORM_ROW_GAP,
      },
      data: {
        kind: 'draft-transform',
        localId: draft.localId,
        transformId: draft.transformId,
        label: definition?.label ?? draft.transformId,
        sourceFieldId: draft.sourceFieldId,
        targetSlotId: draft.targetSlotId,
      },
      draggable: true,
    });

    if (draft.sourceFieldId) {
      flowEdges.push({
        id: `fe:draft:${draft.localId}:in`,
        source: SOURCE_OBJECT_NODE_ID,
        sourceHandle: portHandleId(draft.sourceFieldId),
        target: nodeId,
        targetHandle: 'in',
        type: 'smoothstep',
        data: { draftLocalId: draft.localId, segment: 'draft-in' },
      });
    }
    if (draft.targetSlotId) {
      flowEdges.push({
        id: `fe:draft:${draft.localId}:out`,
        source: nodeId,
        sourceHandle: 'out',
        target: TARGET_OBJECT_NODE_ID,
        targetHandle: portHandleId(draft.targetSlotId),
        type: 'smoothstep',
        data: { draftLocalId: draft.localId, segment: 'draft-out' },
      });
    }
  });

  return { nodes, edges: flowEdges };
}

/**
 * Optional field/slot lookup for type-gated connects.
 * When omitted, only the topology allowlist is applied (tests / callers without shapes).
 */
export type IsValidFieldRemapFlowConnectionContext = {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
};

function resolveConnectionPortIds(connection: {
  readonly source: string | null | undefined;
  readonly target: string | null | undefined;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
}): { sourceFieldId?: string; targetSlotId?: string } {
  const source = connection.source;
  const target = connection.target;
  if (!source || !target) {
    return {};
  }

  let sourceFieldId: string | undefined;
  let targetSlotId: string | undefined;

  if (source === SOURCE_OBJECT_NODE_ID && connection.sourceHandle) {
    sourceFieldId = connection.sourceHandle;
  } else if (source.startsWith('src:')) {
    sourceFieldId = source.slice('src:'.length);
  }

  if (target === TARGET_OBJECT_NODE_ID && connection.targetHandle) {
    targetSlotId = connection.targetHandle;
  } else if (target.startsWith('tgt:')) {
    targetSlotId = target.slice('tgt:'.length);
  }

  return { sourceFieldId, targetSlotId };
}

/**
 * Supported connect matrix for state-changing canvas drags:
 * - source-object port → target-object port (creates / replaces a `MappingEdge`)
 * - legacy `src:*` → `tgt:*` single-field node ids (tests / older graphs)
 * - source-object port → `draft:*` (bind draft input)
 * - `draft:*` → target-object port (bind draft output; finalize when both ends set)
 *
 * Persisted transform (`xf:*`) endpoints remain invalid connect targets until
 * splice/append wiring lands (avoids silent no-ops).
 *
 * When `context` is provided, topology-ok connects are further gated by
 * {@link arePortsCompatible}: missing/`unknown` types stay permissive; known
 * mismatches (including transform-mediated chains on an existing target edge)
 * are rejected.
 */
export function isValidFieldRemapFlowConnection(
  connection: {
    readonly source: string | null | undefined;
    readonly target: string | null | undefined;
    readonly sourceHandle?: string | null;
    readonly targetHandle?: string | null;
  },
  context?: IsValidFieldRemapFlowConnectionContext & {
    readonly drafts?: readonly {
      readonly localId: string;
      readonly transformId: string;
      readonly sourceFieldId?: string;
      readonly targetSlotId?: string;
    }[];
  },
): boolean {
  const source = connection.source;
  const target = connection.target;
  if (!source || !target) {
    return false;
  }

  const draftTargetId = parseDraftTransformNodeId(target);
  const draftSourceId = parseDraftTransformNodeId(source);

  if (source === SOURCE_OBJECT_NODE_ID && draftTargetId && connection.sourceHandle) {
    if (!context) {
      return true;
    }
    const draft = context.drafts?.find((item) => item.localId === draftTargetId);
    if (!draft) {
      return false;
    }
    const sourceField = findSourceField(context.sources, connection.sourceHandle);
    return arePortsCompatible({
      sourceType: sourceField?.dataType,
      targetType: 'unknown',
      transformIds: [draft.transformId],
      registry: context.transforms,
    });
  }

  if (draftSourceId && target === TARGET_OBJECT_NODE_ID && connection.targetHandle) {
    if (!context) {
      return true;
    }
    const draft = context.drafts?.find((item) => item.localId === draftSourceId);
    if (!draft) {
      return false;
    }
    const sourceType = draft.sourceFieldId
      ? findSourceField(context.sources, draft.sourceFieldId)?.dataType
      : undefined;
    const targetSlot = findTargetSlot(context.targets, connection.targetHandle);
    return arePortsCompatible({
      sourceType,
      targetType: targetSlot?.dataType,
      transformIds: [draft.transformId],
      registry: context.transforms,
    });
  }

  let topologyOk = false;
  if (source === SOURCE_OBJECT_NODE_ID && target === TARGET_OBJECT_NODE_ID) {
    topologyOk = Boolean(connection.sourceHandle && connection.targetHandle);
  } else if (source.startsWith('src:') && target.startsWith('tgt:')) {
    // Legacy single-field node ids (older graphs / tests).
    topologyOk = true;
  }

  if (!topologyOk) {
    return false;
  }

  if (!context) {
    return true;
  }

  const { sourceFieldId, targetSlotId } = resolveConnectionPortIds(connection);
  if (!sourceFieldId || !targetSlotId) {
    return false;
  }

  const sourceField = findSourceField(context.sources, sourceFieldId);
  const targetSlot = findTargetSlot(context.targets, targetSlotId);
  const existing = context.edges.find((edge) => edge.targetSlotId === targetSlotId);

  return arePortsCompatible({
    sourceType: sourceField?.dataType,
    targetType: targetSlot?.dataType,
    transformIds: existing?.transformIds,
    registry: context.transforms,
  });
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
