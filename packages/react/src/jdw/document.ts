export const JDW_DOCUMENT_FILE_EXTENSION = '.jdw.json';
export const JDW_DOCUMENT_MIME = 'application/vnd.workbench-kit.jdw+json';

export interface JdwDocumentRef {
  readonly mimeType?: string | undefined;
  readonly path: string;
}

export function isJdwDocumentPath(path: string): boolean {
  return path.toLowerCase().endsWith(JDW_DOCUMENT_FILE_EXTENSION);
}

export function isJdwDocumentMimeType(mimeType: string | undefined): boolean {
  return mimeType === JDW_DOCUMENT_MIME;
}

export function isJdwDocument(file: JdwDocumentRef): boolean {
  return isJdwDocumentMimeType(file.mimeType) || isJdwDocumentPath(file.path);
}
