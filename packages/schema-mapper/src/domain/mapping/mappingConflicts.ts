import type { MappingEdge, SourceField, TargetSlot } from '../types.js';
import { flattenSourceFields, flattenTargetSlots } from './treeUtils.js';

export interface MappingConflict {
  readonly kind: 'parent-child-source' | 'parent-child-target';
  readonly parentId: string;
  readonly childId: string;
  readonly parentEdgeId: string;
  readonly childEdgeId: string;
}

function isAncestorId(ancestorId: string, descendantId: string): boolean {
  return (
    descendantId.startsWith(`${ancestorId}.`) || descendantId.startsWith(`${ancestorId}.item.`)
  );
}

/**
 * Detect edges that map both a parent object/array and one of its descendants.
 * Hosts should warn — writing both usually overwrites or double-defines output.
 */
export function findParentChildMappingConflicts(
  edges: readonly MappingEdge[],
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): MappingConflict[] {
  const sourceIds = new Set(flattenSourceFields(sources).map((field) => field.id));
  const targetIds = new Set(flattenTargetSlots(targets).map((slot) => slot.id));
  const conflicts: MappingConflict[] = [];

  for (let i = 0; i < edges.length; i += 1) {
    const a = edges[i]!;
    for (let j = i + 1; j < edges.length; j += 1) {
      const b = edges[j]!;
      if (
        sourceIds.has(a.sourceFieldId) &&
        sourceIds.has(b.sourceFieldId) &&
        isAncestorId(a.sourceFieldId, b.sourceFieldId)
      ) {
        conflicts.push({
          kind: 'parent-child-source',
          parentId: a.sourceFieldId,
          childId: b.sourceFieldId,
          parentEdgeId: a.id,
          childEdgeId: b.id,
        });
      } else if (
        sourceIds.has(a.sourceFieldId) &&
        sourceIds.has(b.sourceFieldId) &&
        isAncestorId(b.sourceFieldId, a.sourceFieldId)
      ) {
        conflicts.push({
          kind: 'parent-child-source',
          parentId: b.sourceFieldId,
          childId: a.sourceFieldId,
          parentEdgeId: b.id,
          childEdgeId: a.id,
        });
      }

      if (
        targetIds.has(a.targetSlotId) &&
        targetIds.has(b.targetSlotId) &&
        isAncestorId(a.targetSlotId, b.targetSlotId)
      ) {
        conflicts.push({
          kind: 'parent-child-target',
          parentId: a.targetSlotId,
          childId: b.targetSlotId,
          parentEdgeId: a.id,
          childEdgeId: b.id,
        });
      } else if (
        targetIds.has(a.targetSlotId) &&
        targetIds.has(b.targetSlotId) &&
        isAncestorId(b.targetSlotId, a.targetSlotId)
      ) {
        conflicts.push({
          kind: 'parent-child-target',
          parentId: b.targetSlotId,
          childId: a.targetSlotId,
          parentEdgeId: b.id,
          childEdgeId: a.id,
        });
      }
    }
  }

  return conflicts;
}
