import { describe, expect, it } from 'vitest';

import { JDW_DOCUMENT_MIME, JDW_SCHEMA_DOCUMENT_MIME } from '../../jdw/document.js';
import { mimeTypeForPath } from './mimeType.js';

describe('mimeTypeForPath', () => {
  it('predefines .jdw.json as a JDW JSON document', () => {
    expect(mimeTypeForPath('jdw/home.jdw.json')).toBe(JDW_DOCUMENT_MIME);
    expect(mimeTypeForPath('package.json')).toBe('application/json');
  });

  it('predefines .jdw.schema.json as a JDW schema document', () => {
    expect(mimeTypeForPath('schemas/widget-document.v1.jdw.schema.json')).toBe(
      JDW_SCHEMA_DOCUMENT_MIME,
    );
  });
});
