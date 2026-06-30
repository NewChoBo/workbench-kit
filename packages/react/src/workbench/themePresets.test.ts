/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  applyWorkbenchAppearance,
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  isDarkThemePresetId,
  isLightThemePresetId,
  resolveActiveThemePreset,
  resolveWorkbenchThemeProviderAttributes,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
} from './themePresets';

describe('themePresets', () => {
  it('resolves the active preset from resolved theme mode', () => {
    expect(
      resolveActiveThemePreset('light', {
        lightPreset: 'skyblue',
        darkPreset: 'purple',
      }),
    ).toBe('skyblue');

    expect(
      resolveActiveThemePreset('dark', {
        lightPreset: 'orange',
        darkPreset: 'navy',
      }),
    ).toBe('navy');
  });

  it('exposes default preset ids', () => {
    expect(DEFAULT_LIGHT_THEME_PRESET).toBe('skyblue');
    expect(DEFAULT_DARK_THEME_PRESET).toBe('purple');
  });

  it('validates preset ids', () => {
    expect(isLightThemePresetId('skyblue')).toBe(true);
    expect(isLightThemePresetId('light-plus')).toBe(true);
    expect(isLightThemePresetId('purple')).toBe(false);
    expect(isDarkThemePresetId('modern')).toBe(true);
    expect(isDarkThemePresetId('dark-plus')).toBe(true);
    expect(isDarkThemePresetId('hc-black')).toBe(true);
    expect(isDarkThemePresetId('orange')).toBe(false);
  });

  it('exposes color scheme options', () => {
    expect(WORKBENCH_COLOR_SCHEME_OPTIONS.map((option) => option.id)).toEqual([
      'system',
      'light',
      'dark',
    ]);
  });

  it('resolves WorkbenchThemeProvider attributes from resolved theme and preset selection', () => {
    expect(
      resolveWorkbenchThemeProviderAttributes({
        darkPreset: 'dark-plus',
        lightPreset: 'light-plus',
        resolvedTheme: 'dark',
        themePreference: 'system',
      }),
    ).toEqual({
      theme: 'dark',
      themePreference: 'system',
      themePreset: 'dark-plus',
    });

    expect(
      resolveWorkbenchThemeProviderAttributes({
        darkPreset: 'navy',
        lightPreset: 'light-plus',
        resolvedTheme: 'light',
        themePreference: 'light',
      }),
    ).toEqual({
      theme: 'light',
      themePreference: 'light',
      themePreset: 'light-plus',
    });
  });

  it('applies appearance settings to a DOM root', () => {
    const root = document.createElement('html');

    applyWorkbenchAppearance(root, {
      darkPreset: 'purple',
      lightPreset: 'skyblue',
      themePreference: 'dark',
    });

    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.themePreference).toBe('dark');
    expect(root.dataset.themePreset).toBe('purple');
  });
});
