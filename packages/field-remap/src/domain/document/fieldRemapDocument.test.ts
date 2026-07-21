import { describe, expect, it } from 'vitest';
import {
  createFieldRemapDocument,
  deserializeFieldRemapDocument,
  InvalidFieldRemapDocumentError,
  migrateFieldRemapDocument,
  normalizeFieldRemapDocument,
  parseFieldRemapDocument,
  FIELD_REMAP_DOCUMENT_VERSION,
  serializeFieldRemapDocument,
  UnsupportedFieldRemapDocumentVersionError,
} from './fieldRemapDocument.js';

describe('FieldRemapDocument', () => {
  it('creates a versioned document with normalized edges', () => {
    const doc = createFieldRemapDocument([
      {
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformId: 'lookup:code-to-label',
      },
    ]);

    expect(doc.version).toBe(FIELD_REMAP_DOCUMENT_VERSION);
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
    const original = createFieldRemapDocument([
      {
        id: 'e1',
        sourceFieldId: 'src.a',
        targetSlotId: 'tgt.a',
        transformIds: ['identity'],
      },
    ]);
    const json = serializeFieldRemapDocument(original);
    const again = deserializeFieldRemapDocument(json);
    expect(again).toEqual(original);
    expect(serializeFieldRemapDocument(again)).toBe(json);
  });

  it('rejects unsupported versions and malformed shapes', () => {
    expect(() => parseFieldRemapDocument({ version: 2, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => normalizeFieldRemapDocument({ version: 2 as 1, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => parseFieldRemapDocument({ version: 1, edges: null })).toThrow(
      InvalidFieldRemapDocumentError,
    );
    expect(() => deserializeFieldRemapDocument('{')).toThrow(InvalidFieldRemapDocumentError);
  });

  it('migrates v1 documents via normalize passthrough', () => {
    const migrated = migrateFieldRemapDocument({
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
    expect(migrated.version).toBe(FIELD_REMAP_DOCUMENT_VERSION);
    expect(migrated.edges[0]?.sourceFieldId).toBe('a');
    expect(migrated.edges[0]?.targetSlotId).toBe('b');
  });

  it('migrate rejects unsupported versions and malformed shapes', () => {
    expect(() => migrateFieldRemapDocument({ version: 2, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => migrateFieldRemapDocument(null)).toThrow(InvalidFieldRemapDocumentError);
    expect(() => migrateFieldRemapDocument({ edges: [] })).toThrow(InvalidFieldRemapDocumentError);
  });
});
