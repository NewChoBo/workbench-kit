import { describe, expect, it } from 'vitest';

import { ExtensionRegistry } from '../extension/registry.js';
import {
  REQUIRED_THEME_TOKEN_KEYS,
  ThemeRegistry,
  applyThemeTokenOverrides,
  type ThemeRegistryChangeEvent,
  type WorkbenchThemeContribution,
} from './registry.js';

function buildCompleteTokenOverrides(baseColor: string): Record<string, string> {
  return Object.fromEntries(REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, baseColor]));
}

describe('ThemeRegistry', () => {
  it('publishes symmetric content changes and ignores stale registration disposal', () => {
    const registry = new ThemeRegistry();
    const changes: string[] = [];
    registry.onDidChangeThemes(({ kind, theme }) => {
      changes.push(`${kind}:${theme.id}`);
    });
    const theme = {
      extensionId: 'workbench-kit.samples.theme-alt',
      id: 'workbench-kit.samples.theme-alt.dark-blue',
      label: 'Dark Blue Alt',
      mode: 'dark' as const,
      tokenOverrides: buildCompleteTokenOverrides('#0a1628'),
    };

    const firstRegistration = registry.registerTheme(theme);
    expect(registry.getRevision()).toBe(1);
    firstRegistration.dispose();
    expect(registry.getRevision()).toBe(2);

    const secondRegistration = registry.registerTheme(theme);
    firstRegistration.dispose();
    expect(registry.getRevision()).toBe(3);
    secondRegistration.dispose();
    expect(registry.getRevision()).toBe(4);
    expect(changes).toEqual([
      'registered:workbench-kit.samples.theme-alt.dark-blue',
      'unregistered:workbench-kit.samples.theme-alt.dark-blue',
      'registered:workbench-kit.samples.theme-alt.dark-blue',
      'unregistered:workbench-kit.samples.theme-alt.dark-blue',
    ]);
  });

  it('preserves registered object identity and exposes writable own-data drift without a revision', () => {
    const registry = new ThemeRegistry();
    const registeredThemes: unknown[] = [];
    const changes: ThemeRegistryChangeEvent[] = [];
    registry.onDidRegisterTheme((theme) => registeredThemes.push(theme));
    registry.onDidChangeThemes((event) => changes.push(event));
    const registeredId = 'workbench-kit.samples.mutable-theme';
    const tokenOverrides = buildCompleteTokenOverrides('#101010');
    const theme: WorkbenchThemeContribution = {
      extensionId: 'workbench-kit.samples.mutable',
      id: registeredId,
      label: 'Before',
      mode: 'dark',
      tokenOverrides,
    };

    const registration = registry.registerTheme(theme);
    const registeredRevision = registry.getRevision();

    expect(registry.getTheme(registeredId)).toBe(theme);
    expect(registry.getThemes()).toHaveLength(1);
    expect(registry.getThemes()[0]).toBe(theme);
    expect(registeredThemes[0]).toBe(theme);
    expect(changes[0]?.kind).toBe('registered');
    expect(changes[0]?.theme).toBe(theme);

    theme.label = 'After';
    theme.mode = 'light';
    tokenOverrides['--color-bg'] = '#fefefe';

    expect(registry.getRevision()).toBe(registeredRevision);
    expect(registry.getTheme(registeredId)).toBe(theme);
    expect(registry.getTheme(registeredId)).toMatchObject({
      label: 'After',
      mode: 'light',
      tokenOverrides: { '--color-bg': '#fefefe' },
    });

    registration.dispose();
    expect(registry.getTheme(registeredId)).toBeUndefined();
    expect(registry.getRevision()).toBe(registeredRevision + 1);
    expect(changes[1]?.kind).toBe('unregistered');
    expect(changes[1]?.theme).toBe(theme);

    registration.dispose();
    expect(registry.getRevision()).toBe(registeredRevision + 1);
  });

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

  it('rolls back an earlier theme when a later contribution duplicates a registered id', () => {
    const registry = new ExtensionRegistry();
    const retainedTheme = {
      extensionId: 'workbench-kit.samples.retained',
      id: 'workbench-kit.samples.retained.theme',
      label: 'Retained Theme',
      mode: 'dark' as const,
      tokenOverrides: buildCompleteTokenOverrides('#111111'),
    };
    registry.themes.registerTheme(retainedTheme);
    const changes: string[] = [];
    registry.themes.onDidChangeThemes(({ kind, theme }) => {
      changes.push(`${kind}:${theme.id}`);
    });

    expect(() =>
      registry.registerExtension({
        manifest: {
          schemaVersion: 1,
          id: 'workbench-kit.samples.theme-batch',
          name: 'samples-theme-batch',
          displayName: 'Theme Batch',
          version: '0.0.0',
          publisher: 'workbench-kit',
          engines: { workbench: '^0.0.0', extensionApi: '^0.0.0' },
          activationEvents: ['onStartup'],
          contributes: {
            themes: [
              {
                id: 'workbench-kit.samples.theme-batch.first',
                label: 'First Theme',
                mode: 'light',
                tokenOverrides: buildCompleteTokenOverrides('#eeeeee'),
              },
              {
                id: retainedTheme.id,
                label: 'Duplicate Theme',
                mode: 'dark',
                tokenOverrides: buildCompleteTokenOverrides('#222222'),
              },
            ],
          },
        },
      }),
    ).toThrow(`Theme "${retainedTheme.id}" is already registered.`);

    expect(registry.getExtension('workbench-kit.samples.theme-batch')).toBeUndefined();
    expect(registry.themes.getTheme('workbench-kit.samples.theme-batch.first')).toBeUndefined();
    expect(registry.themes.getTheme(retainedTheme.id)).toBe(retainedTheme);
    expect(registry.themes.getThemes()).toEqual([retainedTheme]);
    expect(changes).toEqual([
      'registered:workbench-kit.samples.theme-batch.first',
      'unregistered:workbench-kit.samples.theme-batch.first',
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

  it('does not apply unsafe tokenOverride CSS values', () => {
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

    applyThemeTokenOverrides(target, {
      '--color-bg': '#0a1628',
      '--color-accent': 'url(javascript:alert(1))',
      '--color-danger': 'expression(alert(1))',
    });

    expect(style.get('--color-bg')).toBe('#0a1628');
    expect(style.has('--color-accent')).toBe(false);
    expect(style.has('--color-danger')).toBe(false);
  });
});
