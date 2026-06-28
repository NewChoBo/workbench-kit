import { describe, expect, it } from 'vitest';

import { validateWorkbenchExtensionManifests } from './workbench-extension-manifest-utils.mjs';

const repoRoot = 'repo';

function createManifestEntry(manifest) {
  return {
    directory: 'builtin.test',
    extensionDirectory: 'repo/extensions/builtin.test',
    extensionPath: 'extensions/builtin.test',
    manifest,
    manifestPath: 'repo/extensions/builtin.test/workbench.extension.json',
    packageJson: {
      dependencies: {
        '@workbench-kit/workbench-extension-sdk': 'workspace:*',
      },
      name: 'builtin-test',
      private: true,
      type: 'module',
    },
    packageJsonPath: 'repo/extensions/builtin.test/package.json',
  };
}

function createValidManifest(overrides = {}) {
  return {
    activationEvents: [],
    displayName: 'Test Extension',
    engines: {
      extensionApi: '^0.0.0',
      workbench: '^0.0.0',
    },
    id: 'workbench-kit.test',
    name: 'test',
    publisher: 'workbench-kit',
    schemaVersion: 1,
    version: '0.0.0',
    ...overrides,
  };
}

describe('workbench extension manifest validation', () => {
  it('accepts known contribution shapes', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              commands: [
                {
                  command: 'workbench-kit.test.run',
                  title: 'Run Test',
                },
              ],
              configuration: {
                properties: {
                  'workbench.test.enabled': {
                    type: 'boolean',
                  },
                },
              },
              documentViews: [
                {
                  filenamePatterns: ['*.test.json'],
                  id: 'workbench-kit.test.preview',
                  kind: 'preview',
                  label: 'Test Preview',
                  mimeTypes: ['application/json'],
                },
              ],
              menus: {
                commandPalette: [
                  {
                    command: 'workbench-kit.test.run',
                  },
                ],
              },
              viewContainers: {
                activitybar: [
                  {
                    id: 'test',
                    title: 'Test',
                  },
                ],
              },
              views: {
                test: [
                  {
                    id: 'workbench-kit.test.view',
                    name: 'Test',
                  },
                ],
              },
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations).toEqual([]);
  });

  it('reports invalid known contribution shapes', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              commands: [
                {
                  command: 'workbench-kit.test.run',
                },
              ],
              configuration: {
                properties: {
                  'workbench.test.enabled': {
                    type: 'bool',
                  },
                },
              },
              documentViews: [
                {
                  id: 'workbench-kit.test.preview',
                  kind: 'side-by-side',
                },
              ],
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations.map((violation) => violation.rule)).toEqual([
      'manifest-contributes',
      'manifest-contributes',
      'manifest-contributes',
      'manifest-contributes',
    ]);
    expect(violations.map((violation) => violation.location)).toEqual([
      'extensions/builtin.test/workbench.extension.json#contributes.commands[0].title',
      'extensions/builtin.test/workbench.extension.json#contributes.documentViews[0].kind',
      'extensions/builtin.test/workbench.extension.json#contributes.documentViews[0].label',
      'extensions/builtin.test/workbench.extension.json#contributes.configuration.properties.workbench.test.enabled.type',
    ]);
  });

  it('requires array-form menu contributions to declare a menu location', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              menus: [
                {
                  command: 'workbench-kit.test.run',
                },
              ],
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations).toEqual([
      expect.objectContaining({
        location: 'extensions/builtin.test/workbench.extension.json#contributes.menus[0].menu',
        rule: 'manifest-contributes',
      }),
    ]);
  });

  it('allows object-form menu contributions to inherit the menu location from the surface key', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              menus: {
                'explorer/context': [
                  {
                    command: 'workbench-kit.test.run',
                  },
                ],
              },
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations).toEqual([]);
  });

  it('requires theme contributions to declare a mode', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              themes: [
                {
                  id: 'workbench-kit.test.alt-theme',
                  label: 'Alt Theme',
                },
              ],
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations).toEqual([
      expect.objectContaining({
        location: 'extensions/builtin.test/workbench.extension.json#contributes.themes[0].mode',
        rule: 'manifest-contributes',
      }),
    ]);
  });

  it('requires contributed theme tokenOverrides to cover the full token set', () => {
    const violations = validateWorkbenchExtensionManifests(
      [
        createManifestEntry(
          createValidManifest({
            contributes: {
              themes: [
                {
                  id: 'workbench-kit.test.alt-theme',
                  label: 'Alt Theme',
                  mode: 'dark',
                  tokenOverrides: {
                    '--color-bg': '#0a1628',
                  },
                },
              ],
            },
          }),
        ),
      ],
      repoRoot,
    );

    expect(violations).toEqual([
      expect.objectContaining({
        location:
          'extensions/builtin.test/workbench.extension.json#contributes.themes[0].tokenOverrides',
        rule: 'manifest-theme-token-overrides-incomplete',
      }),
    ]);
  });
});
