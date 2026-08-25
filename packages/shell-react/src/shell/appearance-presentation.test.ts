import { describe, expect, it } from 'vitest';
import {
  REQUIRED_THEME_TOKEN_KEYS,
  ThemeRegistry,
  type WorkbenchThemeContribution,
} from '@workbench-kit/workbench-core';

import { createWorkbenchAppearanceCatalogSnapshot } from './appearance-catalog.js';
import { resolveWorkbenchAppearancePresentation } from './appearance-presentation.js';

function buildCompleteTokenOverrides(value: string): Record<string, string> {
  return Object.fromEntries(REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, value]));
}

function registerTheme(
  themes: ThemeRegistry,
  input: Pick<WorkbenchThemeContribution, 'id' | 'mode'> &
    Partial<Pick<WorkbenchThemeContribution, 'extensionId' | 'tokenOverrides'>>,
): void {
  themes.registerTheme({
    extensionId: input.extensionId ?? 'workbench-kit.test.theme',
    id: input.id,
    label: input.id,
    mode: input.mode,
    ...(input.tokenOverrides === undefined ? {} : { tokenOverrides: input.tokenOverrides }),
  });
}

describe('Workbench appearance presentation', () => {
  it('preserves flat host pass-through, missing raw identity, and conflict degradation', () => {
    const themes = new ThemeRegistry();
    registerTheme(themes, { id: 'flat.conflict', mode: 'dark' });
    const catalog = createWorkbenchAppearanceCatalogSnapshot({
      hostOptions: [
        { id: 'flat.host', label: 'Host' },
        { id: 'flat.conflict', label: 'Conflicting host' },
      ],
      themes,
    });

    expect(
      resolveWorkbenchAppearancePresentation({
        catalog,
        resolvedSystemTheme: 'dark',
        theme: 'flat.host',
      }),
    ).toMatchObject({
      legacyTokenOverrides: undefined,
      mode: 'flat-theme',
      selectionResolution: { status: 'resolved' },
      theme: 'flat.host',
      themePreset: undefined,
      unresolvedTheme: undefined,
    });

    expect(
      resolveWorkbenchAppearancePresentation({
        catalog,
        resolvedSystemTheme: 'dark',
        theme: 'flat.missing',
      }),
    ).toMatchObject({
      legacyTokenOverrides: undefined,
      selectionResolution: { status: 'unresolved' },
      theme: 'flat.missing',
      themePreset: undefined,
      unresolvedTheme: undefined,
    });

    expect(
      resolveWorkbenchAppearancePresentation({
        catalog,
        resolvedSystemTheme: 'dark',
        theme: 'flat.conflict',
      }),
    ).toMatchObject({
      legacyTokenOverrides: undefined,
      selectionResolution: { status: 'conflicted' },
      theme: undefined,
      themePreference: undefined,
      themePreset: undefined,
      unresolvedTheme: 'flat.conflict',
    });
  });

  it('uses a registered flat theme declared base, raw preset identity, and sanitized overrides', () => {
    const themes = new ThemeRegistry();
    const tokenOverrides = buildCompleteTokenOverrides(' #202020 ');
    tokenOverrides['--unsafe-extra'] = 'url(javascript:alert(1))';
    registerTheme(themes, {
      id: 'registered.dark',
      mode: 'dark',
      tokenOverrides,
    });
    const catalog = createWorkbenchAppearanceCatalogSnapshot({ themes });

    const decision = resolveWorkbenchAppearancePresentation({
      catalog,
      resolvedSystemTheme: 'light',
      theme: 'registered.dark',
    });

    expect(decision).toMatchObject({
      mode: 'flat-theme',
      selectionResolution: { status: 'resolved' },
      selectionTarget: 'flat-theme',
      theme: 'dark',
      themePreference: undefined,
      themePreset: 'registered.dark',
    });
    expect(decision.legacyTokenOverrides?.['--color-bg']).toBe('#202020');
    expect(decision.legacyTokenOverrides).not.toHaveProperty('--unsafe-extra');
    expect(Object.isFrozen(decision.legacyTokenOverrides)).toBe(true);
  });

  it('uses the resolved system base for built-ins and the declared base for registered presets', () => {
    const themes = new ThemeRegistry();
    registerTheme(themes, {
      id: 'registered.light',
      mode: 'light',
      tokenOverrides: buildCompleteTokenOverrides('#fefefe'),
    });
    const catalog = createWorkbenchAppearanceCatalogSnapshot({ themes });

    expect(
      resolveWorkbenchAppearancePresentation({
        catalog,
        darkPreset: 'navy',
        lightPreset: 'orange',
        resolvedSystemTheme: 'light',
        theme: 'system',
      }),
    ).toMatchObject({
      legacyTokenOverrides: undefined,
      mode: 'preset',
      selectionTarget: 'light-preset',
      theme: 'light',
      themePreference: 'system',
      themePreset: 'orange',
    });

    const registered = resolveWorkbenchAppearancePresentation({
      catalog,
      darkPreset: 'navy',
      lightPreset: 'registered.light',
      resolvedSystemTheme: 'dark',
      theme: 'light',
    });
    expect(registered).toMatchObject({
      mode: 'preset',
      selectionTarget: 'light-preset',
      theme: 'light',
      themePreference: 'light',
      themePreset: 'registered.light',
    });
    expect(registered.legacyTokenOverrides?.['--color-bg']).toBe('#fefefe');
  });

  it('removes invalid preset styling while retaining only the independently valid base scheme', () => {
    const conflictThemes = new ThemeRegistry();
    registerTheme(conflictThemes, { id: 'orange', mode: 'light' });
    const conflictCatalog = createWorkbenchAppearanceCatalogSnapshot({
      themes: conflictThemes,
    });
    const emptyCatalog = createWorkbenchAppearanceCatalogSnapshot({ themes: new ThemeRegistry() });

    const cases = [
      {
        catalog: emptyCatalog,
        expectedStatus: 'unresolved',
        lightPreset: 'missing.light',
      },
      {
        catalog: conflictCatalog,
        expectedStatus: 'conflicted',
        lightPreset: 'orange',
      },
      {
        catalog: emptyCatalog,
        expectedStatus: 'wrong-scheme',
        lightPreset: 'dark-plus',
      },
    ] as const;

    for (const fixture of cases) {
      const input = Object.freeze({
        catalog: fixture.catalog,
        darkPreset: 'navy',
        lightPreset: fixture.lightPreset,
        resolvedSystemTheme: 'dark' as const,
        theme: 'light',
      });
      const decision = resolveWorkbenchAppearancePresentation(input);

      expect(decision).toMatchObject({
        legacyTokenOverrides: undefined,
        mode: 'preset',
        selectionResolution: { status: fixture.expectedStatus },
        selectionTarget: 'light-preset',
        theme: 'light',
        themePreference: 'light',
        themePreset: undefined,
        unresolvedThemePreset: fixture.lightPreset,
      });
      expect(input).toEqual({
        catalog: fixture.catalog,
        darkPreset: 'navy',
        lightPreset: fixture.lightPreset,
        resolvedSystemTheme: 'dark',
        theme: 'light',
      });
      expect(Object.isFrozen(decision)).toBe(true);
    }
  });

  it('does not reinterpret an invalid preset-mode color preference as a flat theme', () => {
    const themes = new ThemeRegistry();
    registerTheme(themes, { id: 'registered.dark', mode: 'dark' });
    const catalog = createWorkbenchAppearanceCatalogSnapshot({ themes });

    expect(
      resolveWorkbenchAppearancePresentation({
        catalog,
        darkPreset: 'navy',
        lightPreset: 'orange',
        resolvedSystemTheme: 'dark',
        theme: 'registered.dark',
      }),
    ).toMatchObject({
      legacyTokenOverrides: undefined,
      mode: 'preset',
      selectionResolution: undefined,
      theme: undefined,
      themePreference: undefined,
      themePreset: undefined,
      unresolvedTheme: 'registered.dark',
    });
  });
});
