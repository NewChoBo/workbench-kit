import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  isDarkThemePresetId,
  isLightThemePresetId,
  resolveActiveThemePreset,
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
    expect(isLightThemePresetId('purple')).toBe(false);
    expect(isDarkThemePresetId('modern')).toBe(true);
    expect(isDarkThemePresetId('orange')).toBe(false);
  });
});
