import type { JsonLinesReadResult, JsonLinesStore } from './types.js';

export interface MemoryJsonLinesStoreOptions<T> {
  readonly initial?: readonly T[];
}

/**
 * In-memory JSONL store for unit tests.
 */
export function createMemoryJsonLinesStore<T>(
  options: MemoryJsonLinesStoreOptions<T> = {},
): JsonLinesStore<T> {
  const values: T[] = [...(options.initial ?? [])];

  return {
    async append(value: T): Promise<void> {
      values.push(value);
    },

    async readAll(): Promise<JsonLinesReadResult<T>> {
      return { values: [...values] };
    },
  };
}
