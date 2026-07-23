/**
 * Lightweight path helpers for collection item projection and safe templates.
 * Supports simple dotted paths (`name`, `meta.label`) on plain objects.
 */

import { isSafeObjectPath, requireObjectPathParts } from './objectPathSafety.js';

/** Placeholder matcher: `{city}`, `{a.b}` — rejects expressions / spaces. */
const TEMPLATE_PLACEHOLDER_RE = /\{([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\}/g;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fill `{path}` placeholders from a plain object using safe dotted paths only.
 * Unknown / unsafe placeholders become empty strings. No JS eval.
 */
export function applyStringTemplate(
  template: string,
  record: Readonly<Record<string, unknown>> | null | undefined,
): string {
  return template.replace(TEMPLATE_PLACEHOLDER_RE, (_match, path: string) => {
    if (!record || !isSafeObjectPath(path)) {
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

export function readObjectPath(value: unknown, path: string): unknown {
  const parts = requireObjectPathParts(path);
  if (parts.length === 0) {
    return value;
  }

  let current: unknown = value;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Write `value` at a dotted path, creating plain-object parents as needed.
 * Returns a new root object (does not mutate `root`).
 */
export function writeObjectPath(
  root: Readonly<Record<string, unknown>> | null | undefined,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = requireObjectPathParts(path);
  if (parts.length === 0) {
    return isPlainObject(root) ? { ...root } : {};
  }

  const result: Record<string, unknown> = isPlainObject(root) ? { ...root } : {};
  let cursor: Record<string, unknown> = result;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const existing = cursor[part];
    const nextChild: Record<string, unknown> = isPlainObject(existing) ? { ...existing } : {};
    cursor[part] = nextChild;
    cursor = nextChild;
  }

  cursor[parts[parts.length - 1]!] = value;
  return result;
}

/**
 * Project each array element through `itemSourcePath`.
 * Non-arrays are returned unchanged (callers decide whether that is valid).
 */
export function projectCollectionItems(value: unknown, itemSourcePath: string): unknown {
  const path = itemSourcePath.trim();
  if (!path || !Array.isArray(value)) {
    return value;
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
