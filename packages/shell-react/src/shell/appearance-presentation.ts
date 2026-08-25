import type { ResolvedWorkbenchTheme } from '@workbench-kit/react/workbench';
import { REQUIRED_THEME_TOKEN_KEYS } from '@workbench-kit/workbench-core';

import {
  resolveWorkbenchAppearanceSelection,
  type WorkbenchAppearanceCatalogEntry,
  type WorkbenchAppearanceCatalogSnapshot,
  type WorkbenchAppearanceSelectionResolution,
  type WorkbenchAppearanceSelectionTarget,
} from './appearance-catalog.js';
import {
  createWorkbenchAppearanceOverrideSnapshot,
  type WorkbenchAppearanceOverrideSnapshot,
} from './appearance-controller.js';

export type WorkbenchAppearancePresentationMode = 'flat-theme' | 'preset';
export type WorkbenchAppearancePresentationPreference = 'system' | 'light' | 'dark';

export type WorkbenchAppearanceThemeSelection =
  | {
      readonly kind: 'base-preference';
      readonly preference: WorkbenchAppearancePresentationPreference;
      readonly rawTheme: string | undefined;
    }
  | {
      readonly kind: 'flat-theme';
      readonly rawTheme: string;
    };

export interface ResolveWorkbenchAppearancePresentationInput {
  readonly catalog: WorkbenchAppearanceCatalogSnapshot;
  readonly darkPreset?: string | undefined;
  readonly lightPreset?: string | undefined;
  readonly resolvedSystemTheme: ResolvedWorkbenchTheme;
  readonly theme?: string | undefined;
}

export interface WorkbenchAppearancePresentationDecision {
  readonly legacyTokenOverrides: WorkbenchAppearanceOverrideSnapshot | undefined;
  readonly mode: WorkbenchAppearancePresentationMode;
  readonly selectionResolution: WorkbenchAppearanceSelectionResolution | undefined;
  readonly selectionTarget: WorkbenchAppearanceSelectionTarget | undefined;
  readonly theme: string | undefined;
  readonly themePreference: WorkbenchAppearancePresentationPreference | undefined;
  readonly themePreset: string | undefined;
  readonly unresolvedTheme: string | undefined;
  readonly unresolvedThemePreset: string | undefined;
}

interface ResolvedBasePreference {
  readonly preference: WorkbenchAppearancePresentationPreference;
  readonly theme: ResolvedWorkbenchTheme;
}

interface DecisionInput {
  readonly legacyTokenOverrides?: WorkbenchAppearanceOverrideSnapshot | undefined;
  readonly mode: WorkbenchAppearancePresentationMode;
  readonly selectionResolution?: WorkbenchAppearanceSelectionResolution | undefined;
  readonly selectionTarget?: WorkbenchAppearanceSelectionTarget | undefined;
  readonly theme?: string | undefined;
  readonly themePreference?: WorkbenchAppearancePresentationPreference | undefined;
  readonly themePreset?: string | undefined;
  readonly unresolvedTheme?: string | undefined;
  readonly unresolvedThemePreset?: string | undefined;
}

/** Projects raw controlled appearance values without mutating or recovering those values. */
export function resolveWorkbenchAppearancePresentation({
  catalog,
  darkPreset,
  lightPreset,
  resolvedSystemTheme,
  theme,
}: ResolveWorkbenchAppearancePresentationInput): WorkbenchAppearancePresentationDecision {
  const themeSelection = classifyWorkbenchAppearanceThemeSelection(theme);

  if (lightPreset !== undefined && darkPreset !== undefined) {
    if (themeSelection.kind === 'flat-theme') {
      return createDecision({
        mode: 'preset',
        unresolvedTheme: themeSelection.rawTheme,
      });
    }
    const basePreference = resolveBasePreference(themeSelection.preference, resolvedSystemTheme);
    return resolvePresetPresentation(catalog, basePreference, lightPreset, darkPreset);
  }

  if (themeSelection.kind === 'base-preference') {
    const basePreference = resolveBasePreference(themeSelection.preference, resolvedSystemTheme);
    return createDecision({
      mode: 'flat-theme',
      theme: basePreference.theme,
      themePreference: basePreference.preference,
    });
  }

  return resolveFlatThemePresentation(catalog, themeSelection.rawTheme);
}

/** Shared package-private classification for controlled appearance values. */
export function classifyWorkbenchAppearanceThemeSelection(
  theme: string | undefined,
): WorkbenchAppearanceThemeSelection {
  switch (theme) {
    case undefined:
      return Object.freeze({ kind: 'base-preference', preference: 'system', rawTheme: undefined });
    case 'system':
    case 'light':
    case 'dark':
      return Object.freeze({ kind: 'base-preference', preference: theme, rawTheme: theme });
    default:
      return Object.freeze({ kind: 'flat-theme', rawTheme: theme });
  }
}

function resolveBasePreference(
  preference: WorkbenchAppearancePresentationPreference,
  resolvedSystemTheme: ResolvedWorkbenchTheme,
): ResolvedBasePreference {
  switch (preference) {
    case 'system':
      return { preference: 'system', theme: resolvedSystemTheme };
    case 'light':
      return { preference: 'light', theme: 'light' };
    case 'dark':
      return { preference: 'dark', theme: 'dark' };
  }
}

function resolveFlatThemePresentation(
  catalog: WorkbenchAppearanceCatalogSnapshot,
  rawTheme: string,
): WorkbenchAppearancePresentationDecision {
  const selectionTarget = 'flat-theme';
  const selectionResolution = resolveWorkbenchAppearanceSelection(
    catalog,
    selectionTarget,
    rawTheme,
  );

  if (selectionResolution.status === 'resolved') {
    if (selectionResolution.entry.source === 'host-option') {
      return createDecision({
        mode: 'flat-theme',
        selectionResolution,
        selectionTarget,
        theme: rawTheme,
      });
    }

    return createRegisteredThemeDecision({
      entry: selectionResolution.entry,
      mode: 'flat-theme',
      selectionResolution,
      selectionTarget,
    });
  }

  if (selectionResolution.status === 'conflicted') {
    return createDecision({
      mode: 'flat-theme',
      selectionResolution,
      selectionTarget,
      unresolvedTheme: rawTheme,
    });
  }

  return createDecision({
    mode: 'flat-theme',
    selectionResolution,
    selectionTarget,
    theme: rawTheme,
  });
}

function resolvePresetPresentation(
  catalog: WorkbenchAppearanceCatalogSnapshot,
  basePreference: ResolvedBasePreference,
  lightPreset: string,
  darkPreset: string,
): WorkbenchAppearancePresentationDecision {
  const selectionTarget =
    basePreference.theme === 'light' ? ('light-preset' as const) : ('dark-preset' as const);
  const rawPreset = basePreference.theme === 'light' ? lightPreset : darkPreset;
  const selectionResolution = resolveWorkbenchAppearanceSelection(
    catalog,
    selectionTarget,
    rawPreset,
  );

  if (selectionResolution.status !== 'resolved') {
    return createDecision({
      mode: 'preset',
      selectionResolution,
      selectionTarget,
      theme: basePreference.theme,
      themePreference: basePreference.preference,
      unresolvedThemePreset: rawPreset,
    });
  }

  if (selectionResolution.entry.source === 'builtin-preset') {
    return createDecision({
      mode: 'preset',
      selectionResolution,
      selectionTarget,
      theme: basePreference.theme,
      themePreference: basePreference.preference,
      themePreset: rawPreset,
    });
  }

  return createRegisteredThemeDecision({
    entry: selectionResolution.entry,
    mode: 'preset',
    selectionResolution,
    selectionTarget,
    themePreference: basePreference.preference,
  });
}

function createRegisteredThemeDecision({
  entry,
  mode,
  selectionResolution,
  selectionTarget,
  themePreference,
}: {
  readonly entry: WorkbenchAppearanceCatalogEntry;
  readonly mode: WorkbenchAppearancePresentationMode;
  readonly selectionResolution: WorkbenchAppearanceSelectionResolution;
  readonly selectionTarget: WorkbenchAppearanceSelectionTarget;
  readonly themePreference?: WorkbenchAppearancePresentationPreference | undefined;
}): WorkbenchAppearancePresentationDecision {
  const legacyTokenOverrides = createWorkbenchAppearanceOverrideSnapshot(
    entry.legacyTokenOverrides,
  );
  const completeLegacyTokenOverrides =
    legacyTokenOverrides !== undefined &&
    REQUIRED_THEME_TOKEN_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(legacyTokenOverrides, key),
    )
      ? legacyTokenOverrides
      : undefined;

  return createDecision({
    legacyTokenOverrides: completeLegacyTokenOverrides,
    mode,
    selectionResolution,
    selectionTarget,
    theme: entry.mode,
    themePreference,
    themePreset: entry.id,
  });
}

function createDecision(input: DecisionInput): WorkbenchAppearancePresentationDecision {
  return Object.freeze({
    legacyTokenOverrides: input.legacyTokenOverrides,
    mode: input.mode,
    selectionResolution: input.selectionResolution,
    selectionTarget: input.selectionTarget,
    theme: input.theme,
    themePreference: input.themePreference,
    themePreset: input.themePreset,
    unresolvedTheme: input.unresolvedTheme,
    unresolvedThemePreset: input.unresolvedThemePreset,
  });
}
