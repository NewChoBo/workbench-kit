import type { ServiceResultEnvelope } from './result';

export type LibraryItemKind = 'app' | 'command' | 'folder' | 'game' | 'other' | 'tile' | 'url';
export type LibrarySourceKind = 'embedded-json' | 'json-file' | 'json-url';
export type LibrarySortMode = 'installed' | 'provider' | 'title';
export type LibraryManifestErrorCode =
  | 'invalid-item'
  | 'invalid-manifest'
  | 'invalid-json'
  | 'invalid-source'
  | 'missing-manifest';

export interface ServiceLibraryFailure {
  code: LibraryManifestErrorCode;
  kind: 'library:failure';
  source?: LibrarySource;
}

export interface ServiceLibrarySuccess {
  kind: 'library:success';
  catalog: LibraryCatalogSnapshot;
}

export type LibraryServiceResult = ServiceLibraryFailure | ServiceLibrarySuccess;

export interface LibrarySource {
  kind: LibrarySourceKind;
  ref: string;
  displayName?: string;
  sourceId?: string;
}

export interface LibraryItemDescriptor {
  categories?: readonly string[];
  description?: string;
  id: string;
  installed?: boolean;
  installPath?: string;
  kind: LibraryItemKind;
  launchTarget?: string;
  metadata?: Record<string, unknown>;
  providerId?: string;
  source: LibrarySource;
  tags?: readonly string[];
  title: string;
}

export interface LibraryManifest {
  description?: string;
  generatedAt?: string;
  id: string;
  items: readonly LibraryItemDescriptor[];
  name: string;
  schemaVersion: number;
  source: LibrarySource;
  tags?: readonly string[];
  version: string;
}

export interface LibraryProvider {
  id: string;
  displayName: string;
  listItems(): Promise<readonly LibraryItemDescriptor[]>;
}

export interface LibraryProviderSummary {
  itemCount?: number;
  itemCountText?: string;
  sourceId: string;
  title: string;
  state: 'error' | 'ready';
  error?: string;
}

export interface LibraryCatalogSnapshot extends ServiceResultEnvelope {
  cachedAt: string;
  fromCache: boolean;
  items: readonly LibraryItemDescriptor[];
  providers: readonly LibraryProviderSummary[];
  query?: LibraryQuery;
}

export interface LibraryQuery {
  installed?: boolean;
  kinds?: readonly LibraryItemKind[];
  limit?: number;
  providerIds?: readonly string[];
  q?: string;
  sortBy?: LibrarySortMode;
  tags?: readonly string[];
}

export interface LibraryDragPayload {
  itemIds: readonly string[];
  sourceIds?: readonly string[];
}

export const LIBRARY_DRAG_DATA_TYPE = 'application/x-newchobo-ui-library-items';
export const LIBRARY_DRAG_IDS_DATA_TYPE = 'application/x-newchobo-ui-library-item-ids';

export interface LibraryQueryOptions {
  query?: LibraryQuery;
}

export const DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID = 'unknown';

export interface LibraryItemIdentifierOptions {
  providerId: string;
}

export function normalizeLibraryItemProviderSource(
  item: LibraryItemDescriptor,
  options: LibraryItemIdentifierOptions,
): LibraryItemDescriptor {
  return {
    ...item,
    providerId: item.providerId ?? options.providerId,
    source: {
      ...item.source,
      sourceId: item.source.sourceId ?? options.providerId,
    },
  };
}

export function resolveLibraryItemProviderId(
  item: LibraryItemDescriptor,
  fallback = DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID,
): string {
  return item.providerId ?? item.source.sourceId ?? fallback;
}

export function resolveLibraryItemSourceId(
  item: LibraryItemDescriptor,
  fallback = DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID,
): string {
  return item.source.sourceId ?? item.providerId ?? fallback;
}

export function createLibraryItemIdentity(
  item: LibraryItemDescriptor,
  fallback = DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID,
): string {
  return `${resolveLibraryItemProviderId(item, fallback)}:${item.id}`;
}

export function matchesLibraryItem(item: LibraryItemDescriptor, query: LibraryQuery = {}): boolean {
  if (query.providerIds && query.providerIds.length > 0) {
    const providerId = item.providerId ?? item.source?.sourceId;
    if (!providerId || !query.providerIds.includes(providerId)) {
      return false;
    }
  }

  if (query.kinds && query.kinds.length > 0 && !query.kinds.includes(item.kind)) {
    return false;
  }

  if (query.installed !== undefined && Boolean(item.installed) !== query.installed) {
    return false;
  }

  if (query.tags && query.tags.length > 0) {
    if (!item.tags) {
      return false;
    }

    for (const tag of query.tags) {
      if (!item.tags.includes(tag)) {
        return false;
      }
    }
  }

  const rawQuery = (query.q ?? '').trim().toLowerCase();
  if (!rawQuery) {
    return true;
  }

  const providerText = resolveLibraryItemProviderId(item, '');
  const targetText =
    `${item.id} ${item.title} ${providerText} ${item.description ?? ''}`.toLowerCase();
  return targetText.includes(rawQuery);
}

export function normalizeLibraryManifestVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error('library manifest schemaVersion must be a positive integer');
  }
  return value;
}

export function parseLibraryManifest(raw: unknown, source = 'library.json'): LibraryManifest {
  const root = asRecord(raw, source);

  const manifestVersion = normalizeLibraryManifestVersion(root['schemaVersion']);
  const manifestSource = parseLibrarySource(root['source'], `${source}.source`, false);
  const items = parseLibraryItems(root['items'], manifestSource, `${source}.items`);

  return {
    id: asString(root['id'], `${source}.id`),
    name: asString(root['name'], `${source}.name`),
    schemaVersion: manifestVersion,
    source: manifestSource,
    version: asString(root['version'], `${source}.version`),
    description: asOptionalString(root['description']),
    generatedAt: asOptionalString(root['generatedAt']),
    tags: asOptionalStringArray(root['tags'], `${source}.tags`),
    items,
  };
}

export function parseLibraryManifestText(text: string, source = 'library.json'): LibraryManifest {
  return parseLibraryManifest(parseJsonText(text, source), source);
}

export function createLibraryDragPayload(
  itemIds: readonly string[],
  sourceIds: readonly string[] = [],
): string {
  const payload: LibraryDragPayload = {
    itemIds,
    sourceIds,
  };
  return JSON.stringify(payload);
}

export function parseLibraryDragPayload(value: string): LibraryDragPayload {
  const parsed = parseJsonText(value, 'library drag payload');
  const payload = asRecord(parsed, 'library drag payload');
  const itemIds = asStringArray(payload['itemIds'], 'library drag payload.itemIds');
  const sourceIds = asOptionalStringArray(payload['sourceIds'], 'library drag payload.sourceIds');
  return {
    itemIds,
    sourceIds,
  };
}

function parseLibraryItems(
  raw: unknown,
  defaultSource: LibrarySource,
  sourcePath: string,
): readonly LibraryItemDescriptor[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new Error(`${sourcePath} must be an array`);
  }
  return raw.map((entry, index) =>
    parseLibraryItem(entry, defaultSource, `${sourcePath}[${index}]`),
  );
}

function parseLibraryItem(
  raw: unknown,
  defaultSource: LibrarySource,
  sourcePath: string,
): LibraryItemDescriptor {
  const record = asRecord(raw, sourcePath);
  const kind = parseLibraryItemKind(record['kind'], `${sourcePath}.kind`);
  const itemSource =
    record['source'] === undefined
      ? defaultSource
      : parseLibrarySource(record['source'], `${sourcePath}.source`, true);

  return {
    categories: asOptionalStringArray(record['categories'], `${sourcePath}.categories`),
    description: asOptionalString(record['description']),
    id: asString(record['id'], `${sourcePath}.id`),
    installed: asOptionalBoolean(record['installed'], `${sourcePath}.installed`),
    installPath: asOptionalString(record['installPath']),
    kind,
    launchTarget: asOptionalString(record['launchTarget']),
    metadata: asOptionalRecord(record['metadata']),
    providerId: asOptionalString(record['providerId']),
    source: itemSource,
    tags: asOptionalStringArray(record['tags'], `${sourcePath}.tags`),
    title: asString(record['title'], `${sourcePath}.title`),
  };
}

function parseLibrarySource(raw: unknown, sourcePath: string, allowMissing = false): LibrarySource {
  if (raw === undefined) {
    if (!allowMissing) {
      throw new Error(`${sourcePath} is required`);
    }
    throw new Error(`${sourcePath} is required when item-level source is missing`);
  }

  const record = asRecord(raw, sourcePath);
  const kind = record['kind'];
  if (!isLibrarySourceKind(kind)) {
    throw new Error(`${sourcePath}.kind must be one of embedded-json, json-file, or json-url`);
  }

  return {
    displayName: asOptionalString(record['displayName']),
    kind,
    ref: asString(record['ref'], `${sourcePath}.ref`),
    sourceId: asOptionalString(record['sourceId']),
  };
}

function parseLibraryItemKind(raw: unknown, sourcePath: string): LibraryItemKind {
  if (typeof raw !== 'string') {
    throw new Error(`${sourcePath} must be string`);
  }

  if (
    raw === 'app' ||
    raw === 'command' ||
    raw === 'folder' ||
    raw === 'game' ||
    raw === 'other' ||
    raw === 'tile' ||
    raw === 'url'
  ) {
    return raw;
  }

  throw new Error(`${sourcePath} must be app, command, folder, game, other, tile, or url`);
}

function parseJsonText(text: string, source = 'library manifest'): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const parsedError = new Error(`${source}: invalid JSON (${message})`);
    (parsedError as { cause?: unknown }).cause = error;
    throw parsedError;
  }
}

function asRecord(value: unknown, sourcePath: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${sourcePath} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function asString(value: unknown, sourcePath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${sourcePath} must be non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    return String(value);
  }
  return value;
}

function asOptionalStringArray(value: unknown, sourcePath: string): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${sourcePath} must be a string array`);
  }
  return value;
}

function asStringArray(value: unknown, sourcePath: string): readonly string[] {
  const values = asOptionalStringArray(value, sourcePath);
  if (!values) {
    throw new Error(`${sourcePath} must be a string array`);
  }
  if (values.length === 0) {
    throw new Error(`${sourcePath} must contain at least one id`);
  }
  return values;
}

function asOptionalBoolean(value: unknown, sourcePath: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${sourcePath} must be boolean`);
  }
  return value;
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return asRecord(value, 'metadata');
}

function isLibrarySourceKind(value: unknown): value is LibrarySourceKind {
  return value === 'embedded-json' || value === 'json-file' || value === 'json-url';
}
