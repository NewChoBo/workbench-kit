import { describe, expect, it } from 'vitest';

import {
  createWorkbenchHostThemeRegistration,
  HOST_WORKBENCH_THEME_EXTENSION_ID,
  registerHostWorkbenchThemes,
  registerWorkbenchTheme,
} from './register-workbench-theme.js';
import { REQUIRED_THEME_TOKEN_KEYS, ThemeRegistry } from './theme-registry.js';

function buildCompleteTokenOverrides(baseColor: string): Record<string, string> {
  return Object.fromEntries(REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, baseColor]));
}

describe('registerWorkbenchTheme', () => {
  it('registers a host theme on the theme registry', () => {
    const registry = new ThemeRegistry();
    const tokens = buildCompleteTokenOverrides('#0f1a12');

    const disposable = registerWorkbenchTheme(
      registry,
      'workbench-kit.sample.host.forest',
      tokens,
      {
        label: 'Sample Forest',
        mode: 'dark',
      },
    );

    expect(registry.getTheme('workbench-kit.sample.host.forest')).toEqual(
      expect.objectContaining({
        extensionId: HOST_WORKBENCH_THEME_EXTENSION_ID,
        id: 'workbench-kit.sample.host.forest',
        label: 'Sample Forest',
        mode: 'dark',
        tokenOverrides: tokens,
      }),
    );

    disposable.dispose();
    expect(registry.getTheme('workbench-kit.sample.host.forest')).toBeUndefined();
  });

  it('creates bootstrap registration descriptors', () => {
    const tokens = buildCompleteTokenOverrides('#112233');

    expect(
      createWorkbenchHostThemeRegistration('workbench-kit.sample.host.ocean', tokens, {
        label: 'Sample Ocean',
        mode: 'light',
      }),
    ).toEqual({
      id: 'workbench-kit.sample.host.ocean',
      label: 'Sample Ocean',
      mode: 'light',
      tokenOverrides: tokens,
    });
  });

  it('registers multiple host themes and disposes them together', () => {
    const registry = new ThemeRegistry();
    const darkTokens = buildCompleteTokenOverrides('#101820');
    const lightTokens = buildCompleteTokenOverrides('#f5f7fa');

    const disposable = registerHostWorkbenchThemes(registry, [
      createWorkbenchHostThemeRegistration('workbench-kit.sample.host.night', darkTokens, {
        label: 'Sample Night',
        mode: 'dark',
      }),
      createWorkbenchHostThemeRegistration('workbench-kit.sample.host.day', lightTokens, {
        label: 'Sample Day',
        mode: 'light',
      }),
    ]);

    expect(registry.getThemes()).toHaveLength(2);

    disposable.dispose();
    expect(registry.getThemes()).toHaveLength(0);
  });
});
