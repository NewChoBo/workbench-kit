export const WIDGET_ASSET_DOCUMENT_MIME = 'application/vnd.workbench-kit.widget-asset+json';

export interface WidgetAssetDocumentRef {
  readonly path: string;
  readonly mimeType?: string | undefined;
}

export function isWidgetAssetDocument(file: WidgetAssetDocumentRef): boolean {
  if (file.mimeType === WIDGET_ASSET_DOCUMENT_MIME) {
    return true;
  }

  return file.path.endsWith('.asset.json');
}
