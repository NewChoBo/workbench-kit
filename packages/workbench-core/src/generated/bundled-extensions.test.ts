import { describe, expect, it } from 'vitest';

import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  ExtensionRegistry,
  SAMPLE_WORKBENCH_EXTENSIONS,
} from '../index.js';

describe('bundled workbench extensions', () => {
  it('exports built-in and sample extension manifests', () => {
    expect(BUILTIN_WORKBENCH_EXTENSIONS.map(({ manifest }) => manifest.id)).toEqual([
      'workbench-kit.builtin.accounts',
      'workbench-kit.builtin.editor',
      'workbench-kit.builtin.explorer',
      'workbench-kit.builtin.keybindings',
      'workbench-kit.builtin.settings',
      'workbench-kit.builtin.workspace',
    ]);

    expect(SAMPLE_WORKBENCH_EXTENSIONS.map(({ manifest }) => manifest.id)).toEqual([
      'workbench-kit.samples.hello-world',
    ]);

    expect(
      BUILTIN_WORKBENCH_EXTENSIONS.every(
        (extension) => typeof extension.module?.activate === 'function',
      ),
    ).toBe(true);
    expect(
      SAMPLE_WORKBENCH_EXTENSIONS.every(
        (extension) => typeof extension.module?.activate === 'function',
      ),
    ).toBe(true);
  });

  it('registers bundled manifest contributions through ExtensionRegistry', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtensions([...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]);

    expect(registry.commands.getCommand('workbench-kit.builtin.settings.open')).toMatchObject({
      title: 'Open Settings',
    });
    expect(
      registry.commands.getCommand('workbench-kit.samples.hello-world.sayHello'),
    ).toMatchObject({
      title: 'Hello World: Say Hello',
    });
    expect(registry.views.getView('workbench-kit.builtin.explorer.tree')).toMatchObject({
      containerId: 'explorer',
      name: 'Explorer',
    });
    expect(registry.editors.getEditor('workbench-kit.builtin.editor.text')).toMatchObject({
      label: 'Text Editor',
    });
    expect(
      registry.activities.getActivity('workbench-kit.builtin.explorer.activity'),
    ).toMatchObject({
      viewContainerId: 'explorer',
    });
    expect(
      registry.activities.getActivity('workbench-kit.builtin.settings.activity'),
    ).toBeUndefined();
    expect(registry.views.getView('workbench-kit.builtin.settings.view')).toBeUndefined();
  });
});
