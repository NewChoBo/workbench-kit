import { describe, expect, it } from 'vitest';

import {
  JDW_SCHEMA_DOCUMENT_FILE_EXTENSION,
  JDW_SCHEMA_DOCUMENT_MIME,
  JDW_WIDGET_DOCUMENT_MIME,
  isJdwDocument,
  isJdwDocumentMimeType,
  isJdwDocumentPath,
  isJdwSchemaDocument,
  isJdwSchemaDocumentMimeType,
  isJdwSchemaDocumentPath,
} from './document.js';

describe('JDW document file type helpers', () => {
  it('separates widget documents from schema documents by extension and MIME', () => {
    expect(isJdwDocumentPath('jdw/home.jdw.json')).toBe(true);
    expect(isJdwDocumentMimeType(JDW_WIDGET_DOCUMENT_MIME)).toBe(true);
    expect(isJdwDocument({ path: 'jdw/home.jdw.json' })).toBe(true);

    expect(isJdwDocumentPath('schemas/widget-document.v1.jdw.schema.json')).toBe(false);
    expect(isJdwDocumentMimeType(JDW_SCHEMA_DOCUMENT_MIME)).toBe(false);
    expect(
      isJdwDocument({
        mimeType: JDW_SCHEMA_DOCUMENT_MIME,
        path: 'schemas/widget-document.v1.jdw.schema.json',
      }),
    ).toBe(false);
  });

  it('recognizes JDW schema documents by extension and MIME', () => {
    expect(JDW_SCHEMA_DOCUMENT_FILE_EXTENSION).toBe('.jdw.schema.json');
    expect(isJdwSchemaDocumentPath('schemas/widget-document.v1.jdw.schema.json')).toBe(true);
    expect(isJdwSchemaDocumentMimeType(JDW_SCHEMA_DOCUMENT_MIME)).toBe(true);
    expect(
      isJdwSchemaDocument({
        mimeType: JDW_SCHEMA_DOCUMENT_MIME,
        path: 'schemas/widget-document.v1.jdw.schema.json',
      }),
    ).toBe(true);
  });
});
