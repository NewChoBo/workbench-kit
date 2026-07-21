import { isPlainObject } from '../mapping/pathUtils.js';
import type { FieldDataType, SourceField } from '../types.js';

export interface SourceFieldsFromPlainObjectOptions {
  /** Prefix for generated field ids (default `src`). */
  readonly idPrefix?: string;
  /** Max nesting depth for object children (default 4). */
  readonly maxDepth?: number;
}

function inferDataType(value: unknown): FieldDataType {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return 'datetime';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (isPlainObject(value)) {
    return 'object';
  }
  return 'unknown';
}

function fieldFromEntry(
  key: string,
  value: unknown,
  path: string,
  idPrefix: string,
  depth: number,
  maxDepth: number,
): SourceField {
  const id = path ? `${idPrefix}.${path}` : `${idPrefix}.${key}`;
  const dataType = inferDataType(value);
  const base: SourceField = {
    id,
    label: key,
    path,
    dataType,
    sampleValue: value,
  };

  if (depth >= maxDepth) {
    return base;
  }

  if (isPlainObject(value)) {
    const children = Object.entries(value).map(([childKey, childValue]) =>
      fieldFromEntry(
        childKey,
        childValue,
        path ? `${path}.${childKey}` : childKey,
        idPrefix,
        depth + 1,
        maxDepth,
      ),
    );
    return children.length > 0 ? { ...base, children } : base;
  }

  if (Array.isArray(value) && value.length > 0 && isPlainObject(value[0])) {
    const sampleItem = value[0] as Record<string, unknown>;
    const children = Object.entries(sampleItem).map(([childKey, childValue]) =>
      fieldFromEntry(childKey, childValue, childKey, `${id}.item`, depth + 1, maxDepth),
    );
    return children.length > 0 ? { ...base, children } : base;
  }

  return base;
}

/**
 * Infer a shallow/nested `SourceField` tree from a plain sample object.
 * Useful for demos and hosts that have a sample payload but no formal schema.
 *
 * - Top-level keys become root fields.
 * - Nested plain objects become `children` (up to `maxDepth`).
 * - Arrays of objects expose item-key children for projection pickers.
 */
export function sourceFieldsFromPlainObject(
  sample: unknown,
  options: SourceFieldsFromPlainObjectOptions = {},
): SourceField[] {
  if (!isPlainObject(sample)) {
    return [];
  }
  const idPrefix = options.idPrefix?.trim() || 'src';
  const maxDepth = Math.max(0, options.maxDepth ?? 4);
  return Object.entries(sample).map(([key, value]) =>
    fieldFromEntry(key, value, key, idPrefix, 0, maxDepth),
  );
}
