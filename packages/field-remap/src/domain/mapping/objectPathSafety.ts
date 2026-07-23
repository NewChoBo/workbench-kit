/**
 * Object-path safety gate for field-remap read/write and template placeholders.
 * Keeps prototype-mutating segments out of dotted path traversal.
 */

/** Identifier or dotted path: `city`, `a.b` (no expressions / eval). */
const SAFE_PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;

const UNSAFE_OBJECT_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

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

function objectPathParts(path: string): string[] {
  return path
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function findUnsafeObjectPathSegment(parts: readonly string[]): string | undefined {
  return parts.find((part) => UNSAFE_OBJECT_PATH_SEGMENTS.has(part));
}

/** Parse dotted path segments and reject unsafe segments when any parts exist. */
export function requireObjectPathParts(path: string): string[] {
  const parts = objectPathParts(path);
  const unsafeSegment = findUnsafeObjectPathSegment(parts);
  if (unsafeSegment) {
    throw new UnsafeObjectPathError(path, unsafeSegment);
  }
  return parts;
}

export function isSafeObjectPath(path: string): boolean {
  const trimmed = path.trim();
  return (
    SAFE_PATH_RE.test(trimmed) &&
    findUnsafeObjectPathSegment(objectPathParts(trimmed)) === undefined
  );
}
