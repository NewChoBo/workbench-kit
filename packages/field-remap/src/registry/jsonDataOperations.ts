import type { DataOperationDefinition } from '@workbench-kit/contracts';
import { parseJsonText } from '../domain/operations/jsonOperations.js';

export interface JsonParseDataOperationOptions {
  /** Maximum input length in UTF-16 code units, including whitespace. */
  readonly maxInputCharacters: number;
}

function acceptsParsedTopLevel(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (Array.isArray(value)) return true;
  if (typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Parse native JSON without coercion, revivers or portable-value/schema admission. */
export function createJsonParseDataOperation(
  options: JsonParseDataOperationOptions,
): DataOperationDefinition {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('JSON parse options must be an object.');
  }
  const { maxInputCharacters } = options;
  if (!Number.isSafeInteger(maxInputCharacters) || maxInputCharacters <= 0) {
    throw new RangeError('maxInputCharacters must be a positive safe integer.');
  }
  return Object.freeze({
    ref: Object.freeze({ id: 'json:parse', version: 1 }),
    acceptsInput: (value: unknown) =>
      typeof value === 'string' && value.length <= maxInputCharacters,
    acceptsOutput: acceptsParsedTopLevel,
    execute: (value: unknown) => parseJsonText(value as string, maxInputCharacters),
  });
}
