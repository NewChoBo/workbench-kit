import { type WorkbenchKeybindingDefinition } from '@workbench-kit/workbench-config';
import {
  type WorkbenchPersistenceDiagnosticOptions,
  type WorkbenchPersistenceWriteResult,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';
import {
  readWorkbenchKeybindingOverridesStorageResult,
  writeWorkbenchKeybindingOverridesStorageResult,
  type WorkbenchKeybindingOverridesStorageReadResult,
} from '@workbench-kit/workbench-core/keybinding-overrides-storage';
import {
  resolveWorkbenchShortcutPlatform,
  type WorkbenchShortcutPlatform,
} from '@workbench-kit/platform';

import { resolveLocalWorkbenchStorage } from '../storage/local-json-storage.js';

export const DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY = 'workbench-kit/.workbench/keybindings';

export function isWorkbenchKeybindingPersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function readPersistedKeybindingOverrides(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: ReadPersistedKeybindingOverridesOptions = {},
): readonly WorkbenchKeybindingDefinition[] {
  return readPersistedKeybindingOverridesResult(storageKey, storage, options).value;
}

export interface ReadPersistedKeybindingOverridesOptions extends WorkbenchPersistenceDiagnosticOptions {
  readonly platform?: WorkbenchShortcutPlatform | undefined;
}

export interface PersistedKeybindingOverridesReadResult extends WorkbenchKeybindingOverridesStorageReadResult {
  readonly value: readonly WorkbenchKeybindingDefinition[];
}

export function readPersistedKeybindingOverridesResult(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: ReadPersistedKeybindingOverridesOptions = {},
): PersistedKeybindingOverridesReadResult {
  const result = readWorkbenchKeybindingOverridesStorageResult({
    options,
    platform: options.platform ?? resolveWorkbenchShortcutPlatform(),
    storage: resolveLocalWorkbenchStorage(storage),
    storageKey,
  });

  return {
    ...result,
    value: result.entries,
  };
}

export function writePersistedKeybindingOverrides(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = resolveLocalWorkbenchStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  const result = writePersistedKeybindingOverridesResult(overrides, storageKey, resolvedStorage);
  if (!result.committed) {
    throw new Error(result.diagnostic.message);
  }
}

export function writePersistedKeybindingOverridesResult(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeWorkbenchKeybindingOverridesStorageResult({
    entries: overrides,
    options,
    storage: resolveLocalWorkbenchStorage(storage),
    storageKey,
  });
}
