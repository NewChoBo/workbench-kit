import {
  DARK_THEME_PRESET_MANIFEST,
  LIGHT_THEME_PRESET_MANIFEST,
} from '@workbench-kit/react/workbench';
import {
  HOST_WORKBENCH_THEME_EXTENSION_ID,
  REQUIRED_THEME_TOKEN_KEYS,
  type ThemeRegistry,
  type WorkbenchThemeContribution,
} from '@workbench-kit/workbench-core';

export type WorkbenchAppearanceCatalogSource =
  'builtin-preset' | 'legacy-host-theme' | 'legacy-extension-theme' | 'host-option';

export type WorkbenchAppearanceCatalogMode = 'light' | 'dark' | undefined;

export type WorkbenchAppearanceSelectionTarget = 'flat-theme' | 'light-preset' | 'dark-preset';

export interface WorkbenchAppearanceCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly source: WorkbenchAppearanceCatalogSource;
  readonly sourceOrdinal: number;
  readonly mode: WorkbenchAppearanceCatalogMode;
  readonly extensionId?: string;
  readonly hasLegacyCssOverrides: boolean;
  readonly legacyTokenOverrides?: Readonly<Record<string, string>>;
}

export interface WorkbenchAppearanceCatalogDiagnostic {
  readonly code: 'appearance-id-conflict';
  readonly id: string;
  readonly target: WorkbenchAppearanceSelectionTarget;
  readonly sources: readonly WorkbenchAppearanceCatalogSource[];
}

export interface WorkbenchAppearanceCatalogSnapshot {
  readonly themeRegistryRevision: number;
  readonly sourceFingerprint: string;
  readonly entries: readonly WorkbenchAppearanceCatalogEntry[];
  readonly diagnostics: readonly WorkbenchAppearanceCatalogDiagnostic[];
}

export type WorkbenchAppearanceSelectionResolution =
  | { readonly status: 'resolved'; readonly entry: WorkbenchAppearanceCatalogEntry }
  | { readonly status: 'unresolved'; readonly id: string }
  | {
      readonly status: 'conflicted';
      readonly id: string;
      readonly candidates: readonly WorkbenchAppearanceCatalogEntry[];
    }
  | {
      readonly status: 'wrong-scheme';
      readonly id: string;
      readonly expected: 'light' | 'dark';
    };

export interface WorkbenchAppearanceHostOptionInput {
  readonly id: string;
  readonly label: string;
}

export interface CreateWorkbenchAppearanceCatalogSnapshotInput {
  readonly themes: ThemeRegistry;
  readonly hostOptions?: readonly WorkbenchAppearanceHostOptionInput[] | undefined;
}

interface TargetIndex {
  readonly entries: readonly WorkbenchAppearanceCatalogEntry[];
  readonly entriesById: ReadonlyMap<string, readonly WorkbenchAppearanceCatalogEntry[]>;
}

interface SnapshotIndexes {
  readonly targets: Readonly<Record<WorkbenchAppearanceSelectionTarget, TargetIndex>>;
}

const TARGET_ORDER = Object.freeze([
  'flat-theme',
  'light-preset',
  'dark-preset',
] as const satisfies readonly WorkbenchAppearanceSelectionTarget[]);

const SNAPSHOT_INDEXES = new WeakMap<WorkbenchAppearanceCatalogSnapshot, SnapshotIndexes>();

const ABSENT_OWN_DATA = Symbol('absent-own-data');
const INVALID_OWN_DATA = Symbol('invalid-own-data');

type OwnDataValue = unknown | typeof ABSENT_OWN_DATA | typeof INVALID_OWN_DATA;

function readOwnDataProperty(value: object, key: string): OwnDataValue {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) {
    return ABSENT_OWN_DATA;
  }
  return 'value' in descriptor ? descriptor.value : INVALID_OWN_DATA;
}

function readOwnString(value: object, key: string): string | typeof INVALID_OWN_DATA {
  const candidate = readOwnDataProperty(value, key);
  return typeof candidate === 'string' ? candidate : INVALID_OWN_DATA;
}

type TokenOverrideSnapshot =
  | { readonly kind: 'absent' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'present'; readonly value: Readonly<Record<string, string>> };

function snapshotTokenOverrides(theme: object): TokenOverrideSnapshot {
  const candidate = readOwnDataProperty(theme, 'tokenOverrides');
  if (candidate === ABSENT_OWN_DATA || candidate === undefined) {
    return { kind: 'absent' };
  }
  if (
    candidate === INVALID_OWN_DATA ||
    candidate === null ||
    typeof candidate !== 'object' ||
    Array.isArray(candidate)
  ) {
    return { kind: 'invalid' };
  }

  const descriptors = Object.getOwnPropertyDescriptors(candidate);
  const copiedPairs: [string, string][] = [];
  for (const key of Object.keys(descriptors)) {
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable) {
      continue;
    }
    if (!('value' in descriptor) || typeof descriptor.value !== 'string') {
      return { kind: 'invalid' };
    }
    copiedPairs.push([key, descriptor.value]);
  }

  const copy = Object.freeze(Object.fromEntries(copiedPairs));
  if (!REQUIRED_THEME_TOKEN_KEYS.every((key) => Object.prototype.hasOwnProperty.call(copy, key))) {
    return { kind: 'invalid' };
  }

  return { kind: 'present', value: copy };
}

function createBuiltinEntries(): readonly WorkbenchAppearanceCatalogEntry[] {
  let sourceOrdinal = 0;
  const entries: WorkbenchAppearanceCatalogEntry[] = [];

  for (const preset of LIGHT_THEME_PRESET_MANIFEST) {
    const id = readOwnString(preset, 'id');
    const label = readOwnString(preset, 'label');
    if (id !== INVALID_OWN_DATA && label !== INVALID_OWN_DATA) {
      entries.push(
        Object.freeze({
          hasLegacyCssOverrides: false,
          id,
          label,
          mode: 'light',
          source: 'builtin-preset',
          sourceOrdinal,
        }),
      );
    }
    sourceOrdinal += 1;
  }

  for (const preset of DARK_THEME_PRESET_MANIFEST) {
    const id = readOwnString(preset, 'id');
    const label = readOwnString(preset, 'label');
    if (id !== INVALID_OWN_DATA && label !== INVALID_OWN_DATA) {
      entries.push(
        Object.freeze({
          hasLegacyCssOverrides: false,
          id,
          label,
          mode: 'dark',
          source: 'builtin-preset',
          sourceOrdinal,
        }),
      );
    }
    sourceOrdinal += 1;
  }

  return entries;
}

function createHostOptionEntries(
  hostOptions: readonly WorkbenchAppearanceHostOptionInput[],
): readonly WorkbenchAppearanceCatalogEntry[] {
  const entries: WorkbenchAppearanceCatalogEntry[] = [];

  hostOptions.forEach((option, sourceOrdinal) => {
    const id = readOwnString(option, 'id');
    const label = readOwnString(option, 'label');
    if (id === INVALID_OWN_DATA || label === INVALID_OWN_DATA) {
      return;
    }

    entries.push(
      Object.freeze({
        hasLegacyCssOverrides: false,
        id,
        label,
        mode: undefined,
        source: 'host-option' as const,
        sourceOrdinal,
      }),
    );
  });

  return entries;
}

function createRegisteredThemeEntry(
  theme: WorkbenchThemeContribution,
  sourceOrdinal: number,
): WorkbenchAppearanceCatalogEntry | undefined {
  const extensionId = readOwnString(theme, 'extensionId');
  const id = readOwnString(theme, 'id');
  const label = readOwnString(theme, 'label');
  const mode = readOwnString(theme, 'mode');
  const tokenOverrides = snapshotTokenOverrides(theme);

  if (
    extensionId === INVALID_OWN_DATA ||
    id === INVALID_OWN_DATA ||
    label === INVALID_OWN_DATA ||
    (mode !== 'dark' && mode !== 'light') ||
    tokenOverrides.kind === 'invalid'
  ) {
    return undefined;
  }

  const base = {
    extensionId,
    hasLegacyCssOverrides: tokenOverrides.kind === 'present',
    id,
    label,
    mode,
    source:
      extensionId === HOST_WORKBENCH_THEME_EXTENSION_ID
        ? ('legacy-host-theme' as const)
        : ('legacy-extension-theme' as const),
    sourceOrdinal,
  };

  return tokenOverrides.kind === 'absent'
    ? Object.freeze(base)
    : Object.freeze({ ...base, legacyTokenOverrides: tokenOverrides.value });
}

function createRegisteredThemeEntries(
  themes: readonly WorkbenchThemeContribution[],
): readonly WorkbenchAppearanceCatalogEntry[] {
  const entries: WorkbenchAppearanceCatalogEntry[] = [];

  themes.forEach((theme, sourceOrdinal) => {
    const entry = createRegisteredThemeEntry(theme, sourceOrdinal);
    if (entry) {
      entries.push(entry);
    }
  });

  return entries;
}

function isRegisteredTheme(
  entry: WorkbenchAppearanceCatalogEntry,
): entry is WorkbenchAppearanceCatalogEntry & {
  readonly source: 'legacy-host-theme' | 'legacy-extension-theme';
} {
  return entry.source === 'legacy-host-theme' || entry.source === 'legacy-extension-theme';
}

function isEligibleForTarget(
  entry: WorkbenchAppearanceCatalogEntry,
  target: WorkbenchAppearanceSelectionTarget,
): boolean {
  switch (target) {
    case 'flat-theme':
      return entry.source === 'host-option' || isRegisteredTheme(entry);
    case 'light-preset':
      return entry.mode === 'light' && entry.source !== 'host-option';
    case 'dark-preset':
      return entry.mode === 'dark' && entry.source !== 'host-option';
  }
}

function buildTargetIndex(
  entries: readonly WorkbenchAppearanceCatalogEntry[],
  target: WorkbenchAppearanceSelectionTarget,
): TargetIndex {
  const eligibleEntries = Object.freeze(
    entries.filter((entry) => isEligibleForTarget(entry, target)),
  );
  const mutableEntriesById = new Map<string, WorkbenchAppearanceCatalogEntry[]>();

  for (const entry of eligibleEntries) {
    const candidates = mutableEntriesById.get(entry.id);
    if (candidates) {
      candidates.push(entry);
    } else {
      mutableEntriesById.set(entry.id, [entry]);
    }
  }

  const entriesById = new Map<string, readonly WorkbenchAppearanceCatalogEntry[]>();
  for (const [id, candidates] of mutableEntriesById) {
    entriesById.set(id, Object.freeze([...candidates]));
  }

  return Object.freeze({ entries: eligibleEntries, entriesById });
}

function createSnapshotIndexes(
  entries: readonly WorkbenchAppearanceCatalogEntry[],
): SnapshotIndexes {
  return Object.freeze({
    targets: Object.freeze({
      'dark-preset': buildTargetIndex(entries, 'dark-preset'),
      'flat-theme': buildTargetIndex(entries, 'flat-theme'),
      'light-preset': buildTargetIndex(entries, 'light-preset'),
    }),
  });
}

function createConflictDiagnostics(
  indexes: SnapshotIndexes,
): readonly WorkbenchAppearanceCatalogDiagnostic[] {
  const diagnostics: WorkbenchAppearanceCatalogDiagnostic[] = [];

  for (const target of TARGET_ORDER) {
    for (const [id, candidates] of indexes.targets[target].entriesById) {
      if (candidates.length < 2) {
        continue;
      }

      diagnostics.push(
        Object.freeze({
          code: 'appearance-id-conflict',
          id,
          sources: Object.freeze(candidates.map((candidate) => candidate.source)),
          target,
        }),
      );
    }
  }

  return Object.freeze(diagnostics);
}

function optionalFingerprintPart(
  tag: 'extension' | 'mode',
  value: string | undefined,
): readonly [typeof tag, 'absent'] | readonly [typeof tag, 'value', string] {
  return value === undefined
    ? Object.freeze([tag, 'absent'] as const)
    : Object.freeze([tag, 'value', value] as const);
}

function overridesFingerprintPart(
  overrides: Readonly<Record<string, string>> | undefined,
): readonly ['overrides', 'absent'] | readonly ['overrides', 'value', readonly unknown[]] {
  if (overrides === undefined) {
    return Object.freeze(['overrides', 'absent'] as const);
  }

  const pairs = Object.freeze(
    Object.keys(overrides)
      .sort()
      .map((key) => Object.freeze(['override', key, overrides[key]] as const)),
  );
  return Object.freeze(['overrides', 'value', pairs] as const);
}

function createSourceFingerprint(entries: readonly WorkbenchAppearanceCatalogEntry[]): string {
  const tuples = entries.map((entry) =>
    Object.freeze([
      'appearance-entry',
      Object.freeze(['source', entry.source] as const),
      Object.freeze(['source-ordinal', entry.sourceOrdinal] as const),
      Object.freeze(['id', entry.id] as const),
      Object.freeze(['label', entry.label] as const),
      optionalFingerprintPart('mode', entry.mode),
      optionalFingerprintPart('extension', entry.extensionId),
      overridesFingerprintPart(entry.legacyTokenOverrides),
    ] as const),
  );
  return JSON.stringify(tuples);
}

export function createWorkbenchAppearanceCatalogSnapshot({
  hostOptions = [],
  themes,
}: CreateWorkbenchAppearanceCatalogSnapshotInput): WorkbenchAppearanceCatalogSnapshot {
  const entries = Object.freeze([
    ...createBuiltinEntries(),
    ...createHostOptionEntries(hostOptions),
    ...createRegisteredThemeEntries(themes.getThemes()),
  ]);
  const indexes = createSnapshotIndexes(entries);
  const snapshot = Object.freeze({
    diagnostics: createConflictDiagnostics(indexes),
    entries,
    sourceFingerprint: createSourceFingerprint(entries),
    themeRegistryRevision: themes.getRevision(),
  });

  SNAPSHOT_INDEXES.set(snapshot, indexes);
  return snapshot;
}

function getSnapshotIndexes(snapshot: WorkbenchAppearanceCatalogSnapshot): SnapshotIndexes {
  const indexes = SNAPSHOT_INDEXES.get(snapshot);
  if (!indexes) {
    throw new Error('Workbench appearance catalog snapshot was not created by this module.');
  }
  return indexes;
}

export function getWorkbenchAppearanceCatalogEntries(
  snapshot: WorkbenchAppearanceCatalogSnapshot,
  target: WorkbenchAppearanceSelectionTarget,
): readonly WorkbenchAppearanceCatalogEntry[] {
  return getSnapshotIndexes(snapshot).targets[target].entries;
}

export function resolveWorkbenchAppearanceSelection(
  snapshot: WorkbenchAppearanceCatalogSnapshot,
  target: WorkbenchAppearanceSelectionTarget,
  id: string,
): WorkbenchAppearanceSelectionResolution {
  const indexes = getSnapshotIndexes(snapshot);
  const candidates = indexes.targets[target].entriesById.get(id);

  if (candidates?.length === 1) {
    return Object.freeze({ entry: candidates[0], status: 'resolved' });
  }

  if (candidates && candidates.length > 1) {
    return Object.freeze({ candidates, id, status: 'conflicted' });
  }

  if (target === 'light-preset' || target === 'dark-preset') {
    const expected = target === 'light-preset' ? 'light' : 'dark';
    const oppositeTarget = target === 'light-preset' ? 'dark-preset' : 'light-preset';
    const oppositeCandidates = indexes.targets[oppositeTarget].entriesById.get(id);
    if (oppositeCandidates?.length === 1) {
      return Object.freeze({ expected, id, status: 'wrong-scheme' });
    }
  }

  return Object.freeze({ id, status: 'unresolved' });
}
