export const JDW_WIDGET_DOCUMENT_FILE_EXTENSION = '.jdw.json';
export const JDW_WIDGET_DOCUMENT_MIME = 'application/vnd.workbench-kit.jdw+json';
export const JDW_SCHEMA_DOCUMENT_FILE_EXTENSION = '.jdw.schema.json';
export const JDW_SCHEMA_DOCUMENT_MIME = 'application/vnd.workbench-kit.jdw-schema+json';

export interface JdwDocumentRef {
  readonly mimeType?: string | undefined;
  readonly path: string;
}

export type JdwSchemaDocumentRef = JdwDocumentRef;

export function isJdwDocumentPath(path: string): boolean {
  return path.toLowerCase().endsWith(JDW_WIDGET_DOCUMENT_FILE_EXTENSION);
}

export function isJdwDocumentMimeType(mimeType: string | undefined): boolean {
  return mimeType === JDW_WIDGET_DOCUMENT_MIME;
}

export function isJdwDocument(file: JdwDocumentRef): boolean {
  return isJdwDocumentMimeType(file.mimeType) || isJdwDocumentPath(file.path);
}

export function isJdwSchemaDocumentPath(path: string): boolean {
  return path.toLowerCase().endsWith(JDW_SCHEMA_DOCUMENT_FILE_EXTENSION);
}

export function isJdwSchemaDocumentMimeType(mimeType: string | undefined): boolean {
  return mimeType === JDW_SCHEMA_DOCUMENT_MIME;
}

export function isJdwSchemaDocument(file: JdwSchemaDocumentRef): boolean {
  return isJdwSchemaDocumentMimeType(file.mimeType) || isJdwSchemaDocumentPath(file.path);
}
