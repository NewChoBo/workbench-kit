import {
  canonicalizeTransformId,
  IDENTITY_TRANSFORM_ID,
  MAX_TRANSFORM_CHAIN,
} from '../constants.js';
import {
  sanitizeOptionRecord,
  sanitizeOptionSteps,
  sharedOptionsFromSteps,
} from '../mapping/transformOptions.js';
import type { MappingEdge } from '../types.js';

export { MAX_TRANSFORM_CHAIN } from '../constants.js';

function sanitizeTransformIds(ids: readonly string[] | undefined): string[] {
  const cleaned = ids
    ?.map((id) => canonicalizeTransformId(id))
    .filter((id) => id.length > 0 && id !== IDENTITY_TRANSFORM_ID);
  if (!cleaned || cleaned.length === 0) {
    return [];
  }
  return cleaned.slice(0, MAX_TRANSFORM_CHAIN);
}

/** Resolve the effective transform chain for an edge. Identity / empty → pass-through. */
export function edgeTransformIds(edge: MappingEdge): string[] {
  return sanitizeTransformIds(edge.transformIds);
}

/** Per-item transform chain applied after optional `itemSourcePath` projection. */
export function edgeItemTransformIds(edge: MappingEdge): string[] {
  return sanitizeTransformIds(edge.itemTransformIds);
}

/**
 * Option bags:
 * - Prefer `transformOptionSteps` when present (aligned to chain length).
 * - Keep `transformOptions` as the first non-empty step (or the legacy shared bag).
 * - Same rules for `itemTransformOptionSteps` / `itemTransformOptions`.
 */
export function normalizeMappingEdge(edge: MappingEdge): MappingEdge {
  const ids = edgeTransformIds(edge);
  const itemIds = edgeItemTransformIds(edge);
  const itemSourcePath = edge.itemSourcePath?.trim() || undefined;
  const itemEdges =
    edge.itemEdges && edge.itemEdges.length > 0
      ? edge.itemEdges.map((child) => {
          // One collection level — drop nested list contexts on children.
          const { itemEdges: _nested, ...rest } = child;
          return normalizeMappingEdge(rest);
        })
      : undefined;

  const transformOptionSteps = sanitizeOptionSteps(edge.transformOptionSteps, ids.length);
  const transformOptions =
    sharedOptionsFromSteps(transformOptionSteps) ?? sanitizeOptionRecord(edge.transformOptions);

  const itemTransformOptionSteps = sanitizeOptionSteps(
    edge.itemTransformOptionSteps,
    itemIds.length,
  );
  const itemTransformOptions =
    sharedOptionsFromSteps(itemTransformOptionSteps) ??
    sanitizeOptionRecord(edge.itemTransformOptions);

  return {
    id: edge.id,
    sourceFieldId: edge.sourceFieldId,
    targetSlotId: edge.targetSlotId,
    transformIds: ids.length > 0 ? ids : undefined,
    ...(transformOptionSteps ? { transformOptionSteps } : {}),
    ...(transformOptions ? { transformOptions } : {}),
    ...(itemSourcePath && !itemEdges ? { itemSourcePath } : {}),
    ...(itemIds.length > 0 && !itemEdges ? { itemTransformIds: itemIds } : {}),
    ...(itemTransformOptionSteps && !itemEdges ? { itemTransformOptionSteps } : {}),
    ...(itemTransformOptions && !itemEdges ? { itemTransformOptions } : {}),
    ...(itemEdges ? { itemEdges } : {}),
  };
}

export function normalizeMappingEdges(edges: readonly MappingEdge[]): MappingEdge[] {
  return edges.map(normalizeMappingEdge);
}

/** Build a normalized edge from wire / assign actions. */
export function createMappingEdge(input: {
  readonly id: string;
  readonly sourceFieldId: string;
  readonly targetSlotId: string;
  readonly transformIds?: readonly string[];
  readonly transformOptionSteps?: readonly (Readonly<Record<string, unknown>> | undefined)[];
  readonly transformOptions?: Readonly<Record<string, unknown>>;
  /** Optional per-item projection path for array mappings. */
  readonly itemSourcePath?: string;
  /** Optional per-item transform chain after projection. */
  readonly itemTransformIds?: readonly string[];
  readonly itemTransformOptionSteps?: readonly (Readonly<Record<string, unknown>> | undefined)[];
  readonly itemTransformOptions?: Readonly<Record<string, unknown>>;
  /** List-context child edges for array-of-object → array-of-object. */
  readonly itemEdges?: readonly MappingEdge[];
}): MappingEdge {
  return normalizeMappingEdge({
    id: input.id,
    sourceFieldId: input.sourceFieldId,
    targetSlotId: input.targetSlotId,
    transformIds: input.transformIds,
    transformOptionSteps: input.transformOptionSteps,
    transformOptions: input.transformOptions,
    itemSourcePath: input.itemSourcePath,
    itemTransformIds: input.itemTransformIds,
    itemTransformOptionSteps: input.itemTransformOptionSteps,
    itemTransformOptions: input.itemTransformOptions,
    itemEdges: input.itemEdges,
  });
}
