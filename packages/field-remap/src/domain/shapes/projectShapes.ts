/**
 * Project source/target shape trees for Flow / browse with optional `hidden` filtering.
 */

import type { MappingEdge, SourceField, TargetSlot } from '../types.js';
import { pruneMappingEdgesForShapes } from './shapeEdit.js';

export type ProjectShapesOptions = {
  /**
   * When `false` (default), omit fields/slots with `hidden: true` (and prune empty
   * child lists). When `true`, keep hidden nodes for browse / authoring overlays.
   */
  readonly includeHidden?: boolean;
};

function projectSourceNode(field: SourceField, includeHidden: boolean): SourceField | null {
  if (!includeHidden && field.hidden === true) {
    return null;
  }
  if (!field.children?.length) {
    return field;
  }
  const children = projectSourceFields(field.children, { includeHidden });
  if (children === field.children) {
    return field;
  }
  return children.length > 0 ? { ...field, children } : { ...field, children: undefined };
}

function projectTargetNode(slot: TargetSlot, includeHidden: boolean): TargetSlot | null {
  if (!includeHidden && slot.hidden === true) {
    return null;
  }
  if (!slot.children?.length) {
    return slot;
  }
  const children = projectTargetSlots(slot.children, { includeHidden });
  if (children === slot.children) {
    return slot;
  }
  return children.length > 0 ? { ...slot, children } : { ...slot, children: undefined };
}

/** Filter a source field tree by `hidden` (default: omit hidden leaves/branches). */
export function projectSourceFields(
  fields: readonly SourceField[],
  options?: ProjectShapesOptions,
): readonly SourceField[] {
  const includeHidden = options?.includeHidden === true;
  const next: SourceField[] = [];
  let changed = false;
  for (const field of fields) {
    const projected = projectSourceNode(field, includeHidden);
    if (projected === null) {
      changed = true;
      continue;
    }
    if (projected !== field) {
      changed = true;
    }
    next.push(projected);
  }
  return changed ? next : fields;
}

/** Filter a target slot tree by `hidden` (default: omit hidden leaves/branches). */
export function projectTargetSlots(
  slots: readonly TargetSlot[],
  options?: ProjectShapesOptions,
): readonly TargetSlot[] {
  const includeHidden = options?.includeHidden === true;
  const next: TargetSlot[] = [];
  let changed = false;
  for (const slot of slots) {
    const projected = projectTargetNode(slot, includeHidden);
    if (projected === null) {
      changed = true;
      continue;
    }
    if (projected !== slot) {
      changed = true;
    }
    next.push(projected);
  }
  return changed ? next : slots;
}

export type ProjectShapesInput = {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges?: readonly MappingEdge[];
  readonly options?: ProjectShapesOptions;
};

export type ProjectShapesResult = {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges?: readonly MappingEdge[];
};

/**
 * Project sources/targets with `includeHidden`, and optionally prune mapping edges
 * whose endpoints disappeared from the projected id set.
 */
export function projectShapes(input: ProjectShapesInput): ProjectShapesResult {
  const sources = projectSourceFields(input.sources, input.options);
  const targets = projectTargetSlots(input.targets, input.options);
  if (input.edges === undefined) {
    return { sources, targets };
  }
  return {
    sources,
    targets,
    edges: pruneMappingEdgesForShapes(input.edges, sources, targets),
  };
}
