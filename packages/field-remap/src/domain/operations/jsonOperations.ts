/** Native JSON semantics with an input-length bound, not a document/schema parser. */
export function parseJsonText(value: string, maxInputCharacters: number): unknown {
  if (typeof value !== 'string') {
    throw new TypeError('JSON input must be a primitive string.');
  }
  if (value.length > maxInputCharacters) {
    throw new RangeError('JSON input exceeds maxInputCharacters.');
  }
  return JSON.parse(value) as unknown;
}
