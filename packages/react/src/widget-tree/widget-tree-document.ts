import { JDW_WIDGET_DOCUMENT_MIME, isJdwDocumentPath } from '../jdw/document';

export interface WidgetTreeDocumentRef {
  readonly path: string;
  readonly mimeType?: string | undefined;
}

export function isWidgetTreeDocument(file: WidgetTreeDocumentRef): boolean {
  if (file.mimeType === JDW_WIDGET_DOCUMENT_MIME) {
    return true;
  }

  return isJdwDocumentPath(file.path);
}
