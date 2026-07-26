/**
 * Object-path safety gate for field-remap read/write and template placeholders.
 * Keeps prototype-mutating segments out of dotted path traversal.
 *
 * Grammar (no JSONPath / eval):
 * - property: `city`, `meta.label`
 * - index: `items[0].name`
 * - wildcard: `items[*].name` (projection only; see `projectObjectPath`)
 */

/** Identifier / index / wildcard dotted path. */
const SAFE_PATH_RE =
  /^[A-Za-z_][A-Za-z0-9_]*(?:\[\d+\]|\[\*\])?(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\[\d+\]|\[\*\])?)*$/;

/** One dotted segment: `name`, `items[0]`, or `items[*]`. */
const SEGMENT_RE = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+|\*)\])?$/;

const UNSAFE_OBJECT_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export type ObjectPathSegment =
  | { readonly kind: 'property'; readonly name: string }
  | { readonly kind: 'index'; readonly name: string; readonly index: number }
  | { readonly kind: 'wildcard'; readonly name: string };

export class UnsafeObjectPathError extends Error {
  readonly code = 'unsafe_object_path' as const;
  readonly path: string;
  readonly segment: string;

  constructor(path: string, segment: string) {
    super(`Object path "${path}" contains unsafe segment "${segment}".`);
    this.name = 'UnsafeObjectPathError';
    this.path = path;
    this.segment = segment;
  }
}

export class InvalidObjectPathError extends Error {
  readonly code = 'invalid_object_path' as const;
  readonly path: string;

  constructor(path: string, reason?: string) {
    super(
      reason
        ? `Object path "${path}" is invalid: ${reason}`
        : `Object path "${path}" is invalid.`,
    );
    this.name = 'InvalidObjectPathError';
    this.path = path;
  }
}

function objectPathRawParts(path: string): string[] {
  return path
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function findUnsafeObjectPathSegment(names: readonly string[]): string | undefined {
  return names.find((part) => UNSAFE_OBJECT_PATH_SEGMENTS.has(part));
}

/**
 * Parse a safe object path into typed segments.
 * Throws {@link UnsafeObjectPathError} / {@link InvalidObjectPathError}.
 */
export function parseObjectPath(path: string): ObjectPathSegment[] {
  const trimmed = path.trim();
  if (!trimmed) {
    return [];
  }
  if (!SAFE_PATH_RE.test(trimmed)) {
    throw new InvalidObjectPathError(trimmed, 'unsupported grammar');
  }

  const rawParts = objectPathRawParts(trimmed);
  const propertyNames = rawParts.map((part) => {
    const match = SEGMENT_RE.exec(part);
    return match?.[1] ?? part;
  });
  const unsafeSegment = findUnsafeObjectPathSegment(propertyNames);
  if (unsafeSegment) {
    throw new UnsafeObjectPathError(trimmed, unsafeSegment);
  }

  return rawParts.map((part) => {
    const match = SEGMENT_RE.exec(part);
    if (!match) {
      throw new InvalidObjectPathError(trimmed, `bad segment "${part}"`);
    }
    const name = match[1]!;
    const bracket = match[2];
    if (bracket === undefined) {
      return { kind: 'property', name } satisfies ObjectPathSegment;
    }
    if (bracket === '*') {
      return { kind: 'wildcard', name } satisfies ObjectPathSegment;
    }
    return {
      kind: 'index',
      name,
      index: Number.parseInt(bracket, 10),
    } satisfies ObjectPathSegment;
  });
}

/**
 * Parse dotted path segments as plain property names (no `[index]` / `[*]`).
 * Rejects unsafe segments when any parts exist.
 */
export function requireObjectPathParts(path: string): string[] {
  const segments = parseObjectPath(path);
  if (segments.some((segment) => segment.kind !== 'property')) {
    throw new InvalidObjectPathError(
      path,
      'index/wildcard segments are not allowed in this context',
    );
  }
  return segments.map((segment) => segment.name);
}

export function isSafeObjectPath(path: string): boolean {
  const trimmed = path.trim();
  if (!SAFE_PATH_RE.test(trimmed)) {
    return false;
  }
  try {
    parseObjectPath(trimmed);
    return true;
  } catch {
    return false;
  }
}

/** True when the path contains at least one `[*]` segment. */
export function objectPathHasWildcard(path: string): boolean {
  try {
    return parseObjectPath(path).some((segment) => segment.kind === 'wildcard');
  } catch {
    return false;
  }
}
