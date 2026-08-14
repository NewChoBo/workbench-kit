/**
 * Host-backed key/value storage port used by install state, layout, prefs, and
 * similar kit persistence. Synchronous by design for current call sites.
 *
 * ## Scopes (semantic — not a method argument)
 *
 * Hosts choose which backing store matches each kit feature key. Suggested
 * mapping:
 *
 * | Scope       | Typical backing                         | Kit examples                          |
 * | ----------- | --------------------------------------- | ------------------------------------- |
 * | `user`      | durable profile / app userData          | layout, keybindings, appearance       |
 * | `workspace` | workspace-root or workspace-id store    | workspace-scoped prefs (host-owned)   |
 * | `session`   | process memory or `sessionStorage`      | ephemeral UI state                    |
 * | `secret`    | **not** this adapter — use secrets API  | tokens → `createMemorySecretStorage` / vault |
 *
 * Preference merge scopes (`default` / `user` / `workspace` in preference docs)
 * are a separate concern from this host storage adapter.
 *
 * Do not put tokens or credentials in a `WorkbenchStorageAdapter` backed by
 * `localStorage` / `sessionStorage`. Use
 * `@workbench-kit/platform` `createMemorySecretStorage` or Electron
 * `createEncryptedSecretVault`.
 */

export type WorkbenchStorageScope = 'user' | 'workspace' | 'session' | 'secret';

export interface WorkbenchStorageReader {
  getItem(key: string): string | null;
}

export interface WorkbenchStorageWriter {
  setItem(key: string, value: string): void;
}

export interface WorkbenchStorageRemover {
  removeItem(key: string): void;
}

export type WorkbenchPersistenceOperation = 'read' | 'write';

export type WorkbenchPersistenceDiagnosticCode = 'read_failed' | 'decode_failed' | 'write_failed';

/** Renderer-safe persistence failure details for one logical Kit storage key. */
export interface WorkbenchPersistenceDiagnostic {
  readonly code: WorkbenchPersistenceDiagnosticCode;
  readonly message: string;
  readonly operation: WorkbenchPersistenceOperation;
  readonly storageKey: string;
}

export type WorkbenchPersistenceDiagnosticHandler = (
  diagnostic: WorkbenchPersistenceDiagnostic,
) => void;

export interface WorkbenchPersistenceReadResult<T> {
  readonly diagnostic?: WorkbenchPersistenceDiagnostic | undefined;
  readonly value: T;
}

export type WorkbenchPersistenceWriteResult =
  | {
      readonly committed: true;
      readonly diagnostic?: never;
    }
  | {
      readonly committed: false;
      readonly diagnostic: WorkbenchPersistenceDiagnostic;
    };

/** Sync get/set port. DOM `Storage` is structurally compatible. */
export type WorkbenchStorageAdapter = WorkbenchStorageReader & WorkbenchStorageWriter;

/** Sync get/set/remove port for hosts that support deletion. */
export type WorkbenchRemovableStorageAdapter = WorkbenchStorageAdapter & WorkbenchStorageRemover;
