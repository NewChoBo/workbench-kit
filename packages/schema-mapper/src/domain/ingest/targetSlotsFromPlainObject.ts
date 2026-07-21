import { sourceFieldsFromPlainObject } from './sourceFieldsFromPlainObject.js';
import type { SourceField, TargetSlot } from '../types.js';

export interface TargetSlotsFromPlainObjectOptions {
  /** Prefix for generated slot ids (default `tgt`). */
  readonly idPrefix?: string;
  /** Max nesting depth for object children (default 4). */
  readonly maxDepth?: number;
}

function sourceFieldToTargetSlot(field: SourceField): TargetSlot {
  const slot: TargetSlot = {
    id: field.id,
    label: field.label,
    ...(field.path ? { path: field.path } : {}),
    ...(field.dataType ? { dataType: field.dataType } : {}),
  };
  if (field.children && field.children.length > 0) {
    return {
      ...slot,
      children: field.children.map(sourceFieldToTargetSlot),
    };
  }
  return slot;
}

/**
 * Infer a nested `TargetSlot` tree from a plain sample object (or target shape).
 * Mirrors {@link sourceFieldsFromPlainObject}: same nesting / array-of-object rules,
 * keeping `path` for `convertToShape` output assembly (no `sampleValue`).
 */
export function targetSlotsFromPlainObject(
  sample: unknown,
  options: TargetSlotsFromPlainObjectOptions = {},
): TargetSlot[] {
  const idPrefix = options.idPrefix?.trim() || 'tgt';
  return sourceFieldsFromPlainObject(sample, {
    idPrefix,
    maxDepth: options.maxDepth,
  }).map(sourceFieldToTargetSlot);
}
