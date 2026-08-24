/** @vitest-environment jsdom */

import { act, useEffect, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import type { WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';

import { WorkbenchProvider, useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
import { useCommandManagementModel } from '../management/use-command-management.js';
import { useKeybindingManagementModel } from '../management/use-keybinding-management.js';
import { WorkbenchCommandHost } from './command-host.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type CapturedWorkbenchServices = Pick<
  WorkbenchContextValue,
  | 'commands'
  | 'contextKeyService'
  | 'executeCommand'
  | 'keybindings'
  | 'layoutService'
  | 'resetCommandKeybindingOverride'
>;

function WorkbenchServicesProbe({
  onCapture,
}: {
  onCapture: (services: CapturedWorkbenchServices) => void;
}) {
  const {
    commands,
    contextKeyService,
    executeCommand,
    keybindings,
    layoutService,
    resetCommandKeybindingOverride,
  } = useWorkbench();

  useEffect(() => {
    onCapture({
      commands,
      contextKeyService,
      executeCommand,
      keybindings,
      layoutService,
      resetCommandKeybindingOverride,
    });
  }, [
    commands,
    contextKeyService,
    executeCommand,
    keybindings,
    layoutService,
    onCapture,
    resetCommandKeybindingOverride,
  ]);

  return null;
}

function CommandManagementProbe() {
  const { groups } = useCommandManagementModel();
  const commandIds = groups.flatMap((group) => group.entries.map((entry) => entry.id));

  return <output data-testid="management-command-ids">{commandIds.join(',')}</output>;
}

function KeybindingManagementProbe({ commandId }: { commandId: string }) {
  const { entries } = useKeybindingManagementModel();
  const entry = entries.find((candidate) => candidate.commandId === commandId);

  return (
    <output data-testid="management-keybinding">
      {entry ? `${entry.defaultKey ?? ''}|${entry.effectiveKey ?? ''}` : 'missing'}
    </output>
  );
}

function LayoutCommandRegistrationProbe({ commandId }: { commandId: string }) {
  const { commands } = useWorkbench();

  useLayoutEffect(
    () =>
      commands.registerCommand({
        id: commandId,
        shortcut: 'Ctrl+L',
        title: 'Layout registered command',
      }).dispose,
    [commandId, commands],
  );

  return null;
}

function KeybindingProjectionProbe({ commandId }: { commandId: string }) {
  const { keybindingProjection } = useWorkbench();
  const keys = keybindingProjection.defaults
    .filter((binding) => binding.command === commandId)
    .map((binding) => binding.key);

  return <output data-testid="keybinding-projection">{keys.join(',')}</output>;
}

describe('WorkbenchCommandHost', () => {
  it('reconciles a command registered before the provider layout subscription', async () => {
    const commandId = 'test.layout-registered';
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <LayoutCommandRegistrationProbe commandId={commandId} />
          <KeybindingProjectionProbe commandId={commandId} />
        </WorkbenchProvider>,
      );
    });

    expect(container.querySelector('[data-testid="keybinding-projection"]')?.textContent).toBe(
      'ctrl+l',
    );

    await act(async () => {
      root.unmount();
    });
  });

  it('refreshes extension defaults after late keybinding registration and removal', async () => {
    const commandId = 'test.late-keybinding';
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <KeybindingManagementProbe commandId={commandId} />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });

    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'missing',
    );

    let commandRegistration: { dispose(): void } | undefined;
    let keybindingRegistration: { dispose(): void } | undefined;
    await act(async () => {
      commandRegistration = services?.commands.registerCommand({
        id: commandId,
        title: 'Late keybinding command',
      });
      keybindingRegistration = services?.keybindings.registerKeybinding({
        command: commandId,
        key: 'ctrl+k',
      });
    });

    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+k|ctrl+k',
    );

    await act(async () => {
      keybindingRegistration?.dispose();
    });

    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe('|');

    await act(async () => {
      commandRegistration?.dispose();
      root.unmount();
    });
  });

  it('dispatches a command owned by the KeybindingRegistry exactly once', async () => {
    const commandId = 'test.single-owner';
    const run = vi.fn();
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          initialKeybindingOverrides={[{ command: commandId, key: 'alt+e' }]}
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <WorkbenchCommandHost
            enableCommandPalette={false}
            enableExtensionKeybindings
            enableQuickOpen={false}
            enableShortcutBridge
            onOpenSettings={() => undefined}
          />
          <KeybindingManagementProbe commandId={commandId} />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });

    let commandRegistration: { dispose(): void } | undefined;
    let keybindingRegistration: { dispose(): void } | undefined;
    await act(async () => {
      commandRegistration = services?.commands.registerCommand({
        handler: run,
        id: commandId,
        run,
        shortcut: 'ctrl+g',
        title: 'Single owner command',
      });
      keybindingRegistration = services?.keybindings.registerKeybinding({
        command: commandId,
        key: 'ctrl+e',
      });
    });

    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+g|alt+e',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          altKey: true,
          key: 'e',
        }),
      );
      await Promise.resolve();
    });

    expect(run).toHaveBeenCalledOnce();

    await act(async () => {
      root.render(
        <WorkbenchProvider
          initialKeybindingOverrides={[{ command: commandId, key: 'alt+e' }]}
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <WorkbenchCommandHost
            enableCommandPalette={false}
            enableExtensionKeybindings={false}
            enableQuickOpen={false}
            enableShortcutBridge
            onOpenSettings={() => undefined}
          />
          <KeybindingManagementProbe commandId={commandId} />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          altKey: true,
          bubbles: true,
          cancelable: true,
          key: 'e',
        }),
      );
      await Promise.resolve();
    });

    expect(run).toHaveBeenCalledTimes(2);

    await act(async () => {
      services?.resetCommandKeybindingOverride(commandId);
    });
    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+g|ctrl+g',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'e',
        }),
      );
      await Promise.resolve();
    });
    expect(run).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'g',
        }),
      );
      await Promise.resolve();
    });
    expect(run).toHaveBeenCalledTimes(3);

    await act(async () => {
      keybindingRegistration?.dispose();
      commandRegistration?.dispose();
      root.unmount();
    });
    container.remove();
  });

  it('keeps an extension-only managed override on one runtime lane', async () => {
    const commandId = 'test.extension-only-owner';
    const run = vi.fn();
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const renderHost = (enableExtensionKeybindings: boolean) => (
      <WorkbenchProvider
        initialKeybindingOverrides={[{ command: commandId, key: 'alt+q' }]}
        persistEditorState={false}
        persistKeybindingOverrides={false}
        persistLayout={false}
        persistLocalPreferences={false}
      >
        <WorkbenchCommandHost
          enableCommandPalette={false}
          enableExtensionKeybindings={enableExtensionKeybindings}
          enableQuickOpen={false}
          enableShortcutBridge
          onOpenSettings={() => undefined}
        />
        <KeybindingManagementProbe commandId={commandId} />
        <WorkbenchServicesProbe
          onCapture={(capturedServices) => {
            services = capturedServices;
          }}
        />
      </WorkbenchProvider>
    );

    await act(async () => {
      root.render(renderHost(true));
    });

    let commandRegistration: { dispose(): void } | undefined;
    let keybindingRegistration: { dispose(): void } | undefined;
    await act(async () => {
      commandRegistration = services?.commands.registerCommand({
        handler: run,
        id: commandId,
        run,
        title: 'Extension-only owner command',
      });
      keybindingRegistration = services?.keybindings.registerKeybinding({
        command: commandId,
        key: 'ctrl+q',
      });
    });

    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+q|alt+q',
    );

    const dispatchOverride = async () => {
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            altKey: true,
            bubbles: true,
            cancelable: true,
            key: 'q',
          }),
        );
        await Promise.resolve();
      });
    };

    await dispatchOverride();
    expect(run).toHaveBeenCalledOnce();

    await act(async () => {
      root.render(renderHost(false));
    });
    await dispatchOverride();
    expect(run).toHaveBeenCalledTimes(2);

    await act(async () => {
      keybindingRegistration?.dispose();
      commandRegistration?.dispose();
      root.unmount();
    });
    container.remove();
  });

  it('leaves Capture Tab traversal untouched by extension keybindings', async () => {
    const commandId = 'test.capture-tab';
    const run = vi.fn();
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <WorkbenchCommandHost
            enableCommandPalette={false}
            enableExtensionKeybindings
            enableQuickOpen={false}
            enableShortcutBridge={false}
            onOpenSettings={() => undefined}
          />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });

    let commandRegistration: { dispose(): void } | undefined;
    let keybindingRegistration: { dispose(): void } | undefined;
    await act(async () => {
      commandRegistration = services?.commands.registerCommand({
        handler: run,
        id: commandId,
        title: 'Capture Tab command',
      });
      keybindingRegistration = services?.keybindings.registerKeybinding({
        command: commandId,
        key: 'tab',
      });
    });
    const captureTarget = document.createElement('button');
    captureTarget.dataset.workbenchShortcutCaptureRecording = 'true';
    container.append(captureTarget);
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
    });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation');

    await act(async () => {
      captureTarget.dispatchEvent(event);
      await Promise.resolve();
    });

    expect(run).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(stopImmediatePropagation).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);

    await act(async () => {
      keybindingRegistration?.dispose();
      commandRegistration?.dispose();
      root.unmount();
    });
    container.remove();
  });

  it('uses the same managed override for shell command management and runtime dispatch', async () => {
    let services: CapturedWorkbenchServices | undefined;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          initialKeybindingOverrides={[
            { command: 'workbench.toggleFocusMode', key: 'ctrl+shift+f10' },
          ]}
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout={false}
          persistLocalPreferences={false}
        >
          <WorkbenchCommandHost
            enableCommandPalette={false}
            enableExtensionKeybindings={false}
            enableQuickOpen={false}
            enableShortcutBridge
            onOpenSettings={() => undefined}
          />
          <KeybindingManagementProbe commandId="workbench.toggleFocusMode" />
          <WorkbenchServicesProbe
            onCapture={(capturedServices) => {
              services = capturedServices;
            }}
          />
        </WorkbenchProvider>,
      );
    });
    await flushReactEffects();

    expect(services?.layoutService.isFocusModeActive()).toBe(false);
    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+shift+f11|ctrl+shift+f10',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'F11',
          shiftKey: true,
        }),
      );
    });
    expect(services?.layoutService.isFocusModeActive()).toBe(false);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'F10',
          shiftKey: true,
        }),
      );
    });
    expect(services?.layoutService.isFocusModeActive()).toBe(true);

    await act(async () => {
      services?.resetCommandKeybindingOverride('workbench.toggleFocusMode');
    });
    expect(container.querySelector('[data-testid="management-keybinding"]')?.textContent).toBe(
      'ctrl+shift+f11|ctrl+shift+f11',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'F11',
          shiftKey: true,
        }),
      );
    });
    expect(services?.layoutService.isFocusModeActive()).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

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
    expect(services?.commands.getCommand('workbench.showActivity.primary')).toBeDefined();
    expect(services?.commands.getCommand('workbench.showActivity.lab')).toBeUndefined();
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).toContain('workbench.showActivity.primary');
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).not.toContain('workbench.showActivity.lab');

    let commandRegistryChangeCount = 0;
    const commandRegistryDisposable = services?.commands.onDidChangeCommands(() => {
      commandRegistryChangeCount += 1;
    });

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

    expect(services?.commands.getCommand('workbench.showActivity.lab')).toBeDefined();
    expect(palette?.textContent).toContain('Show Lab');
    expect(
      container.querySelector('[data-testid="management-command-ids"]')?.textContent,
    ).toContain('workbench.showActivity.lab');

    await act(async () => {
      await services?.executeCommand('workbench.showActivity.lab');
    });
    expect(services?.layoutService.getState().sideBar.activeViewContainer).toBe('lab');

    await act(async () => {
      services?.contextKeyService.set('workbench.test.labEnabled', false);
    });
    await flushReactEffects();

    expect(services?.commands.getCommand('workbench.showActivity.lab')).toBeUndefined();
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
