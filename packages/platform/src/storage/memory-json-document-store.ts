import type {
  JsonDocumentMigration,
  JsonDocumentReadResult,
  JsonDocumentStore,
  VersionedEnvelope,
} from './types.js';

export interface MemoryJsonDocumentStoreOptions<T> {
  readonly kind: string;
  readonly schemaVersion: number;
  readonly migrate?: JsonDocumentMigration<T>;
  /** Optional seed envelope for tests. */
  readonly initial?: VersionedEnvelope<T> | null;
}

function isVersionedEnvelope(value: unknown): value is VersionedEnvelope<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.kind === 'string' &&
    typeof record.schemaVersion === 'number' &&
    'data' in record
  );
}

/**
 * In-memory document store for unit tests and small ephemeral hosts.
 * Prefer this over `localStorage` when the value must stay off the wire and
 * off disk; use browser storage adapters only for small JSON documents.
 */
export function createMemoryJsonDocumentStore<T>(
  options: MemoryJsonDocumentStoreOptions<T>,
): JsonDocumentStore<T> {
  let envelope: VersionedEnvelope<T> | null = options.initial ?? null;

  return {
    async read(): Promise<JsonDocumentReadResult<T>> {
      if (envelope === null) {
        return {
          value: null,
          diagnostic: {
            code: 'not_found',
            message: 'Document is not present.',
          },
        };
      }

      if (envelope.kind !== options.kind) {
        envelope = null;
        return {
          value: null,
          diagnostic: {
            code: 'unsupported_kind',
            message: 'Document kind is not supported.',
          },
        };
      }

      if (options.migrate) {
        const migrated = options.migrate(envelope);
        if (migrated === null) {
          envelope = null;
          return {
            value: null,
            diagnostic: {
              code: 'unsupported_version',
              message: 'Document schema version is not supported.',
            },
          };
        }
        return { value: migrated };
      }

      if (envelope.schemaVersion !== options.schemaVersion) {
        envelope = null;
        return {
          value: null,
          diagnostic: {
            code: 'unsupported_version',
            message: 'Document schema version is not supported.',
          },
        };
      }

      return { value: envelope.data };
    },

    async write(value: T): Promise<void> {
      envelope = {
        kind: options.kind,
        schemaVersion: options.schemaVersion,
        data: value,
      };
    },
  };
}

export function parseVersionedEnvelope(raw: unknown): VersionedEnvelope<unknown> | null {
  return isVersionedEnvelope(raw) ? raw : null;
}
