import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseVersionedEnvelope } from '../storage/memory-json-document-store.js';
import type {
  JsonDocumentMigration,
  JsonDocumentReadResult,
  JsonDocumentStore,
  StorageDiagnostic,
  VersionedEnvelope,
} from '../storage/types.js';
import { atomicWriteText } from './atomic-write.js';
import { quarantineFileUnderRoot } from './quarantine.js';
import { resolvePathUnderRoot } from './path-under-root.js';

export interface NodeJsonDocumentStoreOptions<T> {
  readonly rootPath: string;
  /** Root-relative document key, e.g. `state/window.json`. */
  readonly relativeKey: string;
  readonly kind: string;
  readonly schemaVersion: number;
  readonly migrate?: JsonDocumentMigration<T>;
}

function splitRelativeKey(relativeKey: string): string[] {
  return relativeKey.split(/[/\\]+/).filter(Boolean);
}

function createDiagnostic(
  code: StorageDiagnostic['code'],
  message: string,
  relativeKey: string,
): StorageDiagnostic {
  return { code, message, relativeKey };
}

async function quarantineAndDiagnose(
  rootPath: string,
  absoluteFilePath: string,
  relativeKey: string,
  code: StorageDiagnostic['code'],
  message: string,
): Promise<JsonDocumentReadResult<never>> {
  try {
    const { quarantineKey } = await quarantineFileUnderRoot({
      rootPath,
      absoluteFilePath,
    });
    return {
      value: null,
      diagnostic: {
        code,
        message: `${message} Quarantined as ${quarantineKey}.`,
        relativeKey,
      },
    };
  } catch {
    return {
      value: null,
      diagnostic: createDiagnostic(code, message, relativeKey),
    };
  }
}

/**
 * Node filesystem document store using atomic writes and path-under-root confinement.
 * Corrupt or unsupported documents are quarantined; diagnostics never expose absolute paths.
 */
export function createNodeJsonDocumentStore<T>(
  options: NodeJsonDocumentStoreOptions<T>,
): JsonDocumentStore<T> {
  const relativeParts = splitRelativeKey(options.relativeKey);
  const filePath = resolvePathUnderRoot(options.rootPath, ...relativeParts);

  return {
    async read(): Promise<JsonDocumentReadResult<T>> {
      let rawText: string;
      try {
        rawText = await readFile(filePath, 'utf8');
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          return {
            value: null,
            diagnostic: createDiagnostic(
              'not_found',
              'Document is not present.',
              options.relativeKey,
            ),
          };
        }
        return {
          value: null,
          diagnostic: createDiagnostic(
            'io_error',
            'Failed to read document.',
            options.relativeKey,
          ),
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        return quarantineAndDiagnose(
          options.rootPath,
          filePath,
          options.relativeKey,
          'malformed_json',
          'Document JSON is malformed.',
        );
      }

      const envelope = parseVersionedEnvelope(parsed);
      if (envelope === null) {
        return quarantineAndDiagnose(
          options.rootPath,
          filePath,
          options.relativeKey,
          'malformed_json',
          'Document is not a versioned envelope.',
        );
      }

      if (envelope.kind !== options.kind) {
        return quarantineAndDiagnose(
          options.rootPath,
          filePath,
          options.relativeKey,
          'unsupported_kind',
          'Document kind is not supported.',
        );
      }

      if (options.migrate) {
        const migrated = options.migrate(envelope);
        if (migrated === null) {
          return quarantineAndDiagnose(
            options.rootPath,
            filePath,
            options.relativeKey,
            'unsupported_version',
            'Document schema version is not supported.',
          );
        }
        return { value: migrated };
      }

      if (envelope.schemaVersion !== options.schemaVersion) {
        return quarantineAndDiagnose(
          options.rootPath,
          filePath,
          options.relativeKey,
          'unsupported_version',
          'Document schema version is not supported.',
        );
      }

      return { value: envelope.data as T };
    },

    async write(value: T): Promise<void> {
      const envelope: VersionedEnvelope<T> = {
        kind: options.kind,
        schemaVersion: options.schemaVersion,
        data: value,
      };
      await atomicWriteText(filePath, `${JSON.stringify(envelope, null, 2)}\n`);
    },
  };
}

export function resolveDocumentPathUnderRoot(rootPath: string, relativeKey: string): string {
  return resolvePathUnderRoot(rootPath, ...splitRelativeKey(relativeKey));
}

export function toRootRelativeKey(rootPath: string, absolutePath: string): string {
  return path.relative(path.resolve(rootPath), path.resolve(absolutePath)).split(path.sep).join('/');
}
