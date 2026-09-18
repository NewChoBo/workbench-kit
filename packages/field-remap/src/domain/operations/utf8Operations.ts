const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayTag = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  Symbol.toStringTag,
)!.get!;
const typedArrayBuffer = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'buffer')!.get!;
const typedArrayOffset = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteOffset')!.get!;
const typedArrayLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength')!.get!;
const arrayBufferLength = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  'byteLength',
)!.get!;
const arrayBufferResizable = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  'resizable',
)?.get;

interface ByteRange {
  buffer: ArrayBuffer;
  offset: number;
  length: number;
}

function readByteRange(value: unknown): ByteRange | undefined {
  try {
    if (typedArrayTag.call(value) !== 'Uint8Array') return undefined;
    const buffer = typedArrayBuffer.call(value) as ArrayBuffer;
    // The intrinsic ordinary-buffer getter rejects shared storage across realms.
    arrayBufferLength.call(buffer);
    if (arrayBufferResizable?.call(buffer) === true) return undefined;
    const offset = typedArrayOffset.call(value) as number;
    const length = typedArrayLength.call(value) as number;
    // A detached view also reports zero length; constructing a view distinguishes it.
    new Uint8Array(buffer, offset, 0);
    return { buffer, offset, length };
  } catch {
    return undefined;
  }
}

export function acceptsUtf8Bytes(value: unknown, maxInputBytes: number): boolean {
  const range = readByteRange(value);
  return range !== undefined && range.length <= maxInputBytes;
}

/** Decode one fixed ordinary byte range; no byte copying, streaming or shared state. */
export function decodeUtf8(value: unknown, maxInputBytes: number, preserveBom: boolean): string {
  const range = readByteRange(value);
  if (!range) throw new TypeError('Expected a Uint8Array view over a fixed attached ArrayBuffer.');
  if (range.length > maxInputBytes) throw new RangeError('UTF-8 input exceeds maxInputBytes.');
  const input = new Uint8Array(range.buffer, range.offset, range.length);
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: preserveBom }).decode(input, {
    stream: false,
  });
}
