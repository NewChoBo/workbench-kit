export interface TypedDragMimeOptions<T> {
  readonly mimeType: string;
  readonly serialize: (value: T) => string;
  readonly deserialize: (raw: string) => T | null;
  /** When true, also write/read `text/plain`. Default: false. */
  readonly textPlainFallback?: boolean;
  /** Default: `'copyMove'`. */
  readonly effectAllowed?: DataTransfer['effectAllowed'];
}

export interface TypedDragMime<T> {
  write(dataTransfer: DataTransfer, value: T): void;
  read(dataTransfer: DataTransfer | null): T | null;
  has(dataTransfer: DataTransfer | null): boolean;
}

/**
 * Host-supplied MIME + codecs for `DataTransfer` write/read/has.
 *
 * Prefer the custom MIME for privileged drop decisions; treat `text/plain`
 * fallback as interoperability only (some environments strip custom types).
 * Plaintext alone never satisfies `has()`.
 */
export function createTypedDragMime<T>(options: TypedDragMimeOptions<T>): TypedDragMime<T> {
  const {
    mimeType,
    serialize,
    deserialize,
    textPlainFallback = false,
    effectAllowed = 'copyMove',
  } = options;

  return {
    write(dataTransfer, value) {
      const payload = serialize(value);
      dataTransfer.setData(mimeType, payload);
      if (textPlainFallback) {
        dataTransfer.setData('text/plain', payload);
      }
      dataTransfer.effectAllowed = effectAllowed;
    },
    read(dataTransfer) {
      if (dataTransfer == null) {
        return null;
      }

      const custom = dataTransfer.getData(mimeType).trim();
      if (custom.length > 0) {
        return deserialize(custom);
      }

      if (textPlainFallback) {
        const plain = dataTransfer.getData('text/plain').trim();
        if (plain.length > 0) {
          return deserialize(plain);
        }
      }

      return null;
    },
    has(dataTransfer) {
      if (dataTransfer == null) {
        return false;
      }

      return Array.from(dataTransfer.types).includes(mimeType);
    },
  };
}

/** Convenience factory for string id / label payloads. */
export function createStringDragMime(options: {
  mimeType: string;
  textPlainFallback?: boolean;
  effectAllowed?: DataTransfer['effectAllowed'];
}): TypedDragMime<string> {
  return createTypedDragMime({
    mimeType: options.mimeType,
    // Pass concrete defaults so linked consumers with
    // `exactOptionalPropertyTypes` can typecheck the source file.
    textPlainFallback: options.textPlainFallback ?? false,
    effectAllowed: options.effectAllowed ?? 'copyMove',
    serialize: (value) => value,
    deserialize: (raw) => {
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
  });
}
