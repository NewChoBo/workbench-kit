import { describe, expect, it } from 'vitest';

import { ExtensionRegistry } from './extension-registry.js';
import {
  REQUIRED_THEME_TOKEN_KEYS,
  ThemeRegistry,
  applyThemeTokenOverrides,
} from './theme-registry.js';

function buildCompleteTokenOverrides(baseColor: string): Record<string, string> {
  return Object.fromEntries(REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, baseColor]));
}

describe('ThemeRegistry', () => {
  it('registers contributed themes from extensions', () => {
    const registry = new ExtensionRegistry();

    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.samples.theme-alt',
        name: 'samples-theme-alt',
        displayName: 'Alternate Theme',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: { workbench: '^0.0.0', extensionApi: '^0.0.0' },
        activationEvents: ['onStartup'],
        contributes: {
          themes: [
            {
              id: 'workbench-kit.samples.theme-alt.dark-blue',
              label: 'Dark Blue Alt',
              mode: 'dark',
              tokenOverrides: buildCompleteTokenOverrides('#0a1628'),
            },
          ],
        },
      },
    });

    expect(registry.themes.getThemes()).toEqual([
      expect.objectContaining({
        extensionId: 'workbench-kit.samples.theme-alt',
        id: 'workbench-kit.samples.theme-alt.dark-blue',
        label: 'Dark Blue Alt',
      }),
    ]);
  });

  it('rejects contributed themes with a partial token set', () => {
    const registry = new ThemeRegistry();

    expect(() =>
      registry.registerTheme({
        extensionId: 'workbench-kit.samples.theme-alt',
        id: 'workbench-kit.samples.theme-alt.dark-blue',
        label: 'Dark Blue Alt',
        mode: 'dark',
        tokenOverrides: {
          '--color-bg': '#0a1628',
          '--color-surface': '#12243d',
        },
      }),
    ).toThrow(/missing required token/);
  });

  it('rejects contributed themes without a valid mode', () => {
    const registry = new ThemeRegistry();

    expect(() =>
      registry.registerTheme({
        extensionId: 'workbench-kit.samples.theme-alt',
        id: 'workbench-kit.samples.theme-alt.dark-blue',
        label: 'Dark Blue Alt',
        mode: 'sepia' as never,
        tokenOverrides: buildCompleteTokenOverrides('#0a1628'),
      }),
    ).toThrow(/must declare mode/);
  });

  it('applies and clears token overrides on a target element', () => {
    const registry = new ThemeRegistry();
    const style = new Map<string, string>();
    const target = {
      style: {
        getPropertyValue: (key: string) => style.get(key) ?? '',
        removeProperty: (key: string) => {
          style.delete(key);
        },
        setProperty: (key: string, value: string) => {
          style.set(key, value);
        },
      },
    } as unknown as HTMLElement;

    registry.registerTheme({
      extensionId: 'workbench-kit.samples.theme-alt',
      id: 'workbench-kit.samples.theme-alt.dark-blue',
      label: 'Dark Blue Alt',
      mode: 'dark',
      tokenOverrides: buildCompleteTokenOverrides('#0a1628'),
    });

    const theme = registry.getTheme('workbench-kit.samples.theme-alt.dark-blue');
    applyThemeTokenOverrides(target, theme?.tokenOverrides);
    expect(style.get('--color-bg')).toBe('#0a1628');

    applyThemeTokenOverrides(target, undefined, theme?.tokenOverrides);
    expect(style.has('--color-bg')).toBe(false);
  });
});
