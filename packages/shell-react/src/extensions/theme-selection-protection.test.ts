import { describe, expect, it } from 'vitest';
import { ThemeRegistry } from '@workbench-kit/workbench-core';

import { createThemeSelectionProtectionSnapshot } from './theme-selection-protection.js';

describe('theme selection protection', () => {
  it.each([undefined, 'system', 'light', 'dark'])(
    'treats the flat base preference %s as known without a contributed theme id',
    (theme) => {
      expect(
        createThemeSelectionProtectionSnapshot({
          darkPreset: undefined,
          lightPreset: undefined,
          theme,
          themeOptions: undefined,
          themes: new ThemeRegistry(),
        }),
      ).toMatchObject({ kind: 'known', protectedThemeIds: [] });
    },
  );

  it('matches partial preset props to flat presentation', () => {
    expect(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: 'orange',
        theme: 'dark',
        themeOptions: undefined,
        themes: new ThemeRegistry(),
      }),
    ).toMatchObject({ kind: 'known', protectedThemeIds: [] });
  });

  it('protects both valid preset ids without treating the base preference as a theme id', () => {
    expect(
      createThemeSelectionProtectionSnapshot({
        darkPreset: 'navy',
        lightPreset: 'orange',
        theme: undefined,
        themeOptions: undefined,
        themes: new ThemeRegistry(),
      }),
    ).toMatchObject({
      kind: 'known',
      protectedThemeIds: ['orange', 'navy'],
    });
  });
});
