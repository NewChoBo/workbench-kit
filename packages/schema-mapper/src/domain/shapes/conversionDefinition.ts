import {
  createSchemaMappingDocument,
  normalizeSchemaMappingDocument,
} from '../document/schemaMappingDocument.js';
import type { MappingEdge, SchemaMappingDocument } from '../types.js';

/**
 * Managed conversion between one or more source shapes and a target shape.
 * Edges live in `document`; runtime uses `convertToShape` (not a method on a shape).
 */
export interface ConversionDefinition {
  readonly id: string;
  readonly label?: string;
  /** One or more managed source shape ids (multi-input). */
  readonly sourceShapeIds: readonly string[];
  readonly targetShapeId: string;
  readonly document: SchemaMappingDocument;
}

export interface ConversionRegistry {
  register(conversion: ConversionDefinition): void;
  get(id: string): ConversionDefinition | undefined;
  list(): readonly ConversionDefinition[];
}

export interface DefineConversionInput {
  readonly id: string;
  readonly label?: string;
  readonly sourceShapeIds: readonly string[];
  readonly targetShapeId: string;
  readonly document?: SchemaMappingDocument;
  readonly edges?: readonly MappingEdge[];
}

export function defineConversion(input: DefineConversionInput): ConversionDefinition {
  const id = input.id.trim();
  if (!id) {
    throw new Error('ConversionDefinition.id must be a non-empty string.');
  }
  const sourceShapeIds = input.sourceShapeIds.map((item) => item.trim()).filter(Boolean);
  if (sourceShapeIds.length === 0) {
    throw new Error('ConversionDefinition.sourceShapeIds must include at least one shape id.');
  }
  const targetShapeId = input.targetShapeId.trim();
  if (!targetShapeId) {
    throw new Error('ConversionDefinition.targetShapeId must be a non-empty string.');
  }

  const document = input.document
    ? normalizeSchemaMappingDocument(input.document)
    : createSchemaMappingDocument(input.edges ?? []);

  return {
    id,
    ...(input.label?.trim() ? { label: input.label.trim() } : {}),
    sourceShapeIds,
    targetShapeId,
    document,
  };
}

export function createConversionRegistry(
  initial: readonly ConversionDefinition[] = [],
): ConversionRegistry {
  const byId = new Map<string, ConversionDefinition>();

  const api: ConversionRegistry = {
    register(conversion) {
      const defined = defineConversion(conversion);
      byId.set(defined.id, defined);
    },
    get(id) {
      return byId.get(id.trim());
    },
    list() {
      return [...byId.values()];
    },
  };

  for (const conversion of initial) {
    api.register(conversion);
  }
  return api;
}

/** Replace edges on a conversion (immutable). */
export function withConversionEdges(
  conversion: ConversionDefinition,
  edges: readonly MappingEdge[],
): ConversionDefinition {
  return {
    ...conversion,
    document: createSchemaMappingDocument(edges),
  };
}
