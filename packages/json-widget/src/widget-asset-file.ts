import type {
  WidgetAssetCatalogContract,
  WidgetPlacementAsset,
} from '@workbench-kit/contracts';

import {
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  type JsonWidgetNode,
} from './jdw-node.js';
import { createWidgetAssetCatalog } from './widget-placement-asset.js';
import type { GenericWidget } from './widget-tree.js';

export const WIDGET_ASSET_FILE_SUFFIX = '.asset.json';

export interface ParsedWidgetAssetJson {
  readonly value: WidgetPlacementAsset | null;
  readonly parseError: string | null;
}

export interface WidgetAssetDocument {
  readonly source: string;
  readonly parseError: string | null;
  readonly asset: WidgetPlacementAsset | null;
}

export interface WorkspaceAssetFileRef {
  readonly path: string;
  readonly content: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatParseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Invalid JSON.';
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`"${key}" must be a non-empty string.`);
    return null;
  }
  return value.trim();
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readContentNode(
  record: Record<string, unknown>,
  errors: string[],
): JsonWidgetNode | null {
  const content = record.content ?? record.defaultWidget;
  if (!isObjectRecord(content)) {
    errors.push('"content" must be a JDW widget object.');
    return null;
  }

  if (!isObjectRecord(content.args) && !('args' in content)) {
    errors.push('"content" must use JDW v7 envelope (type + args).');
    return null;
  }

  if (!isObjectRecord(content.args)) {
    errors.push('"content.args" must be an object.');
    return null;
  }

  const type = content.type;
  if (typeof type !== 'string' || type.trim().length === 0) {
    errors.push('"content.type" must be a non-empty string.');
    return null;
  }

  return {
    type: type.trim(),
    args: content.args,
    ...(typeof content.id === 'string' && content.id.trim().length > 0
      ? { id: content.id.trim() }
      : {}),
  };
}

export function isWidgetAssetFilePath(path: string): boolean {
  return path.endsWith(WIDGET_ASSET_FILE_SUFFIX);
}

export function inferWidgetAssetIdFromPath(path: string): string {
  const fileName = path.split('/').pop() ?? path;
  return fileName.endsWith(WIDGET_ASSET_FILE_SUFFIX)
    ? fileName.slice(0, -WIDGET_ASSET_FILE_SUFFIX.length)
    : fileName;
}

export function parseWidgetAssetJson(source: string): ParsedWidgetAssetJson {
  const normalized = source.trim();
  if (normalized.length === 0) {
    return {
      value: null,
      parseError: 'JSON is empty.',
    };
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!isObjectRecord(parsed)) {
      return {
        value: null,
        parseError: 'Root must be a JSON object.',
      };
    }

    const errors: string[] = [];
    const name =
      readOptionalString(parsed, 'name') ??
      readOptionalString(parsed, 'id') ??
      null;
    const label = readRequiredString(parsed, 'label', errors);
    const category = readRequiredString(parsed, 'category', errors);
    const content = readContentNode(parsed, errors);

    if (!name) {
      errors.push('"name" must be a non-empty string.');
    }

    if (errors.length > 0 || !label || !category || !content || !name) {
      return {
        value: null,
        parseError: errors.join(' '),
      };
    }

    const defaultWidget = jdwNodeToGenericWidget(content);
    const asset: WidgetPlacementAsset = {
      id: name,
      label,
      category,
      widgetType: content.type,
      defaultWidget,
      ...(readOptionalString(parsed, 'description')
        ? { description: readOptionalString(parsed, 'description') }
        : {}),
      ...(readOptionalString(parsed, 'icon') ? { icon: readOptionalString(parsed, 'icon') } : {}),
    };

    return {
      value: asset,
      parseError: null,
    };
  } catch (error) {
    return {
      value: null,
      parseError: formatParseError(error),
    };
  }
}

export function formatWidgetAssetJson(asset: WidgetPlacementAsset): string {
  const payload = {
    name: asset.id,
    version: '1.0.0',
    label: asset.label,
    ...(asset.description ? { description: asset.description } : {}),
    category: asset.category,
    ...(asset.icon ? { icon: asset.icon } : {}),
    content: genericWidgetToJdwNode(asset.defaultWidget as GenericWidget),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function createWidgetAssetDocument(source: string): WidgetAssetDocument {
  const parsed = parseWidgetAssetJson(source);
  return {
    source,
    parseError: parsed.parseError,
    asset: parsed.value,
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
        ? inferWidgetAssetIdFromPath(sourcePath)
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

  for (const file of files) {
    if (!isWidgetAssetFilePath(file.path)) {
      continue;
    }

    const parsed = parseWidgetAssetJson(file.content);
    if (parsed.parseError !== null || parsed.value === null) {
      continue;
    }

    assets.push(normalizeWidgetPlacementAsset(parsed.value, file.path));
  }

  return createWidgetAssetCatalog(assets);
}

export const EMPTY_WIDGET_ASSET_DOCUMENT = formatWidgetAssetJson({
  id: 'new-asset',
  label: 'New Asset',
  category: 'content',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Text',
  } as WidgetPlacementAsset['defaultWidget'],
});
