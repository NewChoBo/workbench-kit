import { describe, expect, it } from 'vitest';

import { createStringDragMime, createTypedDragMime } from './dragMime';

function createDataTransferMock(): DataTransfer {
  const values = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as unknown as readonly string[],
    clearData: () => {
      values.clear();
    },
    getData(type: string) {
      return values.get(type) ?? '';
    },
    setData(type: string, value: string) {
      values.set(type, value);
      (this.types as string[]) = [...values.keys()];
    },
    setDragImage: () => undefined,
  } as DataTransfer;
}

const MIME = 'application/x-test-drag-item';

describe('createTypedDragMime', () => {
  it('writes and reads a custom MIME payload with default effectAllowed', () => {
    const mime = createTypedDragMime<{ id: string }>({
      mimeType: MIME,
      serialize: (value) => JSON.stringify(value),
      deserialize: (raw) => {
        try {
          return JSON.parse(raw) as { id: string };
        } catch {
          return null;
        }
      },
    });
    const dataTransfer = createDataTransferMock();

    mime.write(dataTransfer, { id: 'item-1' });

    expect(dataTransfer.effectAllowed).toBe('copyMove');
    expect(dataTransfer.getData(MIME)).toBe('{"id":"item-1"}');
    expect(dataTransfer.getData('text/plain')).toBe('');
    expect(mime.has(dataTransfer)).toBe(true);
    expect(mime.read(dataTransfer)).toEqual({ id: 'item-1' });
  });

  it('returns null from read/has when dataTransfer is null', () => {
    const mime = createStringDragMime({ mimeType: MIME });

    expect(mime.read(null)).toBeNull();
    expect(mime.has(null)).toBe(false);
  });

  it('trims custom MIME and falls back to text/plain when enabled', () => {
    const mime = createStringDragMime({
      mimeType: MIME,
      textPlainFallback: true,
    });
    const dataTransfer = createDataTransferMock();

    mime.write(dataTransfer, '  catalog-42  ');

    expect(dataTransfer.getData(MIME)).toBe('  catalog-42  ');
    expect(dataTransfer.getData('text/plain')).toBe('  catalog-42  ');
    expect(mime.read(dataTransfer)).toBe('catalog-42');

    const plaintextOnly = createDataTransferMock();
    plaintextOnly.setData('text/plain', '  from-plain  ');

    expect(mime.has(plaintextOnly)).toBe(false);
    expect(mime.read(plaintextOnly)).toBe('from-plain');
  });

  it('does not read text/plain when fallback is disabled', () => {
    const mime = createStringDragMime({ mimeType: MIME });
    const dataTransfer = createDataTransferMock();
    dataTransfer.setData('text/plain', 'unrelated');

    expect(mime.has(dataTransfer)).toBe(false);
    expect(mime.read(dataTransfer)).toBeNull();
  });

  it('returns null for empty custom MIME and empty plaintext fallback', () => {
    const mime = createStringDragMime({
      mimeType: MIME,
      textPlainFallback: true,
    });
    const dataTransfer = createDataTransferMock();
    dataTransfer.setData(MIME, '   ');
    dataTransfer.setData('text/plain', '   ');

    expect(mime.has(dataTransfer)).toBe(true);
    expect(mime.read(dataTransfer)).toBeNull();
  });

  it('honors a custom effectAllowed', () => {
    const mime = createStringDragMime({
      mimeType: MIME,
      effectAllowed: 'copy',
    });
    const dataTransfer = createDataTransferMock();

    mime.write(dataTransfer, 'id');

    expect(dataTransfer.effectAllowed).toBe('copy');
  });
});

describe('createStringDragMime', () => {
  it('round-trips string payloads with identity codecs', () => {
    const mime = createStringDragMime({ mimeType: MIME });
    const dataTransfer = createDataTransferMock();

    mime.write(dataTransfer, 'resource-7');

    expect(mime.has(dataTransfer)).toBe(true);
    expect(mime.read(dataTransfer)).toBe('resource-7');
  });
});
