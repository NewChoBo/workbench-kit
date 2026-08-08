/** @vitest-environment jsdom */

import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';
import { ExtensionRegistry } from '@workbench-kit/workbench-core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { useExtensionRegistryCommandDescriptors } from './use-extension-registry-command-descriptors.js';

let host: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  host?.remove();
  host = undefined;
});

function mountDescriptors(
  extensionRegistry: ExtensionRegistry,
  additionalCommands: readonly WorkbenchCommandDescriptor[] = [],
) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);

  function Harness() {
    const descriptors = useExtensionRegistryCommandDescriptors(
      extensionRegistry,
      additionalCommands,
    );
    return <output data-command-ids={descriptors.map((descriptor) => descriptor.id).join(',')} />;
  }

  act(() => {
    root?.render(<Harness />);
  });

  return () => host?.querySelector('output')?.getAttribute('data-command-ids') ?? '';
}

describe('useExtensionRegistryCommandDescriptors', () => {
  it('tracks registration and removal on the supplied registry', () => {
    const registry = new ExtensionRegistry();
    const getCommandIds = mountDescriptors(registry, [{ id: 'host.help', label: 'Open help' }]);

    expect(getCommandIds()).toBe('host.help');

    let registration: ReturnType<typeof registry.commands.registerCommand> | undefined;
    act(() => {
      registration = registry.commands.registerCommand({
        id: 'sample.run',
        title: 'Run sample',
      });
    });

    expect(getCommandIds()).toBe('sample.run,host.help');

    act(() => {
      registration?.dispose();
    });

    expect(getCommandIds()).toBe('host.help');
    registry.dispose();
  });
});
