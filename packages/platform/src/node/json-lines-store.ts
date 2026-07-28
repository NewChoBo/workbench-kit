import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { JsonLinesReadResult, JsonLinesStore } from '../storage/types.js';
import { quarantineFileUnderRoot } from './quarantine.js';
import { resolvePathUnderRoot } from './path-under-root.js';
import { createDiagnostic, splitRelativeKey } from './storage-helpers.js';

export interface NodeJsonLinesStoreOptions {
  readonly rootPath: string;
  /** Root-relative JSONL key, e.g. `logs/scans.jsonl`. */
  readonly relativeKey: string;
}

/**
 * Node filesystem JSONL store.
 * Corruption policy (v1): quarantine the whole file and resume empty.
 */
export function createNodeJsonLinesStore<T>(options: NodeJsonLinesStoreOptions): JsonLinesStore<T> {
  const relativeParts = splitRelativeKey(options.relativeKey);
  const filePath = resolvePathUnderRoot(options.rootPath, ...relativeParts);

  return {
    async append(value: T): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true });
      await appendFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
    },

    async readAll(): Promise<JsonLinesReadResult<T>> {
      let rawText: string;
      try {
        rawText = await readFile(filePath, 'utf8');
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          return {
            values: [],
            diagnostic: createDiagnostic(
              'not_found',
              'JSONL document is not present.',
              options.relativeKey,
            ),
          };
        }
        return {
          values: [],
          diagnostic: createDiagnostic(
            'io_error',
            'Failed to read JSONL document.',
            options.relativeKey,
          ),
        };
      }

      const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const values: T[] = [];

      for (const line of lines) {
        try {
          values.push(JSON.parse(line) as T);
        } catch {
          try {
            const { quarantineKey } = await quarantineFileUnderRoot({
              rootPath: options.rootPath,
              absoluteFilePath: filePath,
            });
            return {
              values: [],
              diagnostic: {
                code: 'malformed_json',
                message: `JSONL document is malformed. Quarantined as ${quarantineKey}.`,
                relativeKey: options.relativeKey,
              },
            };
          } catch {
            return {
              values: [],
              diagnostic: createDiagnostic(
                'malformed_json',
                'JSONL document is malformed.',
                options.relativeKey,
              ),
            };
          }
        }
      }

      return { values };
    },
  };
}
