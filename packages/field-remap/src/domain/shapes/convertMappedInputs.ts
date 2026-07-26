import { applyMappingOperators, normalizeMappingOperators } from '../mapping/mappingOperators.js';
import { flattenSourceFields } from '../mapping/treeUtils.js';
import type {
  MappingEdge,
  MappingOperator,
  SourceField,
  TargetSlot,
  ValueTransformRegistry,
} from '../types.js';
import { defineConversion, withConversionEdges } from './conversionDefinition.js';
import { attachShapeIdToSourceFields, defineDataShape } from './dataShape.js';
import { convertToShape, type ConvertToShapeResult } from './convertToShape.js';

export interface ConvertMappedInputsInput {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly edges: readonly MappingEdge[];
  readonly operators?: readonly MappingOperator[];
  /**
   * Named input bags keyed by source shape id (same contract as `convertToShape`).
   * When sources omit `shapeId`, bags should use the resolved primary source shape id
   * (default `source`).
   */
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly transforms: ValueTransformRegistry;
  readonly signal?: AbortSignal;
  /** Override inferred source shape ids (order preserved for conversion). */
  readonly sourceShapeIds?: readonly string[];
  readonly targetShapeId?: string;
  readonly sourceLabel?: string;
  readonly targetLabel?: string;
}

function collectSourceShapeIds(sources: readonly SourceField[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const field of flattenSourceFields(sources)) {
    const shapeId = field.shapeId?.trim();
    if (!shapeId || seen.has(shapeId)) {
      continue;
    }
    seen.add(shapeId);
    ids.push(shapeId);
  }
  return ids;
}

function filterSourceTreeByShapeId(
  fields: readonly SourceField[],
  shapeId: string,
  treatMissingAsMatch: boolean,
): SourceField[] {
  const next: SourceField[] = [];
  for (const field of fields) {
    const fieldShapeId = field.shapeId?.trim();
    const children = field.children
      ? filterSourceTreeByShapeId(field.children, shapeId, treatMissingAsMatch)
      : undefined;
    const selfMatches =
      fieldShapeId === shapeId ||
      (treatMissingAsMatch && (fieldShapeId === undefined || fieldShapeId === ''));
    if (selfMatches || (children && children.length > 0)) {
      next.push({
        ...field,
        shapeId,
        ...(children ? { children } : {}),
      });
    }
  }
  return next;
}

/**
 * Host-friendly evaluate path for persisted `MappingEdge` graphs (including transform
 * chains and optional n→m operators) without requiring a full `FieldRemapDocument`.
 *
 * Same semantics as the shell panel preview: `convertToShape` then
 * `applyMappingOperators`. Prefer this when the host catalog stores edges (+ optional
 * operators) separately from kit document JSON.
 */
export async function convertMappedInputs(
  input: ConvertMappedInputsInput,
): Promise<ConvertToShapeResult> {
  const inferredSourceIds = collectSourceShapeIds(input.sources);
  const sourceShapeIds =
    input.sourceShapeIds && input.sourceShapeIds.length > 0
      ? [...input.sourceShapeIds]
      : inferredSourceIds.length > 0
        ? inferredSourceIds
        : ['source'];
  const targetShapeId = input.targetShapeId?.trim() || 'target';
  const primarySourceId = sourceShapeIds[0]!;
  const needsStamp = inferredSourceIds.length === 0;

  const stampedSources = needsStamp
    ? attachShapeIdToSourceFields(input.sources, primarySourceId)
    : input.sources;

  const sourceShapes = sourceShapeIds.map((shapeId) =>
    defineDataShape({
      id: shapeId,
      label: input.sourceLabel ?? shapeId,
      role: 'source',
      fields:
        sourceShapeIds.length === 1
          ? stampedSources
          : filterSourceTreeByShapeId(stampedSources, shapeId, shapeId === primarySourceId),
    }),
  );

  const shapes = [
    ...sourceShapes,
    defineDataShape({
      id: targetShapeId,
      label: input.targetLabel ?? targetShapeId,
      role: 'target',
      fields: input.targets,
    }),
  ];

  const conversion = withConversionEdges(
    defineConversion({
      id: `${primarySourceId}→${targetShapeId}`,
      sourceShapeIds,
      targetShapeId,
      edges: [],
    }),
    input.edges,
  );

  const converted = await convertToShape({
    conversion,
    shapes,
    inputs: input.inputs,
    transforms: input.transforms,
    signal: input.signal,
  });

  const operators = normalizeMappingOperators(input.operators);
  if (!operators?.length) {
    return converted;
  }

  const merged = await applyMappingOperators({
    operators,
    sources: stampedSources,
    targets: input.targets,
    inputs: input.inputs,
    transforms: input.transforms,
    output: converted.output,
    signal: input.signal,
  });

  return {
    output: merged.output,
    slots: converted.slots,
  };
}
