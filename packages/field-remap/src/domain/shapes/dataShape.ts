import type { SourceField, TargetSlot } from '../types.js';

/** How a managed shape is used in conversions. */
export type DataShapeRole = 'source' | 'target' | 'both';

/**
 * Managed structure descriptor ("class-like" fixed shape).
 * Source/target field trees are host-owned; this wraps them for registry lookup.
 */
export interface DataShape {
  readonly id: string;
  readonly label: string;
  readonly role: DataShapeRole;
  /**
   * Field tree for source and/or target use.
   * When `role` is `target`, treat as `TargetSlot[]` (compatible structural shape).
   * When `role` is `source` or `both`, treat as `SourceField[]`.
   */
  readonly fields: readonly SourceField[] | readonly TargetSlot[];
}

export interface DataShapeRegistry {
  register(shape: DataShape): void;
  get(id: string): DataShape | undefined;
  list(role?: DataShapeRole): readonly DataShape[];
}

export function defineDataShape(input: DataShape): DataShape {
  const id = input.id.trim();
  if (!id) {
    throw new Error('DataShape.id must be a non-empty string.');
  }
  return {
    id,
    label: input.label.trim() || id,
    role: input.role,
    fields: input.fields,
  };
}

export function createDataShapeRegistry(initial: readonly DataShape[] = []): DataShapeRegistry {
  const byId = new Map<string, DataShape>();

  const api: DataShapeRegistry = {
    register(shape) {
      const defined = defineDataShape(shape);
      byId.set(defined.id, defined);
    },
    get(id) {
      return byId.get(id.trim());
    },
    list(role) {
      const all = [...byId.values()];
      if (!role) {
        return all;
      }
      return all.filter((shape) => shape.role === role || shape.role === 'both');
    },
  };

  for (const shape of initial) {
    api.register(shape);
  }
  return api;
}

/** Recursively stamp `shapeId` on source fields (for multi-input convert). */
export function attachShapeIdToSourceFields(
  fields: readonly SourceField[],
  shapeId: string,
): SourceField[] {
  return fields.map((field) => {
    const next: SourceField = {
      ...field,
      shapeId,
      ...(field.children ? { children: attachShapeIdToSourceFields(field.children, shapeId) } : {}),
    };
    return next;
  });
}

/**
 * Merge source shapes into one tree for `FieldRemap` / convert:
 * each shape becomes a non-mappable group whose children carry `shapeId`.
 */
export function mergeSourceShapes(shapes: readonly DataShape[]): SourceField[] {
  const sources: SourceField[] = [];
  for (const shape of shapes) {
    if (shape.role === 'target') {
      continue;
    }
    const children = attachShapeIdToSourceFields(shape.fields as readonly SourceField[], shape.id);
    sources.push({
      id: `shape.${shape.id}`,
      label: shape.label,
      group: 'Shapes',
      children,
    });
  }
  return sources;
}

/** Target slots from a target (or both) shape. */
export function targetSlotsFromShape(shape: DataShape): TargetSlot[] {
  if (shape.role === 'source') {
    throw new Error(`DataShape "${shape.id}" has role "source" and cannot provide target slots.`);
  }
  return shape.fields as TargetSlot[];
}
