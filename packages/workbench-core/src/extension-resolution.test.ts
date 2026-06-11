import { describe, expect, it } from 'vitest';

import { parseWorkbenchExtensionsConfigJson } from '@workbench-kit/workbench-config';

import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  ExtensionRegistry,
  resolveWorkbenchExtensions,
} from './index.js';

describe('resolveWorkbenchExtensions', () => {
  it('selects enabled bundled extensions from workspace config', () => {
    const config = parseWorkbenchExtensionsConfigJson(`{
      "enabled": [
        "workbench-kit.builtin.explorer",
        "workbench-kit.builtin.settings"
      ]
    }`);
    const resolution = resolveWorkbenchExtensions(config, BUILTIN_WORKBENCH_EXTENSIONS);

    expect(resolution.enabledExtensions.map(({ manifest }) => manifest.id)).toEqual([
      'workbench-kit.builtin.explorer',
      'workbench-kit.builtin.settings',
    ]);
    expect(resolution.missingExtensionIds).toEqual([]);
    expect(resolution.disabledExtensions.map(({ manifest }) => manifest.id)).toContain(
      'workbench-kit.builtin.accounts',
    );
  });

  it('loads configured bundled extensions into ExtensionRegistry', () => {
    const config = parseWorkbenchExtensionsConfigJson(`{
      "enabled": [
        "workbench-kit.builtin.explorer",
        "workbench-kit.builtin.settings"
      ]
    }`);
    const registry = new ExtensionRegistry();
    const resolution = resolveWorkbenchExtensions(config, BUILTIN_WORKBENCH_EXTENSIONS);

    registry.registerExtensions(resolution.enabledExtensions);

    expect(registry.views.getView('workbench-kit.builtin.explorer.tree')).toMatchObject({
      containerId: 'explorer',
    });
    expect(registry.commands.getCommand('workbench-kit.builtin.settings.open')).toMatchObject({
      title: 'Open Settings',
    });
    expect(registry.getExtension('workbench-kit.builtin.accounts')).toBeUndefined();
  });

  it('reports missing configured extension IDs', () => {
    const config = parseWorkbenchExtensionsConfigJson(`{
      "enabled": ["missing.extension"]
    }`);

    expect(
      resolveWorkbenchExtensions(config, BUILTIN_WORKBENCH_EXTENSIONS).missingExtensionIds,
    ).toEqual(['missing.extension']);
  });
});
