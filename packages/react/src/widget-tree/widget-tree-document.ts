import { JDW_DOCUMENT_MIME, isJdwDocumentPath } from '../jdw/document';

export const WIDGET_TREE_DOCUMENT_MIME = 'application/vnd.workbench-kit.widget+json';
export const WIDGET_TREE_DOCUMENT_FILE_EXTENSION = '.widget.json';

export interface WidgetTreeDocumentRef {
  readonly path: string;
  readonly mimeType?: string | undefined;
}

export function isWidgetTreeDocument(file: WidgetTreeDocumentRef): boolean {
  if (file.mimeType === WIDGET_TREE_DOCUMENT_MIME || file.mimeType === JDW_DOCUMENT_MIME) {
    return true;
  }

  const normalizedPath = file.path.toLowerCase();
  return (
    normalizedPath.endsWith(WIDGET_TREE_DOCUMENT_FILE_EXTENSION) || isJdwDocumentPath(file.path)
  );
}
