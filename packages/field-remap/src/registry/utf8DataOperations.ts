import type { DataOperationDefinition } from '@workbench-kit/contracts';
import { acceptsUtf8Bytes, decodeUtf8 } from '../domain/operations/utf8Operations.js';

export interface Utf8DecodeDataOperationOptions {
  /** Maximum visible byte length, independent of the backing allocation. */
  readonly maxInputBytes: number;
  readonly bom: 'strip' | 'preserve';
}

/** Strict one-shot UTF-8 decoding with explicit BOM handling and a byte bound. */
export function createUtf8DecodeDataOperation(
  options: Utf8DecodeDataOperationOptions,
): DataOperationDefinition {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('UTF-8 decode options must be an object.');
  }
  const { maxInputBytes, bom } = options;
  if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes <= 0) {
    throw new RangeError('maxInputBytes must be a positive safe integer.');
  }
  if (bom !== 'strip' && bom !== 'preserve') {
    throw new TypeError('bom must be strip or preserve.');
  }
  return Object.freeze({
    ref: Object.freeze({ id: 'bytes:utf8-decode', version: 1 }),
    acceptsInput: (value: unknown) => acceptsUtf8Bytes(value, maxInputBytes),
    acceptsOutput: (value: unknown) => typeof value === 'string',
    execute: (value: unknown) => decodeUtf8(value, maxInputBytes, bom === 'preserve'),
  });
}
