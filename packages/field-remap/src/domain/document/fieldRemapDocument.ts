import { normalizeMappingEdges } from './mappingEdge.js';
import type { MappingEdge, FieldRemapDocument } from '../types.js';

export const FIELD_REMAP_DOCUMENT_VERSION = 1 as const;

/** Thrown when parse/deserialize sees a document `version` other than the supported constant. */
export class UnsupportedFieldRemapDocumentVersionError extends Error {
  readonly version: unknown;
  readonly expectedVersion: typeof FIELD_REMAP_DOCUMENT_VERSION;

  constructor(version: unknown) {
    super(
      `Unsupported field remap document version ${String(version)}; expected ${FIELD_REMAP_DOCUMENT_VERSION}.`,
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

/** Build a versioned, normalized mapping document for host persistence. */
export function createFieldRemapDocument(edges: readonly MappingEdge[]): FieldRemapDocument {
  return {
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(edges),
  };
}

/** Normalize edges (including legacy transform id aliases) on a persisted document. */
export function normalizeFieldRemapDocument(document: FieldRemapDocument): FieldRemapDocument {
  if (document.version !== FIELD_REMAP_DOCUMENT_VERSION) {
    throw new UnsupportedFieldRemapDocumentVersionError(document.version);
  }
  return {
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges: normalizeMappingEdges(document.edges),
  };
}

/**
 * Stable JSON serialization for persistence / clipboard.
 * Always emits the current document version with normalized edges.
 */
export function serializeFieldRemapDocument(
  document: FieldRemapDocument | readonly MappingEdge[],
): string {
  const doc = Array.isArray(document)
    ? createFieldRemapDocument(document)
    : createFieldRemapDocument((document as FieldRemapDocument).edges);
  return JSON.stringify(doc);
}

/**
 * Parse an unknown JSON value into a normalized `FieldRemapDocument`.
 * Rejects unsupported versions and malformed shapes with typed errors.
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
  if (record.version !== FIELD_REMAP_DOCUMENT_VERSION) {
    throw new UnsupportedFieldRemapDocumentVersionError(record.version);
  }
  if (!Array.isArray(record.edges)) {
    throw new InvalidFieldRemapDocumentError('Field remap document edges must be an array.');
  }

  return normalizeFieldRemapDocument({
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges: record.edges as MappingEdge[],
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
 * **v1:** passthrough normalize (legacy transform id aliases rewritten).
 * Future versions: add `case` branches that rewrite into v1 shape, then normalize.
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
    case FIELD_REMAP_DOCUMENT_VERSION:
      return parseFieldRemapDocument(input);
    // Future: case 2: return parseFieldRemapDocument(migrateV2ToV1(record));
    default:
      throw new UnsupportedFieldRemapDocumentVersionError(record.version);
  }
}
