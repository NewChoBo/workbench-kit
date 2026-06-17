import {
  isWidgetAssetContentPath,
  isWidgetAssetPackageFilePath,
  isWidgetAssetSchemaPath,
} from '@workbench-kit/jdw';

export const WIDGET_ASSET_MANIFEST_MIME =
  'application/vnd.workbench-kit.widget-asset-manifest+json';
export const WIDGET_ASSET_CONTENT_MIME = 'application/vnd.workbench-kit.widget-asset-content+json';
export const WIDGET_ASSET_SCHEMA_MIME = 'application/vnd.workbench-kit.widget-asset-schema+json';

export interface WidgetAssetDocumentRef {
  readonly path: string;
  readonly mimeType?: string | undefined;
}

export function resolveWidgetAssetMimeType(path: string): string {
  if (isWidgetAssetContentPath(path)) {
    return WIDGET_ASSET_CONTENT_MIME;
  }
  if (isWidgetAssetSchemaPath(path)) {
    return WIDGET_ASSET_SCHEMA_MIME;
  }
  return WIDGET_ASSET_MANIFEST_MIME;
}

export function isWidgetAssetDocument(file: WidgetAssetDocumentRef): boolean {
  if (
    file.mimeType === WIDGET_ASSET_MANIFEST_MIME ||
    file.mimeType === WIDGET_ASSET_CONTENT_MIME ||
    file.mimeType === WIDGET_ASSET_SCHEMA_MIME
  ) {
    return true;
  }

  return isWidgetAssetPackageFilePath(file.path);
}
