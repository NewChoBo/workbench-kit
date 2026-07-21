export type JsonFormPath = readonly (string | number)[];

export interface JsonTextRange {
  readonly end: number;
  readonly start: number;
}

export function replaceJsonValueAtPath(
  source: string,
  path: JsonFormPath,
  nextValue: unknown,
): string {
  if (path.length === 0) {
    return JSON.stringify(nextValue);
  }

  const range = findJsonValueRangeAtPath(source, path);
  if (!range) {
    return fallbackSerializeJsonPathEdit(source, path, nextValue);
  }

  return `${source.slice(0, range.start)}${JSON.stringify(nextValue)}${source.slice(range.end)}`;
}

function fallbackSerializeJsonPathEdit(
  source: string,
  path: JsonFormPath,
  nextValue: unknown,
): string {
  const parsed: unknown = JSON.parse(source);
  const nextRecord = updateJsonPathValue(parsed, path, nextValue);
  return JSON.stringify(nextRecord, null, detectJsonIndent(source));
}

function detectJsonIndent(source: string): number {
  return /\n[ \t]+"/.test(source) ? 2 : 0;
}

function updateJsonPathValue(value: unknown, path: JsonFormPath, nextValue: unknown): unknown {
  if (path.length === 0) {
    return nextValue;
  }

  const [head, ...tail] = path;

  if (Array.isArray(value) && typeof head === 'number') {
    const nextArray = [...value];
    nextArray[head] = updateJsonPathValue(nextArray[head], tail, nextValue);
    return nextArray;
  }

  if (isJsonRecord(value) && typeof head === 'string') {
    return {
      ...value,
      [head]: updateJsonPathValue(value[head], tail, nextValue),
    };
  }

  return value;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function findJsonValueRangeAtPath(source: string, path: JsonFormPath): JsonTextRange | null {
  const start = skipWhitespace(source, 0);
  if (start >= source.length) {
    return null;
  }

  return locateJsonValueRange(source, start, path, 0);
}

function locateJsonValueRange(
  source: string,
  index: number,
  path: JsonFormPath,
  pathIndex: number,
): JsonTextRange | null {
  index = skipWhitespace(source, index);

  if (pathIndex >= path.length) {
    const end = scanJsonValueEnd(source, index);
    return end < 0 ? null : { start: index, end };
  }

  const segment = path[pathIndex];
  if (typeof segment === 'number') {
    if (source[index] !== '[') {
      return null;
    }

    return locateJsonValueInArray(source, index + 1, path, pathIndex, segment);
  }

  if (typeof segment === 'string') {
    if (source[index] !== '{') {
      return null;
    }

    return locateJsonValueInObject(source, index + 1, path, pathIndex, segment);
  }

  return null;
}

function locateJsonValueInObject(
  source: string,
  index: number,
  path: JsonFormPath,
  pathIndex: number,
  key: string,
): JsonTextRange | null {
  let cursor = skipWhitespace(source, index);

  while (cursor < source.length && source[cursor] !== '}') {
    const keyRange = scanJsonStringToken(source, cursor);
    if (!keyRange) {
      return null;
    }

    const parsedKey = JSON.parse(source.slice(keyRange.start, keyRange.end)) as string;
    cursor = skipWhitespace(source, keyRange.end);

    if (source[cursor] !== ':') {
      return null;
    }

    cursor = skipWhitespace(source, cursor + 1);

    if (parsedKey === key) {
      return locateJsonValueRange(source, cursor, path, pathIndex + 1);
    }

    const valueEnd = scanJsonValueEnd(source, cursor);
    if (valueEnd < 0) {
      return null;
    }

    cursor = skipWhitespace(source, valueEnd);
    if (source[cursor] === ',') {
      cursor = skipWhitespace(source, cursor + 1);
      continue;
    }

    if (source[cursor] === '}') {
      return null;
    }

    return null;
  }

  return null;
}

function locateJsonValueInArray(
  source: string,
  index: number,
  path: JsonFormPath,
  pathIndex: number,
  targetIndex: number,
): JsonTextRange | null {
  let cursor = skipWhitespace(source, index);
  let currentIndex = 0;

  while (cursor < source.length && source[cursor] !== ']') {
    if (currentIndex === targetIndex) {
      return locateJsonValueRange(source, cursor, path, pathIndex + 1);
    }

    const valueEnd = scanJsonValueEnd(source, cursor);
    if (valueEnd < 0) {
      return null;
    }

    currentIndex += 1;
    cursor = skipWhitespace(source, valueEnd);

    if (source[cursor] === ',') {
      cursor = skipWhitespace(source, cursor + 1);
      continue;
    }

    if (source[cursor] === ']') {
      return null;
    }

    return null;
  }

  return null;
}

function scanJsonValueEnd(source: string, index: number): number {
  index = skipWhitespace(source, index);
  if (index >= source.length) {
    return -1;
  }

  const char = source[index];

  if (char === '"') {
    const stringToken = scanJsonStringToken(source, index);
    return stringToken?.end ?? -1;
  }

  if (char === '{') {
    return scanJsonContainerEnd(source, index, '{', '}');
  }

  if (char === '[') {
    return scanJsonContainerEnd(source, index, '[', ']');
  }

  if (source.startsWith('true', index)) {
    return index + 4;
  }

  if (source.startsWith('false', index)) {
    return index + 5;
  }

  if (source.startsWith('null', index)) {
    return index + 4;
  }

  let cursor = index;
  while (cursor < source.length && !',]} \t\r\n'.includes(source[cursor] ?? '')) {
    cursor += 1;
  }

  return cursor > index ? cursor : -1;
}

function scanJsonContainerEnd(
  source: string,
  index: number,
  openChar: '{' | '[',
  closeChar: '}' | ']',
): number {
  let depth = 0;
  let cursor = index;
  let inString = false;
  let escaped = false;

  while (cursor < source.length) {
    const char = source[cursor];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      cursor += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      cursor += 1;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return cursor + 1;
      }
    }

    cursor += 1;
  }

  return -1;
}

function scanJsonStringToken(source: string, index: number): JsonTextRange | null {
  if (source[index] !== '"') {
    return null;
  }

  let cursor = index + 1;
  let escaped = false;

  while (cursor < source.length) {
    const char = source[cursor];

    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      cursor += 1;
      continue;
    }

    if (char === '"') {
      return { start: index, end: cursor + 1 };
    }

    cursor += 1;
  }

  return null;
}

function skipWhitespace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index] ?? '')) {
    index += 1;
  }

  return index;
}
