import { throwIfAborted } from '../abort.js';
import type { ConversionDefinition } from './conversionDefinition.js';
import {
  mergeSourceShapes,
  targetSlotsFromShape,
  type DataShape,
  type DataShapeRegistry,
} from './dataShape.js';
import { convertArrayWithItemEdges } from '../mapping/convertItemEdges.js';
import { isPlainObject, writeObjectPath } from '../mapping/pathUtils.js';
import {
  findSourceField,
  readSourceFieldValue,
  resolveMappedValue,
  resolveTargetSlotOutputPath,
} from '../mapping/resolveMappedValue.js';
import { findTargetSlot, flattenTargetSlots } from '../mapping/treeUtils.js';
import type { TransformContext, ValueTransformRegistry } from '../types.js';

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
  /**
   * Optional cancellation. Merged into transform context as `signal` (wins over
   * `context.signal` when both are set). Aborted conversions reject with `AbortError`
   * and do not apply further edges.
   */
  readonly signal?: AbortSignal;
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

/**
 * Apply a conversion to named input bags and build target-shaped JSON.
 *
 * This is the host runtime entry point — not `sourceShape.convert(target, data)`.
 * Multiple source shapes are supported via `inputs[shapeId]`.
 * Awaits Promise-returning host transforms (e.g. JSONata 2.x).
 */
export async function convertToShape(input: ConvertToShapeInput): Promise<ConvertToShapeResult> {
  const signal = input.signal ?? input.context?.signal;
  const context: TransformContext = {
    ...input.context,
    ...(signal ? { signal } : {}),
  };

  throwIfAborted(signal);

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
    throwIfAborted(signal);

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

    const sourceValue = readSourceFieldValue(sourceField, input.inputs);
    const value =
      edge.itemEdges && edge.itemEdges.length > 0
        ? await convertArrayWithItemEdges({
            items: sourceValue,
            itemEdges: edge.itemEdges,
            sources,
            targets,
            transforms: input.transforms,
            context,
          })
        : await resolveMappedValue(edge, sourceValue, input.transforms, {
            ...context,
            sampleValue: sourceValue,
            record: isPlainObject(sourceValue)
              ? sourceValue
              : isPlainObject(context.record)
                ? context.record
                : undefined,
          });

    const path = resolveTargetSlotOutputPath(targetSlot);
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
