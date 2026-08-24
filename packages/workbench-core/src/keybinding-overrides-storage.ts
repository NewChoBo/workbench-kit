import {
  normalizeWorkbenchShortcutCandidates,
  type WorkbenchShortcutPlatform,
} from '@workbench-kit/platform';
import {
  parseWorkbenchKeybindingsConfig,
  type WorkbenchKeybindingDefinition,
} from '@workbench-kit/workbench-config';

import {
  readWorkbenchStorageJsonResult,
  writeWorkbenchStorageJsonResult,
  type WorkbenchPersistenceDiagnosticOptions,
} from './storage-adapters.js';
import type {
  WorkbenchPersistenceDiagnostic,
  WorkbenchPersistenceWriteResult,
  WorkbenchStorageReader,
  WorkbenchStorageWriter,
} from './storage.js';

const STORAGE_ENVELOPE_KIND = 'workbench.keybindingOverrides';
const STORAGE_ENVELOPE_VERSION = 1;
const LEGACY_PRIMARY_OR_CONTROL_TOKEN = 'legacy-primary-or-control';

export interface WorkbenchKeybindingOverridesStorageReadResult {
  readonly diagnostic?: WorkbenchPersistenceDiagnostic;
  readonly entries: readonly WorkbenchKeybindingDefinition[];
  readonly format:
    'decode-failed' | 'legacy-v0' | 'missing' | 'read-failed' | 'unsupported-future' | 'v1';
  readonly writeEligible: boolean;
}

export function readWorkbenchKeybindingOverridesStorageResult(input: {
  readonly options?: WorkbenchPersistenceDiagnosticOptions | undefined;
  readonly platform: WorkbenchShortcutPlatform;
  readonly storage?: WorkbenchStorageReader | undefined;
  readonly storageKey: string;
}): WorkbenchKeybindingOverridesStorageReadResult {
  let unsupportedFuture = false;
  const result = readWorkbenchStorageJsonResult(
    input.storageKey,
    (value) => {
      const decoded = decodeStorageValue(value, input.platform);
      if (decoded.format === 'unsupported-future') {
        unsupportedFuture = true;
        throw new TypeError('Unsupported keybinding override storage version.');
      }
      return decoded;
    },
    createMissingResult,
    input.storage,
    input.options,
  );

  if (result.diagnostic) {
    return {
      diagnostic: result.diagnostic,
      entries: [],
      format:
        result.diagnostic.code === 'read_failed'
          ? 'read-failed'
          : unsupportedFuture
            ? 'unsupported-future'
            : 'decode-failed',
      writeEligible: false,
    };
  }

  return result.value;
}

export function writeWorkbenchKeybindingOverridesStorageResult(input: {
  readonly entries: readonly WorkbenchKeybindingDefinition[];
  readonly options?: WorkbenchPersistenceDiagnosticOptions | undefined;
  readonly storage?: WorkbenchStorageWriter | undefined;
  readonly storageKey: string;
}): WorkbenchPersistenceWriteResult {
  return writeWorkbenchStorageJsonResult(input.storageKey, input.entries, input.storage, {
    onDiagnostic: input.options?.onDiagnostic,
    toStorageValue: (entries) => {
      assertCanonicalSupportedEntries(entries);
      return {
        kind: STORAGE_ENVELOPE_KIND,
        version: STORAGE_ENVELOPE_VERSION,
        entries,
      };
    },
  });
}

type DecodedStorageValue =
  | {
      readonly entries: readonly WorkbenchKeybindingDefinition[];
      readonly format: 'legacy-v0' | 'v1';
      readonly writeEligible: true;
    }
  | {
      readonly entries: readonly [];
      readonly format: 'missing' | 'unsupported-future';
      readonly writeEligible: boolean;
    };

function decodeStorageValue(
  value: unknown,
  platform: WorkbenchShortcutPlatform,
): DecodedStorageValue {
  if (Array.isArray(value)) {
    const parsedEntries = parseWorkbenchKeybindingsConfig(value);
    return {
      entries: canonicalizeSupportedEntries(parsedEntries, value, platform, true),
      format: 'legacy-v0',
      writeEligible: true,
    };
  }

  if (!isRecord(value) || value.kind !== STORAGE_ENVELOPE_KIND) {
    throw new TypeError('Expected a keybinding override storage envelope.');
  }

  if (!Number.isInteger(value.version)) {
    throw new TypeError('Expected an integer keybinding override storage version.');
  }

  if (value.version !== STORAGE_ENVELOPE_VERSION) {
    return {
      entries: [],
      format: 'unsupported-future',
      writeEligible: false,
    };
  }

  if (!hasOnlyKeys(value, ['entries', 'kind', 'version'])) {
    throw new TypeError('Unexpected keybinding override storage envelope field.');
  }

  const parsedEntries = parseWorkbenchKeybindingsConfig(value.entries);
  return {
    entries: canonicalizeSupportedEntries(parsedEntries, value.entries, platform, false),
    format: 'v1',
    writeEligible: true,
  };
}

function canonicalizeSupportedEntries(
  entries: readonly WorkbenchKeybindingDefinition[],
  rawEntries: unknown,
  platform: WorkbenchShortcutPlatform,
  migrateLegacyMacCtrl: boolean,
): readonly WorkbenchKeybindingDefinition[] {
  if (!Array.isArray(rawEntries) || rawEntries.length !== entries.length) {
    throw new TypeError('Expected validated keybinding override entries.');
  }

  return entries.map((entry, index) => {
    if (!isSupportedManagedRecord(entry)) {
      return restoreValidatedUnsupportedEntry(rawEntries[index]);
    }

    const candidates = migrateLegacyMacCtrl
      ? normalizeWorkbenchShortcutCandidates(entry.key, platform)
      : normalizeStoredShortcutCandidates(entry.key, platform);
    if (candidates.length !== 1) {
      throw new TypeError('Expected one canonical legacy keybinding candidate.');
    }

    const canonicalKey = candidates[0];
    if (!canonicalKey) {
      throw new TypeError('Expected a canonical legacy keybinding candidate.');
    }

    return {
      ...entry,
      key:
        migrateLegacyMacCtrl && platform === 'mac' && !canonicalKey.split('+').includes('meta')
          ? replaceCanonicalModifierToken(canonicalKey, 'ctrl', LEGACY_PRIMARY_OR_CONTROL_TOKEN)
          : canonicalKey,
    };
  });
}

function restoreValidatedUnsupportedEntry(value: unknown): WorkbenchKeybindingDefinition {
  if (!isRecord(value)) {
    throw new TypeError('Expected a validated keybinding override record.');
  }

  // parseWorkbenchKeybindingsConfig has already validated the record shape and
  // values. Return the raw JSON record so unsupported key/when/args content is
  // not normalized by the public config parser before an unrelated managed write.
  return value as unknown as WorkbenchKeybindingDefinition;
}

function isSupportedManagedRecord(entry: WorkbenchKeybindingDefinition): boolean {
  return entry.when === undefined && (entry.args === undefined || entry.args.length === 0);
}

function assertCanonicalSupportedEntries(entries: readonly WorkbenchKeybindingDefinition[]): void {
  for (const entry of entries) {
    if (!isSupportedManagedRecord(entry)) continue;

    const candidates = normalizeStoredShortcutCandidates(entry.key, 'unknown');
    if (candidates.length !== 1 || candidates[0] !== entry.key) {
      throw new TypeError('Expected a canonical keybinding override.');
    }
  }
}

function normalizeStoredShortcutCandidates(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): readonly string[] {
  if (!shortcut.includes(LEGACY_PRIMARY_OR_CONTROL_TOKEN)) {
    return normalizeWorkbenchShortcutCandidates(shortcut, platform);
  }

  const normalized = normalizeWorkbenchShortcutCandidates(
    shortcut.split(LEGACY_PRIMARY_OR_CONTROL_TOKEN).join('ctrl'),
    platform,
  );
  if (normalized.length !== 1) return [];

  const tokens = normalized[0]?.split('+') ?? [];
  if (tokens.filter((token) => token === 'ctrl').length !== 1 || tokens.includes('meta')) {
    return [];
  }

  const restored = tokens
    .map((token) => (token === 'ctrl' ? LEGACY_PRIMARY_OR_CONTROL_TOKEN : token))
    .join('+');
  return restored === shortcut ? [restored] : [];
}

function replaceCanonicalModifierToken(key: string, from: string, to: string): string {
  return key
    .split('+')
    .map((token) => (token === from ? to : token))
    .join('+');
}

function createMissingResult(): DecodedStorageValue {
  return {
    entries: [],
    format: 'missing',
    writeEligible: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const knownKeys = new Set(keys);
  return Object.keys(record).every((key) => knownKeys.has(key));
}
