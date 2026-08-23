import { describe, expect, it } from 'vitest';

import {
  DARK_THEME_PRESET_MANIFEST,
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  LIGHT_THEME_PRESET_MANIFEST,
  isDarkThemePresetId,
  isLightThemePresetId,
} from './builtin-theme-presets';

describe('built-in theme preset contracts', () => {
  it('exposes the complete built-in light and dark catalogs', () => {
    expect(LIGHT_THEME_PRESET_MANIFEST.map(({ id }) => id)).toEqual([
      'orange',
      'skyblue',
      'light-plus',
    ]);
    expect(DARK_THEME_PRESET_MANIFEST.map(({ id }) => id)).toEqual([
      'navy',
      'purple',
      'modern',
      'dark-plus',
      'hc-black',
      'slate',
    ]);
  });

  it('keeps default ids and validation derived from the manifests', () => {
    expect(DEFAULT_LIGHT_THEME_PRESET).toBe('skyblue');
    expect(DEFAULT_DARK_THEME_PRESET).toBe('purple');
    expect(isLightThemePresetId('light-plus')).toBe(true);
    expect(isLightThemePresetId('purple')).toBe(false);
    expect(isDarkThemePresetId('slate')).toBe(true);
    expect(isDarkThemePresetId('orange')).toBe(false);
  });
});
