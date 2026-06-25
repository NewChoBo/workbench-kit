export type WidgetPathSegment =
  | { readonly kind: 'children'; readonly index: number }
  | { readonly kind: 'child' };

export type WidgetPath = readonly WidgetPathSegment[];

export const ROOT_WIDGET_PATH: WidgetPath = [];

export interface WidgetSourceRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

type JsonTokenType =
  | 'key'
  | 'value'
  | 'openBrace'
  | 'closeBrace'
  | 'openBracket'
  | 'closeBracket'
  | 'colon'
  | 'comma';

interface JsonToken {
  readonly type: JsonTokenType;
  readonly value: string;
  readonly pos: number;
  readonly length: number;
}

export function appendChildrenPath(path: WidgetPath, index: number): WidgetPath {
  return [...path, { kind: 'children', index }];
}

export function appendBoxChildPath(path: WidgetPath): WidgetPath {
  return [...path, { kind: 'child' }];
}

export function widgetPathKey(path: WidgetPath): string {
  if (path.length === 0) return '$';

  return `$${path
    .map((segment) => (segment.kind === 'child' ? '.child' : `.children[${segment.index}]`))
    .join('')}`;
}

export function widgetPathEquals(left: WidgetPath, right: WidgetPath): boolean {
  if (left.length !== right.length) return false;

  return left.every((segment, index) => {
    const candidate = right[index];
    if (!candidate || segment.kind !== candidate.kind) return false;

    if (segment.kind === 'child') return true;
    return candidate.kind === 'children' && segment.index === candidate.index;
  });
}

export function parseWidgetPathKey(key: string): WidgetPath {
  if (key === '$') return ROOT_WIDGET_PATH;

  const path: WidgetPathSegment[] = [];
  const regex = /\.(children\[(\d+)\]|child)/g;
  let match;
  while ((match = regex.exec(key)) !== null) {
    if (match[1] === 'child') {
      path.push({ kind: 'child' });
    } else {
      path.push({ kind: 'children', index: parseInt(match[2]!, 10) });
    }
  }
  return path;
}

function getNextJsonToken(jsonText: string, start: number): JsonToken | null {
  let i = start;
  while (i < jsonText.length && /\s/.test(jsonText[i]!)) {
    i++;
  }
  if (i >= jsonText.length) return null;

  const char = jsonText[i]!;
  if (char === '{') return { type: 'openBrace', value: '{', pos: i, length: 1 };
  if (char === '}') return { type: 'closeBrace', value: '}', pos: i, length: 1 };
  if (char === '[') return { type: 'openBracket', value: '[', pos: i, length: 1 };
  if (char === ']') return { type: 'closeBracket', value: ']', pos: i, length: 1 };
  if (char === ':') return { type: 'colon', value: ':', pos: i, length: 1 };
  if (char === ',') return { type: 'comma', value: ',', pos: i, length: 1 };

  if (char === '"') {
    let val = '';
    let j = i + 1;
    while (j < jsonText.length) {
      const current = jsonText[j]!;
      if (current === '"') break;

      if (current === '\\' && j + 1 < jsonText.length) {
        val += current + jsonText[j + 1]!;
        j += 2;
        continue;
      }

      val += current;
      j++;
    }
    const tokenLength = j < jsonText.length ? j - i + 1 : j - i;
    return { type: 'key', value: val, pos: i, length: tokenLength };
  }

  let val = '';
  let j = i;
  while (j < jsonText.length && /[a-zA-Z0-9.-]/.test(jsonText[j]!)) {
    val += jsonText[j]!;
    j++;
  }
  if (j === i) {
    return { type: 'value', value: char, pos: i, length: 1 };
  }

  return { type: 'value', value: val, pos: i, length: j - i };
}

function offsetToLineColumn(
  jsonText: string,
  offset: number,
): { readonly line: number; readonly column: number } {
  const textBefore = jsonText.substring(0, offset);
  const lines = textBefore.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1]!.length + 1,
  };
}

function findMatchingObjectEndOffset(jsonText: string, startOffset: number): number | null {
  const startToken = getNextJsonToken(jsonText, startOffset);
  if (!startToken || startToken.type !== 'openBrace') return null;

  let currentPos = startToken.pos;
  let braceLevel = 0;
  while (currentPos < jsonText.length) {
    const token = getNextJsonToken(jsonText, currentPos);
    if (!token) break;

    if (token.type === 'openBrace') {
      braceLevel++;
    } else if (token.type === 'closeBrace') {
      braceLevel--;
      if (braceLevel === 0) {
        return token.pos + token.length;
      }
    }

    currentPos = token.pos + token.length;
  }

  return null;
}

function findObjectStartOffsetForPath(jsonText: string, path: WidgetPath): number | null {
  if (path.length === 0) {
    const token = getNextJsonToken(jsonText, 0);
    return token?.type === 'openBrace' ? token.pos : null;
  }

  let currentPos = 0;
  for (const entry of path) {
    const targetKey = entry.kind === 'children' ? 'children' : 'child';

    let braceLevel = 0;
    let bracketLevel = 0;
    let foundKeyPos = -1;
    let argsBraceLevel: number | null = null;
    let pendingArgsObject = false;

    while (true) {
      const token = getNextJsonToken(jsonText, currentPos);
      if (!token) break;

      if (token.type === 'openBrace') {
        braceLevel++;
        if (pendingArgsObject) {
          argsBraceLevel = braceLevel;
          pendingArgsObject = false;
        }
      } else if (token.type === 'closeBrace') {
        if (argsBraceLevel === braceLevel) {
          argsBraceLevel = null;
        }
        braceLevel--;
        if (braceLevel < 0) break;
      } else if (token.type === 'openBracket') {
        bracketLevel++;
      } else if (token.type === 'closeBracket') {
        bracketLevel--;
      } else if (token.type === 'key' && bracketLevel === 0) {
        const isDirectWidgetKey = braceLevel === 1;
        const isJdwArgsKey = argsBraceLevel !== null && braceLevel === argsBraceLevel;

        if (isDirectWidgetKey && token.value === 'args') {
          pendingArgsObject = true;
        }

        if (!isDirectWidgetKey && !isJdwArgsKey) {
          currentPos = token.pos + token.length;
          continue;
        }

        if (token.value === targetKey) {
          foundKeyPos = token.pos;
          const nextColon = getNextJsonToken(jsonText, token.pos + token.length);
          if (nextColon && nextColon.type === 'colon') {
            currentPos = nextColon.pos + nextColon.length;
          }
          break;
        }
      }

      currentPos = token.pos + token.length;
    }

    if (foundKeyPos === -1) {
      return null;
    }

    if (entry.kind === 'children') {
      const nextBracket = getNextJsonToken(jsonText, currentPos);
      if (!nextBracket || nextBracket.type !== 'openBracket') return null;

      currentPos = nextBracket.pos + nextBracket.length;
      let currentIndex = 0;
      let arrayBraceLevel = 0;
      let arrayBracketLevel = 0;
      let foundObjPos = -1;

      while (true) {
        const token = getNextJsonToken(jsonText, currentPos);
        if (!token) break;

        if (token.type === 'openBrace') {
          if (arrayBraceLevel === 0 && arrayBracketLevel === 0 && currentIndex === entry.index) {
            foundObjPos = token.pos;
            break;
          }
          arrayBraceLevel++;
        } else if (token.type === 'closeBrace') {
          arrayBraceLevel--;
          if (arrayBraceLevel === 0 && arrayBracketLevel === 0) {
            currentIndex++;
          }
        } else if (token.type === 'openBracket') {
          arrayBracketLevel++;
        } else if (token.type === 'closeBracket') {
          arrayBracketLevel--;
          if (arrayBracketLevel < 0) break;
        }

        currentPos = token.pos + token.length;
      }

      if (foundObjPos === -1) return null;
      currentPos = foundObjPos;
    } else if (entry.kind === 'child') {
      const nextBrace = getNextJsonToken(jsonText, currentPos);
      if (!nextBrace || nextBrace.type !== 'openBrace') return null;
      currentPos = nextBrace.pos;
    }
  }

  return currentPos;
}

export function findSourceRangeForPath(
  jsonText: string,
  path: WidgetPath,
): WidgetSourceRange | null {
  const startOffset = findObjectStartOffsetForPath(jsonText, path);
  if (startOffset === null) return null;

  const endOffset = findMatchingObjectEndOffset(jsonText, startOffset);
  if (endOffset === null) return null;

  const start = offsetToLineColumn(jsonText, startOffset);
  const end = offsetToLineColumn(jsonText, endOffset);
  return {
    startLineNumber: start.line,
    startColumn: start.column,
    endLineNumber: end.line,
    endColumn: end.column,
  };
}

export function findLineAndColumnForPath(
  jsonText: string,
  path: WidgetPath,
): { readonly line: number; readonly column: number } {
  const range = findSourceRangeForPath(jsonText, path);
  if (!range) return { line: 1, column: 1 };

  return {
    line: range.startLineNumber,
    column: range.startColumn,
  };
}

export function findPathForLineAndColumn(
  jsonText: string,
  targetLine: number,
  targetColumn: number,
): WidgetPath | null {
  const lines = jsonText.split('\n');
  if (targetLine > lines.length) return null;

  let targetOffset = 0;
  for (let l = 0; l < targetLine - 1; l++) {
    targetOffset += lines[l]!.length + 1;
  }
  targetOffset += targetColumn - 1;

  interface StackEntry {
    readonly type: 'object' | 'array';
    readonly path: readonly WidgetPathSegment[];
    currentKey?: string;
    currentIndex?: number;
  }

  const stack: StackEntry[] = [{ type: 'object', path: [] }];

  let currentPos = 0;
  let lastFoundPath: readonly WidgetPathSegment[] | null = null;

  while (currentPos < jsonText.length) {
    const token = getNextJsonToken(jsonText, currentPos);
    if (!token) break;

    if (token.pos > targetOffset) {
      break;
    }

    const currentEntry = stack[stack.length - 1];

    if (!currentEntry) break;

    if (token.type === 'openBrace') {
      const nextPath: WidgetPathSegment[] = [...currentEntry.path];
      if (currentEntry.type === 'object' && currentEntry.currentKey) {
        if (currentEntry.currentKey === 'child') {
          nextPath.push({ kind: 'child' });
        }
      } else if (currentEntry.type === 'array' && currentEntry.currentIndex !== undefined) {
        nextPath.push({ kind: 'children', index: currentEntry.currentIndex });
      }
      stack.push({ type: 'object', path: nextPath });
      lastFoundPath = nextPath;
    } else if (token.type === 'closeBrace') {
      stack.pop();
    } else if (token.type === 'openBracket') {
      if (currentEntry.type === 'object' && currentEntry.currentKey === 'children') {
        stack.push({ type: 'array', path: currentEntry.path, currentIndex: 0 });
      } else {
        stack.push({ type: 'array', path: [...currentEntry.path], currentIndex: 0 });
      }
    } else if (token.type === 'closeBracket') {
      stack.pop();
    } else if (token.type === 'key') {
      if (currentEntry.type === 'object') {
        currentEntry.currentKey = token.value;
      }
    } else if (token.type === 'comma') {
      if (currentEntry.type === 'array' && currentEntry.currentIndex !== undefined) {
        currentEntry.currentIndex++;
      }
    }

    currentPos = token.pos + token.length;
  }

  return lastFoundPath;
}
