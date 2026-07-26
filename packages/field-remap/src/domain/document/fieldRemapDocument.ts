import { normalizeMappingEdges } from './mappingEdge.js';
import { normalizeMappingOperators } from '../mapping/mappingOperators.js';
import type { MappingEdge, MappingOperator, FieldRemapDocument } from '../types.js';

/** Current persistence version (edges + optional `operators[]`). */
export const FIELD_REMAP_DOCUMENT_VERSION = 2 as const;
/** Legacy edges-only documents. */
export const FIELD_REMAP_DOCUMENT_V1_VERSION = 1 as const;

type SupportedDocumentVersion =
  typeof FIELD_REMAP_DOCUMENT_VERSION | typeof FIELD_REMAP_DOCUMENT_V1_VERSION;

/** Thrown when parse/deserialize sees a document `version` other than a supported constant. */
export class UnsupportedFieldRemapDocumentVersionError extends Error {
  readonly version: unknown;
  readonly expectedVersion: typeof FIELD_REMAP_DOCUMENT_VERSION;

  constructor(version: unknown) {
    super(
      `Unsupported field remap document version ${String(version)}; expected ${FIELD_REMAP_DOCUMENT_V1_VERSION} or ${FIELD_REMAP_DOCUMENT_VERSION}.`,
    );
    this.name = 'UnsupportedFieldRemapDocumentVersionError';
    this.version = version;
    this.expectedVersion = FIELD_REMAP_DOCUMENT_VERSION;
  }
}

/** Thrown when parse/deserialize receives a value that is not a mapping document. */
export class InvalidFieldRemapDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFieldRemapDocumentError';
  }
}

export type CreateFieldRemapDocumentOptions = {
  readonly operators?: readonly MappingOperator[];
};

/** Build a versioned, normalized mapping document for host persistence. */
export function createFieldRemapDocument(
  edges: readonly MappingEdge[],
  options?: CreateFieldRemapDocumentOptions,
): FieldRemapDocument {
  const operators = normalizeMappingOperators(options?.operators);
  return {
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(edges),
    ...(operators ? { operators } : {}),
  };
}

function isSupportedVersion(version: unknown): version is SupportedDocumentVersion {
  return version === FIELD_REMAP_DOCUMENT_V1_VERSION || version === FIELD_REMAP_DOCUMENT_VERSION;
}

/** Normalize edges / operators on a persisted document; always emits the current version. */
export function normalizeFieldRemapDocument(document: FieldRemapDocument): FieldRemapDocument {
  if (!isSupportedVersion(document.version)) {
    throw new UnsupportedFieldRemapDocumentVersionError(document.version);
  }
  const operators = normalizeMappingOperators(document.operators);
  return {
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(document.edges),
    ...(operators ? { operators } : {}),
  };
}

/**
 * Stable JSON serialization for persistence / clipboard.
 * Always emits the current document version with normalized edges / operators.
 */
export function serializeFieldRemapDocument(
  document: FieldRemapDocument | readonly MappingEdge[],
): string {
  const doc = Array.isArray(document)
    ? createFieldRemapDocument(document)
    : createFieldRemapDocument((document as FieldRemapDocument).edges, {
        operators: (document as FieldRemapDocument).operators,
      });
  return JSON.stringify(doc);
}

/**
 * Parse an unknown JSON value into a normalized `FieldRemapDocument`.
 * Accepts v1 (edges-only) and v2 (optional operators); always returns current version.
 */
export function parseFieldRemapDocument(input: unknown): FieldRemapDocument {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidFieldRemapDocumentError(
      'Expected a field remap document object with version and edges.',
    );
  }

  const record = input as Record<string, unknown>;
  if (!('version' in record)) {
    throw new InvalidFieldRemapDocumentError('Field remap document is missing version.');
  }
  if (!isSupportedVersion(record.version)) {
    throw new UnsupportedFieldRemapDocumentVersionError(record.version);
  }
  if (!Array.isArray(record.edges)) {
    throw new InvalidFieldRemapDocumentError('Field remap document edges must be an array.');
  }
  if (
    record.operators !== undefined &&
    record.operators !== null &&
    !Array.isArray(record.operators)
  ) {
    throw new InvalidFieldRemapDocumentError(
      'Field remap document operators must be an array when present.',
    );
  }

  return normalizeFieldRemapDocument({
    version: record.version,
    edges: record.edges as MappingEdge[],
    operators: record.operators as MappingOperator[] | undefined,
  });
}

/** JSON.parse + {@link parseFieldRemapDocument}. */
export function deserializeFieldRemapDocument(json: string): FieldRemapDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new InvalidFieldRemapDocumentError(`Field remap document JSON is invalid: ${detail}`);
  }
  return parseFieldRemapDocument(parsed);
}

/**
 * Migrate an unknown persisted value to the current {@link FieldRemapDocument}.
 *
 * Hosts should call this (or `parseFieldRemapDocument`) at load time so future
 * document versions can be rewritten here without changing call sites.
 *
 * **v1:** edges-only → current version (operators omitted).
 * **v2:** normalize edges + operators.
 */
export function migrateFieldRemapDocument(input: unknown): FieldRemapDocument {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidFieldRemapDocumentError(
      'Expected a field remap document object with version and edges.',
    );
  }

  const record = input as Record<string, unknown>;
  if (!('version' in record)) {
    throw new InvalidFieldRemapDocumentError('Field remap document is missing version.');
  }

  switch (record.version) {
    case FIELD_REMAP_DOCUMENT_V1_VERSION:
    case FIELD_REMAP_DOCUMENT_VERSION:
      return parseFieldRemapDocument(input);
    default:
      throw new UnsupportedFieldRemapDocumentVersionError(record.version);
  }
}
