import { describe, expect, it } from 'vitest';
import {
  createFieldRemapDocument,
  deserializeFieldRemapDocument,
  InvalidFieldRemapDocumentError,
  migrateFieldRemapDocument,
  normalizeFieldRemapDocument,
  parseFieldRemapDocument,
  FIELD_REMAP_DOCUMENT_VERSION,
  FIELD_REMAP_DOCUMENT_V1_VERSION,
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
        transformIds: ['lookup:code-to-label'],
      },
    ]);

    expect(doc.version).toBe(FIELD_REMAP_DOCUMENT_VERSION);
    expect(doc.edges).toEqual([
      {
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['lookup:code-to-label'],
      },
    ]);
    expect(doc.operators).toBeUndefined();
  });

  it('persists optional operators on document v2', () => {
    const doc = createFieldRemapDocument([], {
      operators: [
        {
          kind: 'combine',
          id: ' c1 ',
          inputFieldIds: ['a.date', 'a.time', ''],
          outputSlotId: 'b.startsAt',
          transformIds: ['datetime:combine', 'identity'],
        },
        {
          kind: 'split',
          id: 'bad',
          inputFieldId: 'a.when',
          outputSlotIds: ['only-one'],
        },
      ],
    });

    expect(doc.version).toBe(FIELD_REMAP_DOCUMENT_VERSION);
    expect(doc.operators).toEqual([
      {
        kind: 'combine',
        id: 'c1',
        inputFieldIds: ['a.date', 'a.time'],
        outputSlotId: 'b.startsAt',
        transformIds: ['datetime:combine'],
      },
    ]);
  });

  it('round-trips serialize → deserialize with stable JSON', () => {
    const original = createFieldRemapDocument(
      [
        {
          id: 'e1',
          sourceFieldId: 'src.a',
          targetSlotId: 'tgt.a',
          transformIds: ['identity'],
        },
      ],
      {
        operators: [
          {
            kind: 'split',
            id: 's1',
            inputFieldId: 'src.a',
            outputSlotIds: ['tgt.a', 'tgt.b'],
          },
        ],
      },
    );
    const json = serializeFieldRemapDocument(original);
    const again = deserializeFieldRemapDocument(json);
    expect(again).toEqual(original);
    expect(serializeFieldRemapDocument(again)).toBe(json);
  });

  it('rejects unsupported versions and malformed shapes', () => {
    expect(() => parseFieldRemapDocument({ version: 3, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => normalizeFieldRemapDocument({ version: 3 as 2, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => parseFieldRemapDocument({ version: 1, edges: null })).toThrow(
      InvalidFieldRemapDocumentError,
    );
    expect(() => parseFieldRemapDocument({ version: 2, edges: [], operators: {} })).toThrow(
      InvalidFieldRemapDocumentError,
    );
    expect(() => deserializeFieldRemapDocument('{')).toThrow(InvalidFieldRemapDocumentError);
  });

  it('migrates v1 documents to current version', () => {
    const migrated = migrateFieldRemapDocument({
      version: FIELD_REMAP_DOCUMENT_V1_VERSION,
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
    expect(migrated.operators).toBeUndefined();
  });

  it('parses v2 documents with operators', () => {
    const parsed = parseFieldRemapDocument({
      version: 2,
      edges: [],
      operators: [
        {
          kind: 'combine',
          id: 'c1',
          inputFieldIds: ['a.date', 'a.time'],
          outputSlotId: 'b.startsAt',
        },
      ],
    });
    expect(parsed.version).toBe(FIELD_REMAP_DOCUMENT_VERSION);
    expect(parsed.operators?.[0]?.kind).toBe('combine');
  });

  it('migrate rejects unsupported versions and malformed shapes', () => {
    expect(() => migrateFieldRemapDocument({ version: 3, edges: [] })).toThrow(
      UnsupportedFieldRemapDocumentVersionError,
    );
    expect(() => migrateFieldRemapDocument(null)).toThrow(InvalidFieldRemapDocumentError);
    expect(() => migrateFieldRemapDocument({ edges: [] })).toThrow(InvalidFieldRemapDocumentError);
  });
});
