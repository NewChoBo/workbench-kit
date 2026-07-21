import { normalizeMappingEdges } from './mappingEdge.js';
import type { MappingEdge, SchemaMappingDocument } from '../types.js';

export const SCHEMA_MAPPING_DOCUMENT_VERSION = 1 as const;

/** Thrown when parse/deserialize sees a document `version` other than the supported constant. */
export class UnsupportedSchemaMappingDocumentVersionError extends Error {
  readonly version: unknown;
  readonly expectedVersion: typeof SCHEMA_MAPPING_DOCUMENT_VERSION;

  constructor(version: unknown) {
    super(
      `Unsupported schema mapping document version ${String(version)}; expected ${SCHEMA_MAPPING_DOCUMENT_VERSION}.`,
    );
    this.name = 'UnsupportedSchemaMappingDocumentVersionError';
    this.version = version;
    this.expectedVersion = SCHEMA_MAPPING_DOCUMENT_VERSION;
  }
}

/** Thrown when parse/deserialize receives a value that is not a mapping document. */
export class InvalidSchemaMappingDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSchemaMappingDocumentError';
  }
}

/** Build a versioned, normalized mapping document for host persistence. */
export function createSchemaMappingDocument(edges: readonly MappingEdge[]): SchemaMappingDocument {
  return {
    version: SCHEMA_MAPPING_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(edges),
  };
}

/** Normalize edges (including legacy transform id aliases) on a persisted document. */
export function normalizeSchemaMappingDocument(
  document: SchemaMappingDocument,
): SchemaMappingDocument {
  if (document.version !== SCHEMA_MAPPING_DOCUMENT_VERSION) {
    throw new UnsupportedSchemaMappingDocumentVersionError(document.version);
  }
  return {
    version: SCHEMA_MAPPING_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(document.edges),
  };
}

/**
 * Stable JSON serialization for persistence / clipboard.
 * Always emits the current document version with normalized edges.
 */
export function serializeSchemaMappingDocument(
  document: SchemaMappingDocument | readonly MappingEdge[],
): string {
  const doc = Array.isArray(document)
    ? createSchemaMappingDocument(document)
    : createSchemaMappingDocument((document as SchemaMappingDocument).edges);
  return JSON.stringify(doc);
}

/**
 * Parse an unknown JSON value into a normalized `SchemaMappingDocument`.
 * Rejects unsupported versions and malformed shapes with typed errors.
 */
export function parseSchemaMappingDocument(input: unknown): SchemaMappingDocument {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidSchemaMappingDocumentError(
      'Expected a schema mapping document object with version and edges.',
    );
  }

  const record = input as Record<string, unknown>;
  if (!('version' in record)) {
    throw new InvalidSchemaMappingDocumentError('Schema mapping document is missing version.');
  }
  if (record.version !== SCHEMA_MAPPING_DOCUMENT_VERSION) {
    throw new UnsupportedSchemaMappingDocumentVersionError(record.version);
  }
  if (!Array.isArray(record.edges)) {
    throw new InvalidSchemaMappingDocumentError('Schema mapping document edges must be an array.');
  }

  return normalizeSchemaMappingDocument({
    version: SCHEMA_MAPPING_DOCUMENT_VERSION,
    edges: record.edges as MappingEdge[],
  });
}

/** JSON.parse + {@link parseSchemaMappingDocument}. */
export function deserializeSchemaMappingDocument(json: string): SchemaMappingDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new InvalidSchemaMappingDocumentError(
      `Schema mapping document JSON is invalid: ${detail}`,
    );
  }
  return parseSchemaMappingDocument(parsed);
}

/**
 * Migrate an unknown persisted value to the current {@link SchemaMappingDocument}.
 *
 * Hosts should call this (or `parseSchemaMappingDocument`) at load time so future
 * document versions can be rewritten here without changing call sites.
 *
 * **v1:** passthrough normalize (legacy transform id aliases rewritten).
 * Future versions: add `case` branches that rewrite into v1 shape, then normalize.
 */
export function migrateSchemaMappingDocument(input: unknown): SchemaMappingDocument {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidSchemaMappingDocumentError(
      'Expected a schema mapping document object with version and edges.',
    );
  }

  const record = input as Record<string, unknown>;
  if (!('version' in record)) {
    throw new InvalidSchemaMappingDocumentError('Schema mapping document is missing version.');
  }

  switch (record.version) {
    case SCHEMA_MAPPING_DOCUMENT_VERSION:
      return parseSchemaMappingDocument(input);
    // Future: case 2: return parseSchemaMappingDocument(migrateV2ToV1(record));
    default:
      throw new UnsupportedSchemaMappingDocumentVersionError(record.version);
  }
}
