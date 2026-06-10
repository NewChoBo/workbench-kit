import type { WidgetPlacementAsset, WidgetPlacementAssetKind } from '@workbench-kit/contracts';

import { genericWidgetToJdwNode, jdwNodeToGenericWidget, type JsonWidgetNode } from './jdw-node.js';
import type { GenericWidget } from './widget-tree.js';
import type { WorkspaceAssetFileRef } from './widget-asset-file.js';
import { normalizeWidgetPlacementAsset } from './widget-asset-file.js';
import { readPlacementPolicy } from './widget-placement-policy.js';

export const WIDGET_ASSET_MANIFEST_FILENAME = 'manifest.json';
export const WIDGET_ASSET_CONTENT_FILENAME = 'content.json';
export const WIDGET_ASSET_SCHEMA_FILENAME = 'schema.json';

export interface WidgetAssetPackageFiles {
  readonly packagePath: string;
  readonly manifestSource: string;
  readonly contentSource: string;
  readonly schemaSource?: string | undefined;
}

export interface ParsedWidgetAssetPackage {
  readonly value: WidgetPlacementAsset | null;
  readonly parseError: string | null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

const ASSET_KINDS = new Set<WidgetPlacementAssetKind>(['leaf', 'container', 'template']);

function readOptionalKind(record: Record<string, unknown>): WidgetPlacementAssetKind | undefined {
  const value = readOptionalString(record, 'kind');
  if (!value || !ASSET_KINDS.has(value as WidgetPlacementAssetKind)) {
    return undefined;
  }
  return value as WidgetPlacementAssetKind;
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

function readContentNode(source: string, errors: string[]): JsonWidgetNode | null {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!isObjectRecord(parsed)) {
      errors.push('content.json root must be a JSON object.');
      return null;
    }

    if (!isObjectRecord(parsed.args)) {
      errors.push('content.json must use JDW v7 envelope (type + args).');
      return null;
    }

    const type = parsed.type;
    if (typeof type !== 'string' || type.trim().length === 0) {
      errors.push('content.json type must be a non-empty string.');
      return null;
    }

    return {
      type: type.trim(),
      args: parsed.args,
      ...(typeof parsed.id === 'string' && parsed.id.trim().length > 0
        ? { id: parsed.id.trim() }
        : {}),
    };
  } catch {
    errors.push('content.json is not valid JSON.');
    return null;
  }
}

function readInputsSchema(source: string, errors: string[]): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!isObjectRecord(parsed)) {
      errors.push('schema.json root must be a JSON object.');
      return undefined;
    }
    return parsed;
  } catch {
    errors.push('schema.json is not valid JSON.');
    return undefined;
  }
}

export function isWidgetAssetManifestPath(path: string): boolean {
  return path.endsWith(`/${WIDGET_ASSET_MANIFEST_FILENAME}`);
}

export function isWidgetAssetContentPath(path: string): boolean {
  return path.endsWith(`/${WIDGET_ASSET_CONTENT_FILENAME}`);
}

export function isWidgetAssetSchemaPath(path: string): boolean {
  return path.endsWith(`/${WIDGET_ASSET_SCHEMA_FILENAME}`);
}

export function isWidgetAssetPackageFilePath(path: string): boolean {
  return (
    isWidgetAssetManifestPath(path) ||
    isWidgetAssetContentPath(path) ||
    isWidgetAssetSchemaPath(path)
  );
}

export function inferWidgetAssetPackagePath(path: string): string | null {
  if (isWidgetAssetManifestPath(path)) {
    return path.slice(0, -`/${WIDGET_ASSET_MANIFEST_FILENAME}`.length);
  }
  if (isWidgetAssetContentPath(path)) {
    return path.slice(0, -`/${WIDGET_ASSET_CONTENT_FILENAME}`.length);
  }
  if (isWidgetAssetSchemaPath(path)) {
    return path.slice(0, -`/${WIDGET_ASSET_SCHEMA_FILENAME}`.length);
  }
  return null;
}

export function inferWidgetAssetSlugFromPackagePath(packagePath: string): string {
  return packagePath.split('/').pop() ?? packagePath;
}

export function resolveWidgetAssetPackageFiles(
  files: readonly WorkspaceAssetFileRef[],
  packagePath: string,
  editedPath?: string,
  editedSource?: string,
): WidgetAssetPackageFiles | null {
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  const manifestPath = `${packagePath}/${WIDGET_ASSET_MANIFEST_FILENAME}`;
  const contentPath = `${packagePath}/${WIDGET_ASSET_CONTENT_FILENAME}`;
  const schemaPath = `${packagePath}/${WIDGET_ASSET_SCHEMA_FILENAME}`;

  const manifestSource =
    editedPath === manifestPath && editedSource !== undefined
      ? editedSource
      : byPath.get(manifestPath);
  const contentSource =
    editedPath === contentPath && editedSource !== undefined
      ? editedSource
      : byPath.get(contentPath);

  if (!manifestSource || !contentSource) {
    return null;
  }

  const schemaSource =
    editedPath === schemaPath && editedSource !== undefined ? editedSource : byPath.get(schemaPath);

  return {
    packagePath,
    manifestSource,
    contentSource,
    ...(schemaSource ? { schemaSource } : {}),
  };
}

export function discoverWidgetAssetPackages(
  files: readonly WorkspaceAssetFileRef[],
): WidgetAssetPackageFiles[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const packages: WidgetAssetPackageFiles[] = [];

  for (const file of files) {
    if (!isWidgetAssetManifestPath(file.path)) {
      continue;
    }

    const packagePath = inferWidgetAssetPackagePath(file.path);
    if (!packagePath) {
      continue;
    }

    const contentFile = byPath.get(`${packagePath}/${WIDGET_ASSET_CONTENT_FILENAME}`);
    if (!contentFile) {
      continue;
    }

    const schemaFile = byPath.get(`${packagePath}/${WIDGET_ASSET_SCHEMA_FILENAME}`);
    packages.push({
      packagePath,
      manifestSource: file.content,
      contentSource: contentFile.content,
      ...(schemaFile ? { schemaSource: schemaFile.content } : {}),
    });
  }

  return packages;
}

export function parseWidgetAssetPackage(
  packageFiles: WidgetAssetPackageFiles,
): ParsedWidgetAssetPackage {
  const errors: string[] = [];

  let manifestRecord: Record<string, unknown>;
  try {
    const parsed = JSON.parse(packageFiles.manifestSource) as unknown;
    if (!isObjectRecord(parsed)) {
      return { value: null, parseError: 'manifest.json root must be a JSON object.' };
    }
    manifestRecord = parsed;
  } catch {
    return { value: null, parseError: 'manifest.json is not valid JSON.' };
  }

  const name = readOptionalString(manifestRecord, 'name') ?? null;
  const label = readRequiredString(manifestRecord, 'label', errors);
  const category = readRequiredString(manifestRecord, 'category', errors);
  const contentNode = readContentNode(packageFiles.contentSource, errors);

  if (!name) {
    errors.push('"name" must be a non-empty string.');
  }

  const inputsSchema = packageFiles.schemaSource
    ? readInputsSchema(packageFiles.schemaSource, errors)
    : undefined;

  if (errors.length > 0 || !label || !category || !contentNode || !name) {
    return { value: null, parseError: errors.join(' ') };
  }

  const kind = readOptionalKind(manifestRecord);
  const placementPolicy = readPlacementPolicy(manifestRecord.placementPolicy);
  const asset: WidgetPlacementAsset = {
    id: name,
    label,
    category,
    content: jdwNodeToGenericWidget(contentNode) as WidgetPlacementAsset['content'],
    packagePath: packageFiles.packagePath,
    ...(kind ? { kind } : {}),
    ...(placementPolicy ? { placementPolicy } : {}),
    ...(readOptionalString(manifestRecord, 'description')
      ? { description: readOptionalString(manifestRecord, 'description') }
      : {}),
    ...(readOptionalString(manifestRecord, 'icon')
      ? { icon: readOptionalString(manifestRecord, 'icon') }
      : {}),
    ...(inputsSchema ? { inputsSchema } : {}),
  };

  return {
    value: normalizeWidgetPlacementAsset(asset, packageFiles.packagePath),
    parseError: null,
  };
}

export interface WidgetAssetManifestFields {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly description?: string | undefined;
  readonly kind?: WidgetPlacementAssetKind | undefined;
  readonly placementPolicy?: WidgetPlacementAsset['placementPolicy'];
  readonly icon?: string | undefined;
}

export function formatWidgetAssetManifest(fields: WidgetAssetManifestFields): string {
  const payload = {
    $schema: 'https://workbench-kit.dev/schemas/widget-asset-manifest.v1.json',
    name: fields.id,
    version: '1.0.0',
    label: fields.label,
    ...(fields.description ? { description: fields.description } : {}),
    category: fields.category,
    ...(fields.kind ? { kind: fields.kind } : {}),
    ...(fields.placementPolicy ? { placementPolicy: fields.placementPolicy } : {}),
    ...(fields.icon ? { icon: fields.icon } : {}),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function formatWidgetAssetContent(widget: GenericWidget): string {
  return `${JSON.stringify(genericWidgetToJdwNode(widget), null, 2)}\n`;
}
