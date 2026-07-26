/**
 * Lightweight path helpers for collection item projection and safe templates.
 * Supports dotted paths (`name`, `meta.label`), indexes (`items[0].name`),
 * and wildcard projection (`items[*].name`).
 */

import {
  InvalidObjectPathError,
  isSafeObjectPath,
  objectPathHasWildcard,
  parseObjectPath,
  type ObjectPathSegment,
  UnsafeObjectPathError,
} from './objectPathSafety.js';

/** Default cap for `[*]` expansion to avoid resource exhaustion. */
export const DEFAULT_MAX_PATH_WILDCARD_EXPANSION = 1_000;

/** Placeholder matcher: `{city}`, `{a.b}` — rejects expressions / spaces / brackets. */
const TEMPLATE_PLACEHOLDER_RE = /\{([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\}/g;

export class PathExpansionLimitError extends Error {
  readonly code = 'path_expansion_limit' as const;
  readonly path: string;
  readonly limit: number;

  constructor(path: string, limit: number) {
    super(`Object path "${path}" exceeded wildcard expansion limit (${limit}).`);
    this.name = 'PathExpansionLimitError';
    this.path = path;
    this.limit = limit;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fill `{path}` placeholders from a plain object using safe dotted paths only.
 * Unknown / unsafe placeholders become empty strings. No JS eval.
 * Index/wildcard placeholders are not supported (left unchanged / empty).
 */
export function applyStringTemplate(
  template: string,
  record: Readonly<Record<string, unknown>> | null | undefined,
): string {
  return template.replace(TEMPLATE_PLACEHOLDER_RE, (_match, path: string) => {
    if (!record || !isSafeObjectPath(path) || objectPathHasWildcard(path)) {
      return '';
    }
    const resolved = readObjectPath(record, path);
    if (resolved === null || resolved === undefined) {
      return '';
    }
    if (
      typeof resolved === 'string' ||
      typeof resolved === 'number' ||
      typeof resolved === 'boolean'
    ) {
      return String(resolved);
    }
    return '';
  });
}

function readProperty(current: unknown, name: string): unknown {
  if (current === null || current === undefined || typeof current !== 'object') {
    return undefined;
  }
  return (current as Record<string, unknown>)[name];
}

function readSegment(current: unknown, segment: ObjectPathSegment): unknown {
  const container = readProperty(current, segment.name);
  if (segment.kind === 'property') {
    return container;
  }
  if (segment.kind === 'index') {
    if (!Array.isArray(container)) {
      return undefined;
    }
    return container[segment.index];
  }
  // Wildcard is not a single-value read.
  throw new InvalidObjectPathError(
    segment.name,
    'wildcard segments require projectObjectPath',
  );
}

/**
 * Read a single value at `path`. Supports property and numeric index segments.
 * Wildcard (`[*]`) paths throw {@link InvalidObjectPathError} — use
 * {@link projectObjectPath} instead.
 */
export function readObjectPath(value: unknown, path: string): unknown {
  const segments = parseObjectPath(path);
  if (segments.length === 0) {
    return value;
  }
  if (segments.some((segment) => segment.kind === 'wildcard')) {
    throw new InvalidObjectPathError(path, 'wildcard segments require projectObjectPath');
  }

  let current: unknown = value;
  for (const segment of segments) {
    current = readSegment(current, segment);
    if (current === undefined) {
      return undefined;
    }
  }
  return current;
}

export interface ProjectObjectPathOptions {
  /** Max values produced by all `[*]` expansions combined (default 1000). */
  readonly maxExpansion?: number;
}

/**
 * Project values through a path that may include `[*]` wildcards and indexes.
 * Non-array containers under a wildcard / missing paths fail closed (`[]` for
 * a leading wildcard miss; `undefined` leaves when a non-wildcard branch misses).
 */
export function projectObjectPath(
  value: unknown,
  path: string,
  options: ProjectObjectPathOptions = {},
): unknown {
  const segments = parseObjectPath(path);
  if (segments.length === 0) {
    return value;
  }
  const maxExpansion = Math.max(1, options.maxExpansion ?? DEFAULT_MAX_PATH_WILDCARD_EXPANSION);

  const walk = (current: unknown, index: number, expansionCount: { n: number }): unknown => {
    if (index >= segments.length) {
      expansionCount.n += 1;
      if (expansionCount.n > maxExpansion) {
        throw new PathExpansionLimitError(path, maxExpansion);
      }
      return current;
    }

    const segment = segments[index]!;
    const container = readProperty(current, segment.name);

    if (segment.kind === 'property') {
      if (container === undefined) {
        return undefined;
      }
      return walk(container, index + 1, expansionCount);
    }

    if (segment.kind === 'index') {
      if (!Array.isArray(container)) {
        return undefined;
      }
      return walk(container[segment.index], index + 1, expansionCount);
    }

    // wildcard
    if (!Array.isArray(container)) {
      return [];
    }
    return container.map((item) => walk(item, index + 1, expansionCount));
  };

  return walk(value, 0, { n: 0 });
}

/**
 * Write `value` at a dotted / indexed path, creating plain-object parents as needed.
 * Index segments grow arrays with `undefined` holes when needed.
 * Wildcard paths throw {@link InvalidObjectPathError}.
 * Returns a new root object (does not mutate `root`).
 */
export function writeObjectPath(
  root: Readonly<Record<string, unknown>> | null | undefined,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = parseObjectPath(path);
  if (segments.length === 0) {
    return isPlainObject(root) ? { ...root } : {};
  }
  if (segments.some((segment) => segment.kind === 'wildcard')) {
    throw new InvalidObjectPathError(path, 'wildcard segments cannot be written');
  }

  const writeInto = (current: unknown, segmentIndex: number): unknown => {
    const segment = segments[segmentIndex]!;
    const isLast = segmentIndex === segments.length - 1;
    const asObject: Record<string, unknown> = isPlainObject(current) ? { ...current } : {};

    if (segment.kind === 'property') {
      if (isLast) {
        asObject[segment.name] = value;
        return asObject;
      }
      asObject[segment.name] = writeInto(asObject[segment.name], segmentIndex + 1);
      return asObject;
    }

    // index: object[name][index]... (wildcards rejected above)
    if (segment.kind !== 'index') {
      return asObject;
    }
    const existingArr = asObject[segment.name];
    const nextArr = Array.isArray(existingArr) ? [...existingArr] : [];
    if (isLast) {
      nextArr[segment.index] = value;
      asObject[segment.name] = nextArr;
      return asObject;
    }
    nextArr[segment.index] = writeInto(nextArr[segment.index], segmentIndex + 1);
    asObject[segment.name] = nextArr;
    return asObject;
  };

  const nextRoot = writeInto(root, 0);
  return isPlainObject(nextRoot) ? nextRoot : {};
}

/**
 * Project each array element through `itemSourcePath`.
 * When `itemSourcePath` includes indexes / wildcards, uses {@link projectObjectPath}
 * per element (or on the array when the path starts with a collection key).
 * Non-arrays are returned unchanged (callers decide whether that is valid).
 */
export function projectCollectionItems(value: unknown, itemSourcePath: string): unknown {
  const path = itemSourcePath.trim();
  if (!path || !Array.isArray(value)) {
    return value;
  }
  if (objectPathHasWildcard(path) || path.includes('[')) {
    // Per-item relative paths (`name`, `meta.label`, `tags[0]`) — map each element.
    return value.map((item) => {
      try {
        return objectPathHasWildcard(path)
          ? projectObjectPath(item, path)
          : readObjectPath(item, path);
      } catch (error) {
        if (
          error instanceof UnsafeObjectPathError ||
          error instanceof InvalidObjectPathError ||
          error instanceof PathExpansionLimitError
        ) {
          return undefined;
        }
        throw error;
      }
    });
  }
  return value.map((item) => readObjectPath(item, path));
}

export interface ArrayItemProjectionOption {
  readonly path: string;
  readonly label: string;
  readonly dataType?: string;
}

/**
 * Projection candidates for an array source:
 * 1) explicit item-schema `children` (path / label)
 * 2) else keys of the first object in `sampleValue`
 */
export function listArrayItemProjectionOptions(source: {
  readonly children?: readonly {
    readonly label: string;
    readonly path?: string;
    readonly dataType?: string;
  }[];
  readonly sampleValue?: unknown;
}): ArrayItemProjectionOption[] {
  if (source.children?.length) {
    const options: ArrayItemProjectionOption[] = [];
    for (const child of source.children) {
      const path = (child.path ?? child.label).trim();
      if (!path) {
        continue;
      }
      options.push({
        path,
        label: child.label,
        dataType: child.dataType,
      });
    }
    return options;
  }

  if (!Array.isArray(source.sampleValue) || source.sampleValue.length === 0) {
    return [];
  }
  const first = source.sampleValue[0];
  if (first === null || first === undefined || typeof first !== 'object' || Array.isArray(first)) {
    return [];
  }
  return Object.keys(first as Record<string, unknown>).map((key) => ({
    path: key,
    label: key,
  }));
}
