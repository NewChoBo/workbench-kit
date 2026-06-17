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

  it('activates only enabled built-in extension view providers', async () => {
    const config = parseWorkbenchExtensionsConfigJson(`{
      "enabled": ["workbench-kit.builtin.explorer"]
    }`);
    const registry = new ExtensionRegistry();
    const resolution = resolveWorkbenchExtensions(config, BUILTIN_WORKBENCH_EXTENSIONS);

    registry.registerExtensions(resolution.enabledExtensions);

    await registry.activateView('workbench-kit.builtin.explorer.tree');

    expect(
      registry.views
        .getViewProvider('workbench-kit.builtin.explorer.tree')
        ?.resolveViewHost()
        .render(),
    ).toEqual({ kind: 'workbench-kit.builtin.explorer.view' });
    expect(registry.commands.getCommand('workspace.newFile')).toBeDefined();
    expect(registry.commands.getCommand('workbench-kit.builtin.settings.open')).toBeUndefined();
    expect(registry.getExtension('workbench-kit.builtin.settings')).toBeUndefined();
  });

  it('omits explorer contributions when the extension is disabled', () => {
    const config = parseWorkbenchExtensionsConfigJson(`{
      "enabled": ["workbench-kit.builtin.settings"]
    }`);
    const registry = new ExtensionRegistry();
    const resolution = resolveWorkbenchExtensions(config, BUILTIN_WORKBENCH_EXTENSIONS);

    registry.registerExtensions(resolution.enabledExtensions);

    expect(registry.views.getView('workbench-kit.builtin.explorer.tree')).toBeUndefined();
    expect(registry.commands.getCommand('workbench-kit.builtin.explorer.refresh')).toBeUndefined();
    expect(registry.commands.getCommand('workbench-kit.builtin.settings.open')).toMatchObject({
      title: 'Open Settings',
    });
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
