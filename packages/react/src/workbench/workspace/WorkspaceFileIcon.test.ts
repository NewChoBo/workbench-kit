import { describe, expect, it } from 'vitest';
import { JDW_DOCUMENT_MIME, JDW_SCHEMA_DOCUMENT_MIME } from '../../jdw/document';
import { codiconForFileKind, fileIconKindForPath } from './WorkspaceFileIcon';

describe('WorkspaceFileIcon', () => {
  it('distinguishes JDW widget and schema documents from generic JSON files', () => {
    expect(fileIconKindForPath('jdw/workbench-sample.jdw.json')).toBe('jdw');
    expect(fileIconKindForPath('schemas/widget-document.v1.jdw.schema.json')).toBe('jdw-schema');
    expect(fileIconKindForPath('schemas/example.schema.json')).toBe('schema');
    expect(fileIconKindForPath('package.json')).toBe('package');
    expect(fileIconKindForPath('config.json')).toBe('json');
  });

  it('uses JDW mime types when a host provides them', () => {
    expect(fileIconKindForPath('untitled', JDW_DOCUMENT_MIME)).toBe('jdw');
    expect(fileIconKindForPath('untitled', JDW_SCHEMA_DOCUMENT_MIME)).toBe('jdw-schema');
    expect(fileIconKindForPath('untitled', 'application/schema+json')).toBe('schema');
  });

  it('maps domain document kinds to non-error icons', () => {
    expect(codiconForFileKind('jdw')).toBe('codicon-layout');
    expect(codiconForFileKind('jdw-schema')).toBe('codicon-symbol-property');
    expect(codiconForFileKind('schema')).toBe('codicon-symbol-property');
  });
});
