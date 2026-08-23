import type { Edge, Node } from '@xyflow/react';
import {
  MAX_TRANSFORM_CHAIN,
  arePortsCompatible,
  findSourceField,
  findTargetSlot,
  flattenSourceFields,
  flattenTargetSlots,
  resizeOptionSteps,
  type MappingEdge,
  type MappingOperator,
  type SourceField,
  type TargetSlot,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

export type FieldRemapPort = {
  fieldId: string;
  label: string;
  dataType?: string;
};

/** XYFlow requires node/edge `data` to extend `Record<string, unknown>`. */
export type FieldRemapSourceObjectNodeData = {
  kind: 'source-object';
  title: string;
  /** Short role label under the schema title (e.g. "Source schema"). */
  schemaRole?: string;
  ports: FieldRemapPort[];
} & Record<string, unknown>;

export type FieldRemapTargetObjectNodeData = {
  kind: 'target-object';
  title: string;
  /** Short role label under the schema title (e.g. "Target schema"). */
  schemaRole?: string;
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

export type FieldRemapCombineOperatorNodeData = {
  kind: 'combine-operator';
  operatorId: string;
  label: string;
  inputFieldIds: readonly string[];
  outputSlotId: string;
} & Record<string, unknown>;

export type FieldRemapSplitOperatorNodeData = {
  kind: 'split-operator';
  operatorId: string;
  label: string;
  inputFieldId: string;
  outputSlotIds: readonly string[];
} & Record<string, unknown>;

export type FieldRemapFlowNodeData =
  | FieldRemapSourceObjectNodeData
  | FieldRemapTargetObjectNodeData
  | FieldRemapTransformNodeData
  | FieldRemapDraftTransformNodeData
  | FieldRemapCombineOperatorNodeData
  | FieldRemapSplitOperatorNodeData;

export type FieldRemapFlowEdgeData = {
  mappingEdgeId?: string;
  draftLocalId?: string;
  operatorId?: string;
  segment:
    'in' | 'mid' | 'out' | 'direct' | 'draft-in' | 'draft-out' | 'operator-in' | 'operator-out';
} & Record<string, unknown>;

export const SOURCE_OBJECT_NODE_ID = 'obj:source' as const;
export const TARGET_OBJECT_NODE_ID = 'obj:target' as const;
export const DRAFT_NODE_PREFIX = 'draft:' as const;
export const OPERATOR_NODE_PREFIX = 'op:' as const;

const SOURCE_X = 24;
const TRANSFORM_X = 320;
const TARGET_X = 620;
const TRANSFORM_ROW_GAP = 72;

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

export function operatorNodeId(operatorId: string): string {
  return `${OPERATOR_NODE_PREFIX}${operatorId}`;
}

export function parseDraftTransformNodeId(nodeId: string): string | undefined {
  if (!nodeId.startsWith(DRAFT_NODE_PREFIX)) {
    return undefined;
  }
  return nodeId.slice(DRAFT_NODE_PREFIX.length);
}

export function parseOperatorNodeId(nodeId: string): string | undefined {
  if (!nodeId.startsWith(OPERATOR_NODE_PREFIX)) {
    return undefined;
  }
  return nodeId.slice(OPERATOR_NODE_PREFIX.length);
}

/** Parse a persisted transform node id (`xf:<edgeId>:<stepIndex>`). */
export function parseTransformNodeId(
  nodeId: string,
): { mappingEdgeId: string; stepIndex: number } | undefined {
  if (!nodeId.startsWith('xf:')) {
    return undefined;
  }
  const rest = nodeId.slice('xf:'.length);
  const lastColon = rest.lastIndexOf(':');
  if (lastColon <= 0) {
    return undefined;
  }
  const mappingEdgeId = rest.slice(0, lastColon);
  const stepIndex = Number(rest.slice(lastColon + 1));
  if (!mappingEdgeId || !Number.isInteger(stepIndex) || stepIndex < 0) {
    return undefined;
  }
  return { mappingEdgeId, stepIndex };
}

function sliceEdgeTransformChain(
  edge: MappingEdge,
  fromInclusive: number,
  toExclusive: number,
): Pick<MappingEdge, 'transformIds' | 'transformOptionSteps'> {
  const current = edge.transformIds ?? [];
  const ids = current.slice(fromInclusive, toExclusive);
  const steps = edge.transformOptionSteps?.slice(fromInclusive, toExclusive);
  return {
    transformIds: ids.length > 0 ? ids : undefined,
    transformOptionSteps: resizeOptionSteps(steps, ids.length),
  };
}

function fieldLabel(field: SourceField | TargetSlot): string {
  return field.path ?? field.label;
}

/**
 * Array item-schema fields (`*.item.*`) belong in list-context editors, not the
 * main A/B schema columns (BINDINGS-style topology).
 */
export function isSchemaColumnFieldId(fieldId: string): boolean {
  return !fieldId.includes('.item.');
}

function toSchemaColumnPorts(fields: readonly (SourceField | TargetSlot)[]): FieldRemapPort[] {
  return fields
    .filter((field) => isSchemaColumnFieldId(field.id))
    .map((field) => ({
      fieldId: field.id,
      label: fieldLabel(field),
      dataType: field.dataType,
    }));
}

/**
 * Build React Flow nodes/edges from kit shapes + MappingEdge[].
 * Layout: one multi-port source schema, optional convert (xf) nodes, one multi-port
 * target schema — wires are MappingEdge segments (document stays edges-only).
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
  /** Document v2 n→m operators (display / multi-port Flow nodes). */
  readonly operators?: readonly MappingOperator[];
}): { nodes: Node<FieldRemapFlowNodeData>[]; edges: Edge<FieldRemapFlowEdgeData>[] } {
  const sourcePorts = toSchemaColumnPorts(flattenSourceFields(input.sources));
  const targetPorts = toSchemaColumnPorts(flattenTargetSlots(input.targets));

  const nodes: Node<FieldRemapFlowNodeData>[] = [
    {
      id: SOURCE_OBJECT_NODE_ID,
      type: 'fieldRemapSourceObject',
      position: { x: SOURCE_X, y: 24 },
      data: {
        kind: 'source-object',
        title: input.sourceTitle?.trim() || 'A',
        schemaRole: 'Source schema',
        ports: sourcePorts,
      },
    },
    {
      id: TARGET_OBJECT_NODE_ID,
      type: 'fieldRemapTargetObject',
      position: { x: TARGET_X, y: 24 },
      data: {
        kind: 'target-object',
        title: input.targetTitle?.trim() || 'B',
        schemaRole: 'Target schema',
        ports: targetPorts,
      },
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

  const operatorBaseY = 40 + (input.edges.length + (input.drafts?.length ?? 0)) * TRANSFORM_ROW_GAP;

  (input.operators ?? []).forEach((operator, operatorIndex) => {
    const nodeId = operatorNodeId(operator.id);
    const y = operatorBaseY + operatorIndex * TRANSFORM_ROW_GAP;

    if (operator.kind === 'combine') {
      nodes.push({
        id: nodeId,
        type: 'fieldRemapCombineOperator',
        position: { x: TRANSFORM_X, y },
        data: {
          kind: 'combine-operator',
          operatorId: operator.id,
          label: 'Combine',
          inputFieldIds: operator.inputFieldIds,
          outputSlotId: operator.outputSlotId,
        },
      });
      for (const fieldId of operator.inputFieldIds) {
        flowEdges.push({
          id: `fe:op:${operator.id}:in:${fieldId}`,
          source: SOURCE_OBJECT_NODE_ID,
          sourceHandle: portHandleId(fieldId),
          target: nodeId,
          targetHandle: portHandleId(fieldId),
          type: 'smoothstep',
          data: { operatorId: operator.id, segment: 'operator-in' },
        });
      }
      if (operator.outputSlotId) {
        flowEdges.push({
          id: `fe:op:${operator.id}:out`,
          source: nodeId,
          sourceHandle: 'out',
          target: TARGET_OBJECT_NODE_ID,
          targetHandle: portHandleId(operator.outputSlotId),
          type: 'smoothstep',
          data: { operatorId: operator.id, segment: 'operator-out' },
        });
      }
      return;
    }

    nodes.push({
      id: nodeId,
      type: 'fieldRemapSplitOperator',
      position: { x: TRANSFORM_X, y },
      data: {
        kind: 'split-operator',
        operatorId: operator.id,
        label: 'Split',
        inputFieldId: operator.inputFieldId,
        outputSlotIds: operator.outputSlotIds,
      },
    });
    if (operator.inputFieldId) {
      flowEdges.push({
        id: `fe:op:${operator.id}:in`,
        source: SOURCE_OBJECT_NODE_ID,
        sourceHandle: portHandleId(operator.inputFieldId),
        target: nodeId,
        targetHandle: 'in',
        type: 'smoothstep',
        data: { operatorId: operator.id, segment: 'operator-in' },
      });
    }
    for (const slotId of operator.outputSlotIds) {
      flowEdges.push({
        id: `fe:op:${operator.id}:out:${slotId}`,
        source: nodeId,
        sourceHandle: portHandleId(slotId),
        target: TARGET_OBJECT_NODE_ID,
        targetHandle: portHandleId(slotId),
        type: 'smoothstep',
        data: { operatorId: operator.id, segment: 'operator-out' },
      });
    }
  });

  return { nodes, edges: flowEdges };
}

/**
 * Optional field/slot lookup for type-gated connects.
 * When omitted, only the topology allowlist is applied (tests / callers without shapes).
 */
export type FieldRemapFlowConnectionInput = {
  readonly source: string | null | undefined;
  readonly target: string | null | undefined;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
};

export type IsValidFieldRemapFlowConnectionContext = {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly transforms: ValueTransformRegistry;
  readonly drafts?: readonly {
    readonly localId: string;
    readonly transformId: string;
    readonly sourceFieldId?: string;
    readonly targetSlotId?: string;
  }[];
};

export type FieldRemapFlowConnectionRejectionReason =
  | 'incomplete-connection'
  | 'unsupported-topology'
  | 'missing-port-endpoint'
  | 'missing-draft-endpoint'
  | 'missing-transform-edge'
  | 'missing-transform-step'
  | 'missing-transform-definition'
  | 'same-edge-transform-splice'
  | 'transform-chain-limit'
  | 'incompatible-port-types';

export type FieldRemapFlowConnectionEvaluation =
  | { readonly status: 'accepted' }
  | { readonly status: 'rewire'; readonly impactedEdgeIds: readonly string[] }
  | {
      readonly status: 'rejected';
      readonly reason: FieldRemapFlowConnectionRejectionReason;
    };

const acceptedConnection = { status: 'accepted' } as const;

function rejectConnection(
  reason: FieldRemapFlowConnectionRejectionReason,
): FieldRemapFlowConnectionEvaluation {
  return { status: 'rejected', reason };
}

function acceptOrRewire(impactedEdgeIds: readonly string[]): FieldRemapFlowConnectionEvaluation {
  return impactedEdgeIds.length > 0 ? { status: 'rewire', impactedEdgeIds } : acceptedConnection;
}

function evaluatePortCompatibility(
  context: Pick<IsValidFieldRemapFlowConnectionContext, 'transforms'>,
  sourceType: SourceField['dataType'],
  targetType: TargetSlot['dataType'],
  transformIds: readonly string[],
): FieldRemapFlowConnectionEvaluation | undefined {
  if (!transformIds.every((transformId) => context.transforms.get(transformId) !== undefined)) {
    return rejectConnection('missing-transform-definition');
  }
  return arePortsCompatible({ sourceType, targetType, transformIds, registry: context.transforms })
    ? undefined
    : rejectConnection('incompatible-port-types');
}

function targetRewireEdgeIds(
  edges: readonly MappingEdge[],
  targetSlotId: string,
  excludedEdgeId?: string,
): string[] {
  return edges
    .filter((edge) => edge.targetSlotId === targetSlotId && edge.id !== excludedEdgeId)
    .map((edge) => edge.id);
}

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

  return {
    sourceFieldId:
      source === SOURCE_OBJECT_NODE_ID && connection.sourceHandle
        ? connection.sourceHandle
        : undefined,
    targetSlotId:
      target === TARGET_OBJECT_NODE_ID && connection.targetHandle
        ? connection.targetHandle
        : undefined,
  };
}

/**
 * Supported connect matrix for state-changing canvas drags:
 * - source-object port → target-object port (creates / replaces a `MappingEdge`)
 * - source-object port → `draft:*` (bind draft input)
 * - `draft:*` → target-object port (bind draft output; finalize when both ends set)
 * - source-object port → `xf:*` `in` (rebind source; splice off earlier steps)
 * - `xf:*` `out` → target-object port (rebind target; splice off later steps)
 * - `xf:*` `out` → `xf:*` `in` on a different edge (append / merge chains)
 *
 * Invalid topologies are rejected here so `onConnect` never silently no-ops.
 *
 * When `context` is provided, topology-ok connects are further gated by
 * {@link arePortsCompatible}: missing/`unknown` types stay permissive; known
 * mismatches (including transform-mediated chains on an existing target edge)
 * are rejected.
 */
export function evaluateFieldRemapFlowConnection(
  connection: FieldRemapFlowConnectionInput,
  context?: IsValidFieldRemapFlowConnectionContext,
): FieldRemapFlowConnectionEvaluation {
  const source = connection.source;
  const target = connection.target;
  if (!source || !target) {
    return rejectConnection('incomplete-connection');
  }

  const draftTargetId = parseDraftTransformNodeId(target);
  const draftSourceId = parseDraftTransformNodeId(source);

  if (source === SOURCE_OBJECT_NODE_ID && draftTargetId && connection.sourceHandle) {
    if (!context) {
      return acceptedConnection;
    }
    const draft = context.drafts?.find((item) => item.localId === draftTargetId);
    if (!draft) {
      return rejectConnection('missing-draft-endpoint');
    }
    const sourceField = findSourceField(context.sources, connection.sourceHandle);
    if (!sourceField) {
      return rejectConnection('missing-port-endpoint');
    }
    const targetSlot = draft.targetSlotId
      ? findTargetSlot(context.targets, draft.targetSlotId)
      : undefined;
    if (draft.targetSlotId && !targetSlot) {
      return rejectConnection('missing-draft-endpoint');
    }
    const rejection = evaluatePortCompatibility(
      context,
      sourceField.dataType,
      targetSlot?.dataType ?? 'unknown',
      [draft.transformId],
    );
    if (rejection) {
      return rejection;
    }
    return acceptOrRewire(
      draft.targetSlotId ? targetRewireEdgeIds(context.edges, draft.targetSlotId) : [],
    );
  }

  if (source === SOURCE_OBJECT_NODE_ID && draftTargetId) {
    return rejectConnection('incomplete-connection');
  }

  if (draftSourceId && target === TARGET_OBJECT_NODE_ID && connection.targetHandle) {
    if (!context) {
      return acceptedConnection;
    }
    const draft = context.drafts?.find((item) => item.localId === draftSourceId);
    if (!draft) {
      return rejectConnection('missing-draft-endpoint');
    }
    const targetSlot = findTargetSlot(context.targets, connection.targetHandle);
    if (!targetSlot) {
      return rejectConnection('missing-port-endpoint');
    }
    const sourceField = draft.sourceFieldId
      ? findSourceField(context.sources, draft.sourceFieldId)
      : undefined;
    if (draft.sourceFieldId && !sourceField) {
      return rejectConnection('missing-draft-endpoint');
    }
    const rejection = evaluatePortCompatibility(
      context,
      sourceField?.dataType,
      targetSlot.dataType,
      [draft.transformId],
    );
    if (rejection) {
      return rejection;
    }
    return acceptOrRewire(targetRewireEdgeIds(context.edges, connection.targetHandle));
  }

  if (draftSourceId && target === TARGET_OBJECT_NODE_ID) {
    return rejectConnection('incomplete-connection');
  }

  const xfTarget = parseTransformNodeId(target);
  const xfSource = parseTransformNodeId(source);

  if (source === SOURCE_OBJECT_NODE_ID && xfTarget && connection.sourceHandle) {
    if (!context) {
      return acceptedConnection;
    }
    const edge = context.edges.find((item) => item.id === xfTarget.mappingEdgeId);
    if (!edge) {
      return rejectConnection('missing-transform-edge');
    }
    const chain = edge.transformIds ?? [];
    if (xfTarget.stepIndex >= chain.length) {
      return rejectConnection('missing-transform-step');
    }
    const sourceField = findSourceField(context.sources, connection.sourceHandle);
    const targetSlot = findTargetSlot(context.targets, edge.targetSlotId);
    if (!sourceField || !targetSlot) {
      return rejectConnection('missing-port-endpoint');
    }
    const retainedChain = chain.slice(xfTarget.stepIndex);
    return (
      evaluatePortCompatibility(
        context,
        sourceField.dataType,
        targetSlot.dataType,
        retainedChain,
      ) ?? acceptedConnection
    );
  }

  if (source === SOURCE_OBJECT_NODE_ID && xfTarget) {
    return rejectConnection('incomplete-connection');
  }

  if (xfSource && target === TARGET_OBJECT_NODE_ID && connection.targetHandle) {
    if (!context) {
      return acceptedConnection;
    }
    const edge = context.edges.find((item) => item.id === xfSource.mappingEdgeId);
    if (!edge) {
      return rejectConnection('missing-transform-edge');
    }
    const chain = edge.transformIds ?? [];
    if (xfSource.stepIndex >= chain.length) {
      return rejectConnection('missing-transform-step');
    }
    const sourceField = findSourceField(context.sources, edge.sourceFieldId);
    const targetSlot = findTargetSlot(context.targets, connection.targetHandle);
    if (!sourceField || !targetSlot) {
      return rejectConnection('missing-port-endpoint');
    }
    const retainedChain = chain.slice(0, xfSource.stepIndex + 1);
    const rejection = evaluatePortCompatibility(
      context,
      sourceField.dataType,
      targetSlot.dataType,
      retainedChain,
    );
    if (rejection) {
      return rejection;
    }
    return acceptOrRewire(targetRewireEdgeIds(context.edges, connection.targetHandle, edge.id));
  }

  if (xfSource && target === TARGET_OBJECT_NODE_ID) {
    return rejectConnection('incomplete-connection');
  }

  if (xfSource && xfTarget) {
    if (xfSource.mappingEdgeId === xfTarget.mappingEdgeId) {
      return rejectConnection('same-edge-transform-splice');
    }
    if (!context) {
      return acceptedConnection;
    }
    const edgeA = context.edges.find((item) => item.id === xfSource.mappingEdgeId);
    const edgeB = context.edges.find((item) => item.id === xfTarget.mappingEdgeId);
    if (!edgeA || !edgeB) {
      return rejectConnection('missing-transform-edge');
    }
    const chainA = edgeA.transformIds ?? [];
    const chainB = edgeB.transformIds ?? [];
    if (xfSource.stepIndex >= chainA.length || xfTarget.stepIndex >= chainB.length) {
      return rejectConnection('missing-transform-step');
    }
    const merged = [
      ...chainA.slice(0, xfSource.stepIndex + 1),
      ...chainB.slice(xfTarget.stepIndex),
    ];
    if (merged.length === 0 || merged.length > MAX_TRANSFORM_CHAIN) {
      return rejectConnection('transform-chain-limit');
    }
    const sourceField = findSourceField(context.sources, edgeA.sourceFieldId);
    const targetSlot = findTargetSlot(context.targets, edgeB.targetSlotId);
    if (!sourceField || !targetSlot) {
      return rejectConnection('missing-port-endpoint');
    }
    const rejection = evaluatePortCompatibility(
      context,
      sourceField.dataType,
      targetSlot.dataType,
      merged,
    );
    if (rejection) {
      return rejection;
    }
    return acceptOrRewire([edgeA.id]);
  }

  const topologyOk =
    source === SOURCE_OBJECT_NODE_ID &&
    target === TARGET_OBJECT_NODE_ID &&
    Boolean(connection.sourceHandle && connection.targetHandle);

  if (!topologyOk) {
    return source === SOURCE_OBJECT_NODE_ID && target === TARGET_OBJECT_NODE_ID
      ? rejectConnection('incomplete-connection')
      : rejectConnection('unsupported-topology');
  }

  if (!context) {
    return acceptedConnection;
  }

  const { sourceFieldId, targetSlotId } = resolveConnectionPortIds(connection);
  if (!sourceFieldId || !targetSlotId) {
    return rejectConnection('incomplete-connection');
  }

  const sourceField = findSourceField(context.sources, sourceFieldId);
  const targetSlot = findTargetSlot(context.targets, targetSlotId);
  if (!sourceField || !targetSlot) {
    return rejectConnection('missing-port-endpoint');
  }
  const existing = context.edges.find((edge) => edge.targetSlotId === targetSlotId);
  const retainedChain = existing?.transformIds ?? [];
  const rejection = evaluatePortCompatibility(
    context,
    sourceField.dataType,
    targetSlot.dataType,
    retainedChain,
  );
  if (rejection) {
    return rejection;
  }
  return acceptOrRewire(targetRewireEdgeIds(context.edges, targetSlotId));
}

export function isValidFieldRemapFlowConnection(
  connection: FieldRemapFlowConnectionInput,
  context?: IsValidFieldRemapFlowConnectionContext,
): boolean {
  return evaluateFieldRemapFlowConnection(connection, context).status !== 'rejected';
}

/** Result of a persisted (non-draft) Flow connect that updates mapping edges. */
export type FieldRemapFlowConnectResult = {
  readonly edge: MappingEdge;
  /** Donor edge removed when appending / merging two xf chains. */
  readonly removeEdgeIds?: readonly string[];
};

/** Parse a React Flow object-port connection into a kit MappingEdge. */
export function connectionToMappingEdge(input: {
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
  readonly existing: readonly MappingEdge[];
}): MappingEdge | null {
  const { sourceFieldId, targetSlotId } = resolveConnectionPortIds({
    source: input.sourceNodeId,
    target: input.targetNodeId,
    sourceHandle: input.sourceHandle,
    targetHandle: input.targetHandle,
  });

  if (!sourceFieldId || !targetSlotId) {
    return null;
  }

  const existing = input.existing.find((edge) => edge.targetSlotId === targetSlotId);
  if (existing) {
    return { ...existing, sourceFieldId, targetSlotId };
  }
  return {
    id: `e-${sourceFieldId}-${targetSlotId}-${Date.now()}`,
    sourceFieldId,
    targetSlotId,
  };
}

/**
 * Materialize a persisted Flow connection into an edge upsert (and optional removals).
 * Covers object↔object, source→xf splice, xf→target splice, and xf→xf append/merge.
 * Draft binds stay in the Flow host (`onConnect`).
 */
export function applyFieldRemapFlowConnection(input: {
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
  readonly existing: readonly MappingEdge[];
}): FieldRemapFlowConnectResult | null {
  const xfTarget = parseTransformNodeId(input.targetNodeId);
  const xfSource = parseTransformNodeId(input.sourceNodeId);

  if (input.sourceNodeId === SOURCE_OBJECT_NODE_ID && xfTarget && input.sourceHandle) {
    const edge = input.existing.find((item) => item.id === xfTarget.mappingEdgeId);
    if (!edge) {
      return null;
    }
    const chain = edge.transformIds ?? [];
    if (xfTarget.stepIndex >= chain.length) {
      return null;
    }
    const sliced = sliceEdgeTransformChain(edge, xfTarget.stepIndex, chain.length);
    return {
      edge: {
        ...edge,
        sourceFieldId: input.sourceHandle,
        ...sliced,
      },
    };
  }

  if (xfSource && input.targetNodeId === TARGET_OBJECT_NODE_ID && input.targetHandle) {
    const edge = input.existing.find((item) => item.id === xfSource.mappingEdgeId);
    if (!edge) {
      return null;
    }
    const chain = edge.transformIds ?? [];
    if (xfSource.stepIndex >= chain.length) {
      return null;
    }
    const sliced = sliceEdgeTransformChain(edge, 0, xfSource.stepIndex + 1);
    return {
      edge: {
        ...edge,
        targetSlotId: input.targetHandle,
        ...sliced,
      },
    };
  }

  if (xfSource && xfTarget) {
    if (xfSource.mappingEdgeId === xfTarget.mappingEdgeId) {
      return null;
    }
    const edgeA = input.existing.find((item) => item.id === xfSource.mappingEdgeId);
    const edgeB = input.existing.find((item) => item.id === xfTarget.mappingEdgeId);
    if (!edgeA || !edgeB) {
      return null;
    }
    const chainA = edgeA.transformIds ?? [];
    const chainB = edgeB.transformIds ?? [];
    if (xfSource.stepIndex >= chainA.length || xfTarget.stepIndex >= chainB.length) {
      return null;
    }
    const prefix = sliceEdgeTransformChain(edgeA, 0, xfSource.stepIndex + 1);
    const suffix = sliceEdgeTransformChain(edgeB, xfTarget.stepIndex, chainB.length);
    const mergedIds = [...(prefix.transformIds ?? []), ...(suffix.transformIds ?? [])];
    if (mergedIds.length === 0 || mergedIds.length > MAX_TRANSFORM_CHAIN) {
      return null;
    }
    const mergedSteps = [
      ...(prefix.transformOptionSteps ?? Array.from({ length: prefix.transformIds?.length ?? 0 })),
      ...(suffix.transformOptionSteps ?? Array.from({ length: suffix.transformIds?.length ?? 0 })),
    ];
    return {
      edge: {
        ...edgeB,
        sourceFieldId: edgeA.sourceFieldId,
        targetSlotId: edgeB.targetSlotId,
        transformIds: mergedIds,
        transformOptionSteps: resizeOptionSteps(mergedSteps, mergedIds.length),
        // Drop list-context from a merge; hosts re-enable via the detail panel.
        itemSourcePath: undefined,
        itemEdges: undefined,
        itemTransformIds: undefined,
        itemTransformOptionSteps: undefined,
      },
      removeEdgeIds: [edgeA.id],
    };
  }

  const edge = connectionToMappingEdge(input);
  return edge ? { edge } : null;
}
