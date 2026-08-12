import type {
  MappingEdge,
  SourceField,
  TransformContext,
  ValueTransformRegistry,
} from '../types.js';
import { edgeItemTransformIds, edgeTransformIds } from '../document/mappingEdge.js';
import { projectCollectionItems } from './pathUtils.js';
import { applyTransformChain } from '../../registry/createValueTransformRegistry.js';
import { BUILTIN_TRANSFORM_IDS } from '../../registry/builtinTransforms.js';
import { resolveOptionSteps } from './transformOptions.js';
import { flattenSourceFields } from './treeUtils.js';

export { findTargetSlot, flattenSourceFields, flattenTargetSlots } from './treeUtils.js';

export { projectCollectionItems, readObjectPath } from './pathUtils.js';

export function findSourceField(
  fields: readonly SourceField[],
  fieldId: string,
): SourceField | undefined {
  return flattenSourceFields(fields).find((field) => field.id === fieldId);
}

/**
 * Resolve an edge against a live / sample source value.
 *
 * Apply order:
 * 1. Optional `itemSourcePath` projection (array of objects → projected array)
 * 2. Optional `itemTransformIds` per element (when the value is still an array)
 * 3. `transformIds` on the whole value (including array reduces)
 *
 * Per-step options are aligned through `transformOptionSteps` / `itemTransformOptionSteps`.
 */
export async function resolveMappedValue(
  edge: MappingEdge,
  sourceValue: unknown,
  registry: ValueTransformRegistry,
  context: TransformContext = {},
): Promise<unknown> {
  let current = edge.itemSourcePath
    ? projectCollectionItems(sourceValue, edge.itemSourcePath)
    : sourceValue;

  const itemChain = edgeItemTransformIds(edge);
  const itemSteps = resolveOptionSteps(itemChain, edge.itemTransformOptionSteps);

  if (itemChain.length > 0 && Array.isArray(current)) {
    current = await Promise.all(
      current.map((item) => applyTransformChain(registry, itemChain, item, context, itemSteps)),
    );
  }

  const chain = edgeTransformIds(edge);
  if (chain.length === 0) {
    const identity = registry.get(BUILTIN_TRANSFORM_IDS.identity);
    return identity ? await identity.apply(current, context) : current;
  }

  const valueSteps = resolveOptionSteps(chain, edge.transformOptionSteps);
  return applyTransformChain(registry, chain, current, context, valueSteps);
}

export async function resolveEdgePreview(
  edge: MappingEdge,
  sources: readonly SourceField[],
  registry: ValueTransformRegistry,
  context: TransformContext = {},
): Promise<unknown> {
  const field = findSourceField(sources, edge.sourceFieldId);
  const sample =
    context.sampleValue !== undefined ? context.sampleValue : (field?.sampleValue ?? context.now);
  return resolveMappedValue(edge, sample, registry, {
    ...context,
    sampleValue: sample,
  });
}

/** Resolve every edge into `{ targetSlotId, value }` for live preview panels. */
export async function resolveAllEdgePreviews(
  edges: readonly MappingEdge[],
  sources: readonly SourceField[],
  registry: ValueTransformRegistry,
  context: TransformContext = {},
): Promise<ReadonlyArray<{ edgeId: string; targetSlotId: string; value: unknown }>> {
  return Promise.all(
    edges.map(async (edge) => ({
      edgeId: edge.id,
      targetSlotId: edge.targetSlotId,
      value: await resolveEdgePreview(edge, sources, registry, context),
    })),
  );
}
