import {
  MAX_TRANSFORM_CHAIN,
  arePortsCompatible,
  findSourceField,
  findTargetSlot,
  isTransformChainCompatible,
  optionFieldsForStep,
  patchOptionStep,
  resizeOptionSteps,
  sanitizeOptionRecord,
  type FieldDataType,
  type MappingEdge,
  type SourceField,
  type TargetSlot,
  type ValueTransformDefinition,
  type ValueTransformRegistry,
} from '@workbench-kit/field-remap';

/** Canvas / bindings selection for the Flow detail panel. */
export type FieldRemapSelection =
  | { readonly kind: 'edge'; readonly edgeId: string }
  | { readonly kind: 'transformStep'; readonly edgeId: string; readonly stepIndex: number }
  | null;

/**
 * Ephemeral place-then-wire transform. Not part of `FieldRemapDocument` until
 * both ports are bound and {@link finalizeDraftTransform} succeeds.
 */
export type FieldRemapDraftTransform = {
  readonly localId: string;
  readonly transformId: string;
  readonly sourceFieldId?: string;
  readonly targetSlotId?: string;
};

let draftSequence = 0;

export function createDraftTransform(transformId: string): FieldRemapDraftTransform {
  draftSequence += 1;
  return {
    localId: `d${draftSequence}-${Date.now()}`,
    transformId,
  };
}

export function bindDraftSource(
  draft: FieldRemapDraftTransform,
  sourceFieldId: string,
): FieldRemapDraftTransform {
  return { ...draft, sourceFieldId };
}

export function bindDraftTarget(
  draft: FieldRemapDraftTransform,
  targetSlotId: string,
): FieldRemapDraftTransform {
  return { ...draft, targetSlotId };
}

/**
 * Materialize a fully wired draft into a MappingEdge (single-step chain).
 * Returns null when ports are missing or the chain is type-incompatible.
 */
export function finalizeDraftTransform(
  draft: FieldRemapDraftTransform,
  context: {
    readonly registry: ValueTransformRegistry;
    readonly sources: readonly SourceField[];
    readonly targets: readonly TargetSlot[];
    readonly existing: readonly MappingEdge[];
  },
): MappingEdge | null {
  if (!draft.sourceFieldId || !draft.targetSlotId) {
    return null;
  }
  const sourceType = findSourceField(context.sources, draft.sourceFieldId)?.dataType;
  const targetType = findTargetSlot(context.targets, draft.targetSlotId)?.dataType;
  if (
    !arePortsCompatible({
      sourceType,
      targetType,
      transformIds: [draft.transformId],
      registry: context.registry,
    })
  ) {
    return null;
  }
  const existing = context.existing.find((edge) => edge.targetSlotId === draft.targetSlotId);
  return {
    id: existing?.id ?? `e-${draft.sourceFieldId}-${draft.targetSlotId}-${Date.now()}`,
    sourceFieldId: draft.sourceFieldId,
    targetSlotId: draft.targetSlotId,
    transformIds: [draft.transformId],
  };
}

export function updateMappingEdge(
  edges: readonly MappingEdge[],
  edgeId: string,
  updater: (edge: MappingEdge) => MappingEdge,
): readonly MappingEdge[] {
  return edges.map((edge) => (edge.id === edgeId ? updater(edge) : edge));
}

function migrateStepOptions(
  previous: Readonly<Record<string, unknown>> | undefined,
  nextTransformId: string,
  registry: ValueTransformRegistry,
): Readonly<Record<string, unknown>> | undefined {
  if (!previous) {
    return undefined;
  }
  const allowed = new Set(optionFieldsForStep(registry, nextTransformId).map((field) => field.key));
  if (allowed.size === 0) {
    return undefined;
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(previous)) {
    if (allowed.has(key)) {
      next[key] = value;
    }
  }
  return sanitizeOptionRecord(next);
}

/**
 * Append a transform step to an edge. Returns `null` when the chain is full or
 * the candidate breaks type compatibility.
 */
export function addTransformStepToEdge(
  edge: MappingEdge,
  transformId: string,
  context: {
    readonly registry: ValueTransformRegistry;
    readonly sourceType?: FieldDataType;
    readonly targetType?: FieldDataType;
  },
): MappingEdge | null {
  const current = edge.transformIds ?? [];
  if (current.length >= MAX_TRANSFORM_CHAIN) {
    return null;
  }
  const nextIds = [...current, transformId];
  if (
    !isTransformChainCompatible(
      context.registry,
      nextIds,
      context.sourceType,
      context.targetType,
    )
  ) {
    return null;
  }
  return {
    ...edge,
    transformIds: nextIds,
    transformOptionSteps: resizeOptionSteps(edge.transformOptionSteps, nextIds.length),
  };
}

/**
 * Replace `transformIds[stepIndex]`. Clears / migrates that step's option bag.
 * Returns `null` when the index is invalid or the pick is incompatible.
 */
export function setTransformStepIdOnEdge(
  edge: MappingEdge,
  stepIndex: number,
  transformId: string,
  context: {
    readonly registry: ValueTransformRegistry;
    readonly sourceType?: FieldDataType;
    readonly targetType?: FieldDataType;
  },
): MappingEdge | null {
  const current = [...(edge.transformIds ?? [])];
  if (stepIndex < 0 || stepIndex >= current.length) {
    return null;
  }
  const nextIds = [...current];
  nextIds[stepIndex] = transformId;
  if (
    !isTransformChainCompatible(
      context.registry,
      nextIds,
      context.sourceType,
      context.targetType,
    )
  ) {
    return null;
  }

  const resolvedSteps = resizeOptionSteps(edge.transformOptionSteps, nextIds.length) ?? [];
  const migrated = migrateStepOptions(resolvedSteps[stepIndex], transformId, context.registry);
  const nextSteps = resolvedSteps.map((step, index) =>
    index === stepIndex ? migrated : step,
  );

  return {
    ...edge,
    transformIds: nextIds,
    transformOptionSteps: resizeOptionSteps(nextSteps, nextIds.length),
  };
}

export function removeTransformStepFromEdge(
  edge: MappingEdge,
  stepIndex: number,
): MappingEdge {
  const current = [...(edge.transformIds ?? [])];
  if (stepIndex < 0 || stepIndex >= current.length) {
    return edge;
  }
  current.splice(stepIndex, 1);
  const optionSteps = edge.transformOptionSteps ? [...edge.transformOptionSteps] : undefined;
  if (optionSteps) {
    optionSteps.splice(stepIndex, 1);
  }
  return {
    ...edge,
    transformIds: current.length > 0 ? current : undefined,
    transformOptionSteps: resizeOptionSteps(optionSteps, current.length),
  };
}

export function patchTransformStepOptionOnEdge(
  edge: MappingEdge,
  stepIndex: number,
  key: string,
  value: unknown,
): MappingEdge {
  const length = edge.transformIds?.length ?? 0;
  if (stepIndex < 0 || stepIndex >= length) {
    return edge;
  }
  return {
    ...edge,
    transformOptionSteps: patchOptionStep(
      edge.transformOptionSteps,
      length,
      stepIndex,
      key,
      value,
      edge.transformOptions,
    ),
  };
}

export function replaceTransformStepOptionsOnEdge(
  edge: MappingEdge,
  stepIndex: number,
  options: Readonly<Record<string, unknown>>,
): MappingEdge {
  const length = edge.transformIds?.length ?? 0;
  if (stepIndex < 0 || stepIndex >= length) {
    return edge;
  }
  const base = resizeOptionSteps(edge.transformOptionSteps, length) ?? Array.from({ length });
  const nextSteps = base.map((step, index) =>
    index === stepIndex ? sanitizeOptionRecord(options) : step,
  );
  return {
    ...edge,
    transformOptionSteps: resizeOptionSteps(nextSteps, length),
  };
}

/** Whether an edge may host list-context (`itemEdges`) editing. */
export function canEditListContext(
  edge: MappingEdge,
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): boolean {
  if (edge.itemEdges) {
    return true;
  }
  const source = findSourceField(sources, edge.sourceFieldId);
  const target = findTargetSlot(targets, edge.targetSlotId);
  const sourceOk = !source?.dataType || source.dataType === 'array' || source.dataType === 'unknown';
  const targetOk = !target?.dataType || target.dataType === 'array' || target.dataType === 'unknown';
  return (
    sourceOk &&
    targetOk &&
    Boolean(source?.children?.length && target?.children?.length)
  );
}

export function enableListContextOnEdge(edge: MappingEdge): MappingEdge {
  if (edge.itemEdges) {
    return edge;
  }
  return { ...edge, itemEdges: [] };
}

export function setItemEdgesOnEdge(
  edge: MappingEdge,
  itemEdges: readonly MappingEdge[],
): MappingEdge {
  return { ...edge, itemEdges: [...itemEdges] };
}

export function upsertItemEdgeOnParent(
  edge: MappingEdge,
  itemEdge: MappingEdge,
): MappingEdge {
  const current = edge.itemEdges ?? [];
  const withoutTarget = current.filter((child) => child.targetSlotId !== itemEdge.targetSlotId);
  return { ...edge, itemEdges: [...withoutTarget, itemEdge] };
}

export function removeItemEdgeFromParent(
  edge: MappingEdge,
  itemEdgeId: string,
): MappingEdge {
  return {
    ...edge,
    itemEdges: (edge.itemEdges ?? []).filter((child) => child.id !== itemEdgeId),
  };
}

/**
 * Catalog entries that remain valid when placed at `stepIndex` (replace) or
 * appended (`stepIndex === chain.length`).
 */
export function listCompatibleTransforms(input: {
  readonly registry: ValueTransformRegistry;
  readonly edge: MappingEdge;
  readonly stepIndex: number;
  readonly sourceType?: FieldDataType;
  readonly targetType?: FieldDataType;
  readonly mode: 'replace' | 'append';
}): ValueTransformDefinition[] {
  const chain = input.edge.transformIds ?? [];
  if (input.mode === 'append' && chain.length >= MAX_TRANSFORM_CHAIN) {
    return [];
  }
  if (input.mode === 'replace' && (input.stepIndex < 0 || input.stepIndex >= chain.length)) {
    return [];
  }

  return input.registry
    .list()
    .filter((definition) => definition.id !== 'identity')
    .filter((definition) => {
      const candidate =
        input.mode === 'append'
          ? [...chain, definition.id]
          : chain.map((id, index) => (index === input.stepIndex ? definition.id : id));
      return isTransformChainCompatible(
        input.registry,
        candidate,
        input.sourceType,
        input.targetType,
      );
    });
}

export function edgePortTypes(
  edge: MappingEdge,
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): { sourceType?: FieldDataType; targetType?: FieldDataType } {
  return {
    sourceType: findSourceField(sources, edge.sourceFieldId)?.dataType,
    targetType: findTargetSlot(targets, edge.targetSlotId)?.dataType,
  };
}
