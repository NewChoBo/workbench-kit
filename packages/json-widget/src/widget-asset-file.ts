import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';

import {
  discoverWidgetAssetPackages,
  formatWidgetAssetManifest,
  inferWidgetAssetPackagePath,
  inferWidgetAssetSlugFromPackagePath,
  isWidgetAssetContentPath,
  isWidgetAssetManifestPath,
  parseWidgetAssetPackage,
  resolveWidgetAssetPackageFiles,
} from './widget-asset-package.js';
import { createWidgetAssetCatalog } from './widget-placement-asset.js';

export interface WidgetAssetDocument {
  readonly source: string;
  readonly parseError: string | null;
  readonly asset: WidgetPlacementAsset | null;
}

export interface WorkspaceAssetFileRef {
  readonly path: string;
  readonly content: string;
}

export interface CreateWidgetAssetDocumentOptions {
  readonly path?: string;
  readonly workspaceFiles?: readonly WorkspaceAssetFileRef[];
}

function formatJsonParseError(source: string): string | null {
  const normalized = source.trim();
  if (normalized.length === 0) {
    return 'JSON is empty.';
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return 'Root must be a JSON object.';
    }
    return null;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Invalid JSON.';
  }
}

export function createWidgetAssetDocument(
  source: string,
  options?: CreateWidgetAssetDocumentOptions,
): WidgetAssetDocument {
  const path = options?.path;
  const workspaceFiles = options?.workspaceFiles;

  if (path && workspaceFiles) {
    const packagePath = inferWidgetAssetPackagePath(path);
    if (packagePath) {
      const packageFiles = resolveWidgetAssetPackageFiles(
        workspaceFiles,
        packagePath,
        path,
        source,
      );
      if (packageFiles) {
        const parsed = parseWidgetAssetPackage(packageFiles);
        return {
          source,
          parseError: parsed.parseError,
          asset: parsed.value,
        };
      }
    }
  }

  if (path && (isWidgetAssetManifestPath(path) || isWidgetAssetContentPath(path))) {
    return {
      source,
      parseError: formatJsonParseError(source),
      asset: null,
    };
  }

  return {
    source,
    parseError: path
      ? 'Widget asset package is missing manifest.json or content.json.'
      : formatJsonParseError(source),
    asset: null,
  };
}

export function normalizeWidgetPlacementAsset(
  asset: WidgetPlacementAsset,
  sourcePath?: string,
): WidgetPlacementAsset {
  const inferredId =
    asset.id?.trim().length > 0
      ? asset.id.trim()
      : sourcePath
        ? inferWidgetAssetSlugFromPackagePath(inferWidgetAssetPackagePath(sourcePath) ?? sourcePath)
        : asset.label.trim().toLowerCase().replace(/\s+/g, '-');

  return {
    ...asset,
    id: inferredId,
  };
}

export function createWidgetAssetCatalogFromWorkspaceFiles(
  files: readonly WorkspaceAssetFileRef[],
): WidgetAssetCatalogContract {
  const assets: WidgetPlacementAsset[] = [];

  for (const packageFiles of discoverWidgetAssetPackages(files)) {
    const parsed = parseWidgetAssetPackage(packageFiles);
    if (parsed.parseError !== null || parsed.value === null) {
      continue;
    }

    assets.push(parsed.value);
  }

  return createWidgetAssetCatalog(assets);
}

export const EMPTY_WIDGET_ASSET_DOCUMENT = formatWidgetAssetManifest({
  id: 'new-asset',
  label: 'New Asset',
  category: 'content',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Text',
  } as WidgetPlacementAsset['defaultWidget'],
});
