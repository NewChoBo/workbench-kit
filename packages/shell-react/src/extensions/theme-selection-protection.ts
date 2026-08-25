import { WORKBENCH_COLOR_SCHEME_OPTIONS } from '@workbench-kit/react/workbench';
import type { ThemeRegistry } from '@workbench-kit/workbench-core';

import {
  createWorkbenchAppearanceCatalogSnapshot,
  resolveWorkbenchAppearanceSelection,
  type WorkbenchAppearanceCatalogSnapshot,
  type WorkbenchAppearanceHostOptionInput,
} from '../shell/appearance-catalog.js';

interface ThemeSelectionProtectionBase {
  readonly isCurrent: () => boolean;
  readonly sourceFingerprint: string;
  readonly themeRegistryRevision: number;
}

export type ThemeSelectionProtectionSnapshot =
  | (ThemeSelectionProtectionBase & {
      readonly kind: 'known';
      readonly protectedThemeIds: readonly string[];
    })
  | (ThemeSelectionProtectionBase & {
      readonly kind: 'unknown';
    });

export interface ThemeSelectionProtectionInput {
  readonly catalog?: WorkbenchAppearanceCatalogSnapshot | undefined;
  readonly darkPreset: string | undefined;
  readonly lightPreset: string | undefined;
  readonly theme: string | undefined;
  readonly themeOptions: readonly WorkbenchAppearanceHostOptionInput[] | undefined;
  readonly themes: ThemeRegistry;
}

/**
 * Captures only selections that resolve to exactly one eligible catalog row. The action guard
 * reconstructs current own data and compares both revision and the canonical source fingerprint,
 * so writable public contributions cannot reuse stale lifecycle protection.
 */
export function createThemeSelectionProtectionSnapshot({
  catalog: suppliedCatalog,
  darkPreset,
  lightPreset,
  theme,
  themeOptions,
  themes,
}: ThemeSelectionProtectionInput): ThemeSelectionProtectionSnapshot {
  const catalog =
    suppliedCatalog ??
    createWorkbenchAppearanceCatalogSnapshot({ hostOptions: themeOptions, themes });
  const base: ThemeSelectionProtectionBase = {
    isCurrent: () => isCatalogCurrent(catalog, themes, themeOptions),
    sourceFingerprint: catalog.sourceFingerprint,
    themeRegistryRevision: catalog.themeRegistryRevision,
  };
  const hasLightPreset = lightPreset !== undefined;
  const hasDarkPreset = darkPreset !== undefined;

  if (hasLightPreset !== hasDarkPreset) {
    return Object.freeze({ ...base, kind: 'unknown' });
  }

  if (hasLightPreset && hasDarkPreset) {
    const knownColorScheme = WORKBENCH_COLOR_SCHEME_OPTIONS.some((option) => option.id === theme);
    const lightResolution = resolveWorkbenchAppearanceSelection(
      catalog,
      'light-preset',
      lightPreset,
    );
    const darkResolution = resolveWorkbenchAppearanceSelection(catalog, 'dark-preset', darkPreset);

    if (
      !knownColorScheme ||
      lightResolution.status !== 'resolved' ||
      darkResolution.status !== 'resolved'
    ) {
      return Object.freeze({ ...base, kind: 'unknown' });
    }

    return Object.freeze({
      ...base,
      kind: 'known',
      protectedThemeIds: Object.freeze([theme, lightPreset, darkPreset] as string[]),
    });
  }

  if (theme === undefined) {
    return Object.freeze({ ...base, kind: 'unknown' });
  }
  const themeResolution = resolveWorkbenchAppearanceSelection(catalog, 'flat-theme', theme);
  if (themeResolution.status !== 'resolved') {
    return Object.freeze({ ...base, kind: 'unknown' });
  }

  return Object.freeze({
    ...base,
    kind: 'known',
    protectedThemeIds: Object.freeze([theme]),
  });
}

function isCatalogCurrent(
  captured: WorkbenchAppearanceCatalogSnapshot,
  themes: ThemeRegistry,
  themeOptions: readonly WorkbenchAppearanceHostOptionInput[] | undefined,
): boolean {
  try {
    const current = createWorkbenchAppearanceCatalogSnapshot({
      hostOptions: themeOptions,
      themes,
    });
    return (
      current.themeRegistryRevision === captured.themeRegistryRevision &&
      current.sourceFingerprint === captured.sourceFingerprint
    );
  } catch {
    return false;
  }
}
