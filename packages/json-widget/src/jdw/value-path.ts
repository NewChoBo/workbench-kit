import type { JsonWidgetValueMap } from './node.js';

export const JDW_VALUE_PATH_PATTERN_SOURCE = '[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*';

const JDW_VALUE_PATH_PATTERN = new RegExp(`^${JDW_VALUE_PATH_PATTERN_SOURCE}$`);
const JDW_VALUE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const CANONICAL_ARRAY_INDEX_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const MAX_ARRAY_INDEX = 2 ** 32 - 2;
const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export function isJdwValuePath(value: unknown): value is string {
  return typeof value === 'string' && JDW_VALUE_PATH_PATTERN.test(value);
}

export function isJdwValuePathSegment(value: unknown): value is string {
  return typeof value === 'string' && JDW_VALUE_PATH_SEGMENT_PATTERN.test(value);
}

export function isJdwArrayIndexSegment(value: unknown): value is string {
  if (typeof value !== 'string' || !CANONICAL_ARRAY_INDEX_PATTERN.test(value)) {
    return false;
  }

  const index = Number(value);
  return Number.isSafeInteger(index) && index >= 0 && index <= MAX_ARRAY_INDEX;
}

export function parseJdwValuePath(path: string): readonly string[] | null {
  return isJdwValuePath(path) ? path.split('.') : null;
}

export function readJdwValuePath(root: unknown, segments: readonly string[]): unknown {
  let current = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!isJdwArrayIndexSegment(segment) || !hasOwn(current, segment)) {
        return undefined;
      }
      current = current[Number(segment)];
      continue;
    }

    if (current === null || typeof current !== 'object' || !hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function setJdwValuePath(
  values: JsonWidgetValueMap,
  segments: readonly string[],
  value: unknown,
): JsonWidgetValueMap {
  return setJdwValuePathValue(values, segments, 0, value) as JsonWidgetValueMap;
}

function setJdwValuePathValue(
  current: unknown,
  segments: readonly string[],
  position: number,
  value: unknown,
): unknown {
  const segment = segments[position]!;
  const isLeaf = position === segments.length - 1;

  if (Array.isArray(current)) {
    if (!isJdwArrayIndexSegment(segment)) {
      throw new Error('JDW array paths require canonical decimal indices.');
    }

    const index = Number(segment);
    const hadOwnValue = hasOwn(current, segment);
    const previousValue = hadOwnValue ? current[index] : undefined;
    const nextValue = isLeaf
      ? value
      : setJdwValuePathValue(previousValue, segments, position + 1, value);
    if (hadOwnValue && Object.is(previousValue, nextValue)) {
      return current;
    }

    const next = Object.assign(new Array(current.length), current);
    next[index] = nextValue;
    return Object.freeze(next);
  }

  const base =
    current !== null && typeof current === 'object' ? (current as Record<string, unknown>) : {};
  const hadOwnValue = hasOwn(base, segment);
  const previousValue = hadOwnValue ? base[segment] : undefined;
  const nextValue = isLeaf
    ? value
    : setJdwValuePathValue(previousValue, segments, position + 1, value);
  if (hadOwnValue && Object.is(previousValue, nextValue)) {
    return current;
  }

  return Object.freeze({ ...base, [segment]: nextValue });
}
