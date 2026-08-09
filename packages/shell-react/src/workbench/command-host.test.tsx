/** @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';

import { WorkbenchProvider, useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
import { useCommandManagementModel } from '../management/use-command-management.js';
import { WorkbenchCommandHost } from './command-host.js';

type CapturedWorkbenchServices = Pick<
  WorkbenchContextValue,
  'contextKeyService' | 'extensionRegistry' | 'layoutService'
>;

function WorkbenchServicesProbe({
  onCapture,
}: {
  onCapture: (services: CapturedWorkbenchServices) => void;
}) {
  const { contextKeyService, extensionRegistry, layoutService } = useWorkbench();

  useEffect(() => {
    onCapture({ contextKeyService, extensionRegistry, layoutService });
  }, [contextKeyService, extensionRegistry, layoutService, onCapture]);

  return null;
}

function CommandManagementProbe() {
  const { groups } = useCommandManagementModel();
  const commandIds = groups.flatMap((group) => group.entries.map((entry) => entry.id));

  return <output data-testid="management-command-ids">{commandIds.join(',')}</output>;
}

describe('WorkbenchCommandHost', () => {
  it('keeps activity shell commands, palette, and management aligned with context keys', async () => {
    const extension = createConditionalActivityCommandProbeExtension();
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={[extension]}
          contextKeyValues={{ 'workbench.test.labEnabled': false }}
          extensionsConfig={{
            enabled: [extension.manifest.id],
            recommendations: [],
          }}
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <WorkbenchCommandHost
            enableCommandPalette
            enableExtensionKeybindings={false}
            enableQuickOpen={false}
            enableShortcutBridge={false}
            onOpenSettings={() => undefined}
          />
          <CommandManagementProbe />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });
    await flushReactEffects();

    expect(services).toBeDefined();
    expect(
      services?.extensionRegistry.commands.getCommand('workbench.showActivity.primary'),
    ).toBeDefined();
    expect(
      services?.extensionRegistry.commands.getCommand('workbench.showActivity.lab'),
    ).toBeUndefined();
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).toContain('workbench.showActivity.primary');
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).not.toContain('workbench.showActivity.lab');

    let commandRegistryChangeCount = 0;
    const commandRegistryDisposable = services?.extensionRegistry.commands.onDidChangeCommands(
      () => {
        commandRegistryChangeCount += 1;
      },
    );

    await act(async () => {
      services?.contextKeyService.set('workbench.test.unrelated', true);
    });
    await flushReactEffects();

    expect(commandRegistryChangeCount).toBe(0);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'P',
          shiftKey: true,
        }),
      );
    });
    await flushReactEffects();

    const palette = container.querySelector('[role="dialog"]');
    expect(palette?.textContent).toContain('Show Primary');
    expect(palette?.textContent).not.toContain('Show Lab');

    await act(async () => {
      services?.contextKeyService.set('workbench.test.labEnabled', true);
    });
    await flushReactEffects();

    expect(
      services?.extensionRegistry.commands.getCommand('workbench.showActivity.lab'),
    ).toBeDefined();
    expect(palette?.textContent).toContain('Show Lab');
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).toContain('workbench.showActivity.lab');

    await act(async () => {
      await services?.extensionRegistry.executeCommand('workbench.showActivity.lab');
    });
    expect(services?.layoutService.getState().sideBar.activeViewContainer).toBe('lab');

    await act(async () => {
      services?.contextKeyService.set('workbench.test.labEnabled', false);
    });
    await flushReactEffects();

    expect(
      services?.extensionRegistry.commands.getCommand('workbench.showActivity.lab'),
    ).toBeUndefined();
    expect(palette?.textContent).not.toContain('Show Lab');
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).not.toContain('workbench.showActivity.lab');

    commandRegistryDisposable?.dispose();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

async function flushReactEffects(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function createConditionalActivityCommandProbeExtension(): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: [],
      contributes: {
        activities: [
          {
            icon: 'home',
            id: 'workbench-kit.conditional-activity.primary',
            title: 'Primary',
            viewContainerId: 'primary',
          },
          {
            icon: 'beaker',
            id: 'workbench-kit.conditional-activity.lab',
            title: 'Lab',
            viewContainerId: 'lab',
            when: 'workbench.test.labEnabled',
          },
        ],
        viewContainers: {
          activitybar: [
            {
              icon: 'home',
              id: 'primary',
              title: 'Primary',
            },
            {
              icon: 'beaker',
              id: 'lab',
              title: 'Lab',
            },
          ],
        },
      },
      displayName: 'Conditional Activity Command Probe',
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id: 'workbench-kit.conditional-activity-command-probe',
      name: 'conditional-activity-command-probe',
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
    module: {
      activate: () => undefined,
    },
  };
}
