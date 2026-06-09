export const WIDGET_TREE_DOCUMENT_MIME = 'application/vnd.workbench-kit.widget+json';

export interface WidgetTreeDocumentRef {
  readonly path: string;
  readonly mimeType?: string | undefined;
}

export function isWidgetTreeDocument(file: WidgetTreeDocumentRef): boolean {
  if (file.mimeType === WIDGET_TREE_DOCUMENT_MIME) {
    return true;
  }

  return file.path.endsWith('.widget.json');
}
