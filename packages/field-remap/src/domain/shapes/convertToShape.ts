import type { ConversionDefinition } from './conversionDefinition.js';
import {
  mergeSourceShapes,
  targetSlotsFromShape,
  type DataShape,
  type DataShapeRegistry,
} from './dataShape.js';
import { convertArrayWithItemEdges } from '../mapping/convertItemEdges.js';
import { isPlainObject, readObjectPath, writeObjectPath } from '../mapping/pathUtils.js';
import { findSourceField, resolveMappedValue } from '../mapping/resolveMappedValue.js';
import { findTargetSlot, flattenTargetSlots } from '../mapping/treeUtils.js';
import type {
  SourceField,
  TargetSlot,
  TransformContext,
  ValueTransformRegistry,
} from '../types.js';

export interface ConvertToShapeInput {
  readonly conversion: ConversionDefinition;
  /** Shape registry, or an explicit list containing at least the referenced shapes. */
  readonly shapes: DataShapeRegistry | readonly DataShape[];
  /**
   * Named input bags keyed by source shape id.
   * Example: `{ order: liveOrder, customer: liveCustomer }`.
   */
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly transforms: ValueTransformRegistry;
  readonly context?: TransformContext;
}

export interface ConvertToShapeSlotResult {
  readonly edgeId: string;
  readonly targetSlotId: string;
  readonly path: string;
  readonly value: unknown;
}

export interface ConvertToShapeResult {
  /** Nested JSON matching target shape paths. */
  readonly output: Record<string, unknown>;
  /** Flat per-slot results (debug / UI panels). */
  readonly slots: readonly ConvertToShapeSlotResult[];
}

function isDataShapeRegistry(
  shapes: DataShapeRegistry | readonly DataShape[],
): shapes is DataShapeRegistry {
  return typeof (shapes as DataShapeRegistry).get === 'function';
}

function resolveShape(
  shapes: DataShapeRegistry | readonly DataShape[],
  id: string,
): DataShape | undefined {
  if (isDataShapeRegistry(shapes)) {
    return shapes.get(id);
  }
  return shapes.find((shape) => shape.id === id);
}

function outputPathForTarget(slot: TargetSlot): string {
  const path = slot.path?.trim();
  if (path) {
    return path;
  }
  // Prefer last id segment when hosts use dotted ids (`slot.display.timeText`).
  const id = slot.id.trim();
  if (id.includes('.')) {
    const parts = id.split('.').filter(Boolean);
    // Drop a leading registry prefix like `slot` when present with 3+ segments.
    if (parts.length >= 3 && (parts[0] === 'slot' || parts[0] === 'tgt')) {
      return parts.slice(1).join('.');
    }
    if (parts.length >= 2) {
      return parts.slice(1).join('.');
    }
  }
  return slot.label.trim() || id;
}

function readFieldValue(field: SourceField, inputs: Readonly<Record<string, unknown>>): unknown {
  const shapeId = field.shapeId?.trim();
  const bag =
    shapeId && Object.prototype.hasOwnProperty.call(inputs, shapeId)
      ? inputs[shapeId]
      : // Single-bag fallback: use the only input, or the whole inputs record.
        Object.keys(inputs).length === 1
        ? inputs[Object.keys(inputs)[0]!]
        : inputs;

  const path = field.path?.trim();
  if (path) {
    // When bags are per-shape, paths are relative to that bag.
    // When falling back to the whole inputs record, absolute paths still work.
    if (shapeId && Object.prototype.hasOwnProperty.call(inputs, shapeId)) {
      return readObjectPath(bag, path);
    }
    const fromBag = readObjectPath(bag, path);
    if (fromBag !== undefined) {
      return fromBag;
    }
    // Absolute path into combined inputs (e.g. `order.totalCents`).
    return readObjectPath(inputs, path);
  }

  return field.sampleValue;
}

/**
 * Apply a conversion to named input bags and build target-shaped JSON.
 *
 * This is the host runtime entry point — not `sourceShape.convert(target, data)`.
 * Multiple source shapes are supported via `inputs[shapeId]`.
 * Awaits Promise-returning host transforms (e.g. JSONata 2.x).
 */
export async function convertToShape(input: ConvertToShapeInput): Promise<ConvertToShapeResult> {
  const sourceShapes: DataShape[] = [];
  for (const shapeId of input.conversion.sourceShapeIds) {
    const shape = resolveShape(input.shapes, shapeId);
    if (!shape) {
      throw new Error(`Unknown source shape "${shapeId}" for conversion "${input.conversion.id}".`);
    }
    if (shape.role === 'target') {
      throw new Error(`Shape "${shapeId}" has role "target" and cannot be used as a source.`);
    }
    sourceShapes.push(shape);
  }

  const targetShape = resolveShape(input.shapes, input.conversion.targetShapeId);
  if (!targetShape) {
    throw new Error(
      `Unknown target shape "${input.conversion.targetShapeId}" for conversion "${input.conversion.id}".`,
    );
  }

  const sources = mergeSourceShapes(sourceShapes);
  const targets = targetSlotsFromShape(targetShape);
  const targetLeaves = flattenTargetSlots(targets);

  let output: Record<string, unknown> = {};
  const slots: ConvertToShapeSlotResult[] = [];

  for (const edge of input.conversion.document.edges) {
    const sourceField = findSourceField(sources, edge.sourceFieldId);
    if (!sourceField) {
      continue;
    }
    const targetSlot =
      findTargetSlot(targets, edge.targetSlotId) ??
      targetLeaves.find((slot) => slot.id === edge.targetSlotId);
    if (!targetSlot) {
      continue;
    }

    const sourceValue = readFieldValue(sourceField, input.inputs);
    const value =
      edge.itemEdges && edge.itemEdges.length > 0
        ? await convertArrayWithItemEdges({
            items: sourceValue,
            itemEdges: edge.itemEdges,
            sources,
            targets,
            transforms: input.transforms,
            context: input.context,
          })
        : await resolveMappedValue(edge, sourceValue, input.transforms, {
            ...input.context,
            sampleValue: sourceValue,
            record: isPlainObject(sourceValue)
              ? sourceValue
              : isPlainObject(input.context?.record)
                ? input.context.record
                : undefined,
          });

    const path = outputPathForTarget(targetSlot);
    output = writeObjectPath(output, path, value);
    slots.push({
      edgeId: edge.id,
      targetSlotId: edge.targetSlotId,
      path,
      value,
    });
  }

  return { output, slots };
}
