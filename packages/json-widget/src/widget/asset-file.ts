import type { WidgetAssetCatalogContract, WidgetPlacementAsset } from '@workbench-kit/contracts';

import { jdwNodeToGenericWidget, parseJsonWidgetData, type JsonWidgetNode } from '../jdw/node.js';
import {
  discoverWidgetAssetPackages,
  formatWidgetAssetManifest,
  inferWidgetAssetPackagePath,
  inferWidgetAssetSlugFromPackagePath,
  isWidgetAssetContentPath,
  isWidgetAssetManifestPath,
  parseWidgetAssetPackage,
  resolveWidgetAssetPackageFiles,
} from './asset-package.js';
import { createWidgetAssetCatalog } from './placement-asset.js';
import type { GenericWidget } from './tree.js';

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

export interface CreateWidgetAssetCatalogFromJdwDocumentsOptions {
  /** Skip these workspace paths (typically the document currently being edited). */
  readonly excludePaths?: readonly string[] | undefined;
}

const JDW_DOCUMENT_EXTENSION = '.jdw.json';

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

export function isJdwWorkspaceDocumentPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return normalized.endsWith(JDW_DOCUMENT_EXTENSION) && !normalized.endsWith('.jdw.schema.json');
}

function jdwDocumentLabel(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  return base.endsWith(JDW_DOCUMENT_EXTENSION)
    ? base.slice(0, -JDW_DOCUMENT_EXTENSION.length)
    : base;
}

function jdwDocumentCategory(path: string): string {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/parts/')) {
    return 'parts';
  }
  if (normalized.includes('/composed/')) {
    return 'composed';
  }
  return 'documents';
}

function inferDocumentAssetKind(widget: GenericWidget): 'leaf' | 'container' | 'template' {
  if (Array.isArray(widget.children) || widget.child !== undefined) {
    return 'template';
  }
  return 'leaf';
}

function stripSchemaField(node: JsonWidgetNode): JsonWidgetNode {
  if (!('$schema' in node.args)) {
    return node;
  }
  const { $schema: _schema, ...args } = node.args;
  return { ...node, args };
}

/**
 * Build a palette catalog from workspace `*.jdw.json` documents so authors can
 * browse and place other JDW files (for example `jdw/parts/*`) like coding imports.
 */
export function createWidgetAssetCatalogFromJdwDocuments(
  files: readonly WorkspaceAssetFileRef[],
  options: CreateWidgetAssetCatalogFromJdwDocumentsOptions = {},
): WidgetAssetCatalogContract {
  const excluded = new Set((options.excludePaths ?? []).map((path) => path.replace(/\\/g, '/')));
  const assets: WidgetPlacementAsset[] = [];

  for (const file of files) {
    const path = file.path.replace(/\\/g, '/');
    if (!isJdwWorkspaceDocumentPath(path) || excluded.has(path)) {
      continue;
    }

    // Authored ref sources are for Code review; prefer drawable documents in the palette.
    if (path.toLowerCase().endsWith('.refs.jdw.json')) {
      continue;
    }

    const parsed = parseJsonWidgetData(file.content);
    if (parsed.parseError !== null || parsed.value === null) {
      continue;
    }

    // Skip pure ref roots — they are not drawable until expanded.
    if (parsed.value.type === 'ref') {
      continue;
    }

    const content = jdwNodeToGenericWidget(stripSchemaField(parsed.value));
    assets.push({
      id: `jdw-doc:${path}`,
      label: jdwDocumentLabel(path),
      description: `Workspace JDW · ${path}`,
      category: jdwDocumentCategory(path),
      kind: inferDocumentAssetKind(content),
      placementPolicy: 'preserve-internal-layout',
      icon: 'codicon-file',
      packagePath: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : path,
      content,
    });
  }

  return createWidgetAssetCatalog(assets);
}

export const EMPTY_WIDGET_ASSET_DOCUMENT = formatWidgetAssetManifest({
  id: 'new-asset',
  label: 'New Asset',
  category: 'content',
  kind: 'leaf',
});
