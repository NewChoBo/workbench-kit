/**
 * Path-hiding storage diagnostics for host logs and renderer-safe errors.
 * Never put absolute filesystem paths in `message` or `relativeKey`.
 */
export type StorageDiagnosticCode =
  | 'not_found'
  | 'malformed_json'
  | 'unsupported_kind'
  | 'unsupported_version'
  | 'io_error'
  | (string & {});

export interface StorageDiagnostic {
  readonly code: StorageDiagnosticCode;
  /** Safe for logs/UI — must not embed absolute filesystem paths. */
  readonly message: string;
  /** Root-relative key when known (e.g. `state/window.json`). */
  readonly relativeKey?: string;
}

export interface VersionedEnvelope<T> {
  readonly kind: string;
  readonly schemaVersion: number;
  readonly data: T;
}

export interface JsonDocumentReadResult<T> {
  readonly value: T | null;
  readonly diagnostic?: StorageDiagnostic;
}

/**
 * Single versioned JSON document port.
 * Hosts own concrete `kind` / `schemaVersion` values and migration approval.
 */
export interface JsonDocumentStore<T> {
  read(): Promise<JsonDocumentReadResult<T>>;
  write(value: T): Promise<void>;
}

export interface JsonLinesReadResult<T> {
  readonly values: readonly T[];
  readonly diagnostic?: StorageDiagnostic;
}

/**
 * Append-oriented JSONL stream port.
 * v1 corruption policy: quarantine the whole file and resume empty.
 */
export interface JsonLinesStore<T> {
  append(value: T): Promise<void>;
  readAll(): Promise<JsonLinesReadResult<T>>;
}

export interface JsonDocumentMigration<T> {
  /**
   * Migrate a successfully parsed envelope into typed data.
   * Return `null` to treat the document as unsupported (and quarantine on disk stores).
   */
  (envelope: VersionedEnvelope<unknown>): T | null;
}
