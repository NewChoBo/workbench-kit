import { describe, expect, it } from 'vitest';
import {
  createSchemaMappingDocument,
  deserializeSchemaMappingDocument,
  InvalidSchemaMappingDocumentError,
  migrateSchemaMappingDocument,
  normalizeSchemaMappingDocument,
  parseSchemaMappingDocument,
  SCHEMA_MAPPING_DOCUMENT_VERSION,
  serializeSchemaMappingDocument,
  UnsupportedSchemaMappingDocumentVersionError,
} from './schemaMappingDocument.js';

describe('SchemaMappingDocument', () => {
  it('creates a versioned document with normalized edges', () => {
    const doc = createSchemaMappingDocument([
      {
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformId: 'lookup:code-to-label',
      },
    ]);

    expect(doc.version).toBe(SCHEMA_MAPPING_DOCUMENT_VERSION);
    expect(doc.edges).toEqual([
      {
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['lookup:code-to-label'],
        transformId: 'lookup:code-to-label',
      },
    ]);
  });

  it('round-trips serialize → deserialize with stable JSON', () => {
    const original = createSchemaMappingDocument([
      {
        id: 'e1',
        sourceFieldId: 'src.a',
        targetSlotId: 'tgt.a',
        transformIds: ['identity'],
      },
    ]);
    const json = serializeSchemaMappingDocument(original);
    const again = deserializeSchemaMappingDocument(json);
    expect(again).toEqual(original);
    expect(serializeSchemaMappingDocument(again)).toBe(json);
  });

  it('rejects unsupported versions and malformed shapes', () => {
    expect(() => parseSchemaMappingDocument({ version: 2, edges: [] })).toThrow(
      UnsupportedSchemaMappingDocumentVersionError,
    );
    expect(() => normalizeSchemaMappingDocument({ version: 2 as 1, edges: [] })).toThrow(
      UnsupportedSchemaMappingDocumentVersionError,
    );
    expect(() => parseSchemaMappingDocument({ version: 1, edges: null })).toThrow(
      InvalidSchemaMappingDocumentError,
    );
    expect(() => deserializeSchemaMappingDocument('{')).toThrow(InvalidSchemaMappingDocumentError);
  });

  it('migrates v1 documents via normalize passthrough', () => {
    const migrated = migrateSchemaMappingDocument({
      version: 1,
      edges: [
        {
          id: 'e1',
          sourceFieldId: 'a',
          targetSlotId: 'b',
          transformIds: ['identity'],
        },
      ],
    });
    expect(migrated.version).toBe(SCHEMA_MAPPING_DOCUMENT_VERSION);
    expect(migrated.edges[0]?.sourceFieldId).toBe('a');
    expect(migrated.edges[0]?.targetSlotId).toBe('b');
  });

  it('migrate rejects unsupported versions and malformed shapes', () => {
    expect(() => migrateSchemaMappingDocument({ version: 2, edges: [] })).toThrow(
      UnsupportedSchemaMappingDocumentVersionError,
    );
    expect(() => migrateSchemaMappingDocument(null)).toThrow(InvalidSchemaMappingDocumentError);
    expect(() => migrateSchemaMappingDocument({ edges: [] })).toThrow(
      InvalidSchemaMappingDocumentError,
    );
  });
});
