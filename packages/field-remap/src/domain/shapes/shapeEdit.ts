/**
 * Host-owned shape editing helpers: type patches and edge pruning when ids disappear.
 */

import { flattenSourceFields, flattenTargetSlots } from '../mapping/treeUtils.js';
import type { FieldDataType, MappingEdge, SourceField, TargetSlot } from '../types.js';

export const FIELD_DATA_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'time',
  'datetime',
  'object',
  'array',
  'unknown',
] as const satisfies readonly FieldDataType[];

export function isFieldDataType(value: unknown): value is FieldDataType {
  return typeof value === 'string' && (FIELD_DATA_TYPES as readonly string[]).includes(value);
}

export function collectSourceFieldIds(fields: readonly SourceField[]): ReadonlySet<string> {
  return new Set(flattenSourceFields(fields).map((field) => field.id));
}

export function collectTargetSlotIds(slots: readonly TargetSlot[]): ReadonlySet<string> {
  return new Set(flattenTargetSlots(slots).map((slot) => slot.id));
}

function pruneEdgeList(
  edges: readonly MappingEdge[],
  sourceIds: ReadonlySet<string>,
  targetIds: ReadonlySet<string>,
): MappingEdge[] {
  const next: MappingEdge[] = [];
  for (const edge of edges) {
    if (!sourceIds.has(edge.sourceFieldId) || !targetIds.has(edge.targetSlotId)) {
      continue;
    }
    if (!edge.itemEdges?.length) {
      next.push(edge);
      continue;
    }
    const itemEdges = pruneEdgeList(edge.itemEdges, sourceIds, targetIds);
    next.push(itemEdges.length === edge.itemEdges.length ? edge : { ...edge, itemEdges });
  }
  return next;
}

/**
 * Drop (or trim nested `itemEdges` of) bindings whose source/target ids are gone.
 * Hosts should call this after shape ingest / structural edits.
 */
export function pruneMappingEdgesForShapes(
  edges: readonly MappingEdge[],
  sources: readonly SourceField[],
  targets: readonly TargetSlot[],
): readonly MappingEdge[] {
  return pruneEdgeList(edges, collectSourceFieldIds(sources), collectTargetSlotIds(targets));
}

function mapSourceTree(
  fields: readonly SourceField[],
  fieldId: string,
  mapper: (field: SourceField) => SourceField,
): SourceField[] {
  return fields.map((field) => {
    if (field.id === fieldId) {
      return mapper(field);
    }
    if (!field.children?.length) {
      return field;
    }
    const children = mapSourceTree(field.children, fieldId, mapper);
    return children === field.children ? field : { ...field, children };
  });
}

function mapTargetTree(
  slots: readonly TargetSlot[],
  slotId: string,
  mapper: (slot: TargetSlot) => TargetSlot,
): TargetSlot[] {
  return slots.map((slot) => {
    if (slot.id === slotId) {
      return mapper(slot);
    }
    if (!slot.children?.length) {
      return slot;
    }
    const children = mapTargetTree(slot.children, slotId, mapper);
    return children === slot.children ? slot : { ...slot, children };
  });
}

/** Patch `dataType` on a source field id (nested-aware). */
export function setSourceFieldDataType(
  fields: readonly SourceField[],
  fieldId: string,
  dataType: FieldDataType,
): readonly SourceField[] {
  return mapSourceTree(fields, fieldId, (field) => ({ ...field, dataType }));
}

/** Patch `dataType` on a target slot id (nested-aware). */
export function setTargetSlotDataType(
  slots: readonly TargetSlot[],
  slotId: string,
  dataType: FieldDataType,
): readonly TargetSlot[] {
  return mapTargetTree(slots, slotId, (slot) => ({ ...slot, dataType }));
}
