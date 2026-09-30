/** @vitest-environment jsdom */

import { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID } from '@workbench-kit/react/workbench/commands';

import { BUILTIN_WORKBENCH_EXTENSIONS } from '../extensions/builtin-extensions.js';
import { WorkbenchCommandHost } from '../workbench/command-host.js';
import { readPersistedWorkbenchLayout } from '../workbench/layout-storage.js';
import {
  WorkbenchProvider,
  useWorkbench,
  type WorkbenchContextValue,
  type WorkbenchStorageAdapter,
} from './provider.js';
import {
  WorkbenchHostPrimarySidebarToggle,
  WorkbenchHostShell,
  type WorkbenchHostPrimarySidebarToggleProps,
} from './host-shell.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const cleanup: Array<() => Promise<void>> = [];
const extensionsConfig = { enabled: ['workbench-kit.builtin.explorer'], recommendations: [] };
const initialLayout = {
  activityBar: { itemOrder: ['explorer', 'search'], hiddenItemIds: ['search'], visible: true },
  sideBar: { activeViewContainer: 'explorer', sizePercent: 31, visible: true },
};
const storageKey = 'test.host-sidebar-layout';

interface HarnessOptions {
  commandHost?: boolean;
  hostShell?: boolean;
  toggle?: boolean;
  labels?: WorkbenchHostPrimarySidebarToggleProps;
}

async function createHarness(initialOptions: HarnessOptions = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const stored = new Map<string, string>();
  const storage: WorkbenchStorageAdapter = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  let workbench: WorkbenchContextValue | undefined;
  let options = initialOptions;
  function CaptureWorkbench() {
    const value = useWorkbench();
    useLayoutEffect(() => {
      workbench = value;
    }, [value]);
    return null;
  }
  async function render(nextOptions: HarnessOptions = options) {
    options = nextOptions;
    const toggle =
      options.toggle === false ? null : <WorkbenchHostPrimarySidebarToggle {...options.labels} />;
    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={BUILTIN_WORKBENCH_EXTENSIONS}
          extensionsConfig={extensionsConfig}
          initialLayout={initialLayout}
          layoutStorage={storage}
          layoutStorageKey={storageKey}
          persistEditorState={false}
          persistKeybindingOverrides={false}
          persistLayout
          persistLocalPreferences={false}
        >
          <CaptureWorkbench />
          {options.hostShell ? (
            <WorkbenchHostShell
              editorArea={<main>Editor</main>}
              primarySidebar={<aside>Sidebar</aside>}
              titleBar={toggle}
            />
          ) : (
            toggle
          )}
          {options.commandHost === false ? null : (
            <WorkbenchCommandHost
              enableCommandPalette={false}
              enableQuickOpen={false}
              onOpenSettings={() => undefined}
            />
          )}
        </WorkbenchProvider>,
      );
    });
  }
  cleanup.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  await render();
  return {
    container,
    render,
    storage,
    get workbench() {
      if (!workbench) throw new Error('Workbench services were not captured.');
      return workbench;
    },
    get toggle() {
      const button = container.querySelector<HTMLButtonElement>(
        '.workbench-shell-titlebar__layout-control',
      );
      if (!button) throw new Error('Primary sidebar toggle was not rendered.');
      return button;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WorkbenchHostPrimarySidebarToggle', () => {
  it('dispatches the canonical command and preserves saved width, activity order, and selection', async () => {
    const harness = await createHarness({ hostShell: true });
    const before = structuredClone(harness.workbench.layoutService.getState());
    const handler = harness.workbench.commands.getCommand(
      WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
    )!;
    const dispatch = vi.spyOn(handler, 'handler');
    const button = harness.toggle;
    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Hide Primary Side Bar');
    expect(button.title).toBe('Hide Primary Side Bar');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.focus();
    expect(document.activeElement).toBe(button);

    await act(async () => button.click());
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(harness.workbench.layoutService.getState()).toEqual({
      ...before,
      sideBar: { ...before.sideBar, visible: false },
    });
    expect(readPersistedWorkbenchLayout(storageKey, harness.storage)).toMatchObject({
      activityBar: before.activityBar,
      sideBar: { ...before.sideBar, visible: false },
    });
    expect(button.getAttribute('aria-label')).toBe('Show Primary Side Bar');
    expect(button.title).toBe('Show Primary Side Bar');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(button);

    await act(async () => button.click());
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(harness.workbench.layoutService.getState()).toEqual(before);
    expect(readPersistedWorkbenchLayout(storageKey, harness.storage)).toMatchObject({
      activityBar: before.activityBar,
      sideBar: before.sideBar,
    });
  });

  it('tracks external commands and activity-bar changes without remounting', async () => {
    const harness = await createHarness({ hostShell: true });
    const button = harness.toggle;
    await act(async () => {
      await harness.workbench.executeCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID);
    });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    const activity = harness.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Explorer"]',
    )!;
    expect(activity).not.toBeNull();
    await act(async () => activity.click());
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide Primary Side Bar');
    await act(async () => activity.click());
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(harness.toggle).toBe(button);
  });

  it('uses the provided labels for its accessible name and tooltip', async () => {
    const harness = await createHarness({
      labels: {
        primarySidebarHideLabel: 'Hide navigation',
        primarySidebarShowLabel: 'Show navigation',
      },
    });
    expect(harness.toggle.getAttribute('aria-label')).toBe('Hide navigation');
    expect(harness.toggle.title).toBe('Hide navigation');
    await act(async () => harness.toggle.click());
    expect(harness.toggle.getAttribute('aria-label')).toBe('Show navigation');
    expect(harness.toggle.title).toBe('Show navigation');
  });

  it('is disabled and unfocusable without CommandHost, then follows mount and disposal', async () => {
    const harness = await createHarness({ commandHost: false });
    const before = structuredClone(harness.workbench.layoutService.getState());
    const button = harness.toggle;
    expect(button.disabled).toBe(true);
    button.focus();
    expect(document.activeElement).not.toBe(button);
    await act(async () => button.click());
    expect(harness.workbench.layoutService.getState()).toEqual(before);
    await harness.render({ commandHost: true });
    expect(harness.toggle).toBe(button);
    expect(button.disabled).toBe(false);
    await harness.render({ commandHost: false });
    expect(button.disabled).toBe(true);
  });

  it('does not enable a metadata-only command and reacts when its handler changes', async () => {
    const harness = await createHarness({ commandHost: false });
    const command = { id: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID, title: 'Toggle sidebar' };
    let registration: { dispose(): void } | undefined;
    await act(async () => {
      registration = harness.workbench.commands.registerCommand(command);
    });
    expect(harness.toggle.disabled).toBe(true);
    const registered = harness.workbench.commands.getCommand(command.id)!;
    await act(async () => {
      registered.handler = () => undefined;
      harness.workbench.commands.notifyCommandChanged(command.id);
    });
    expect(harness.toggle.disabled).toBe(false);
    await act(async () => {
      registered.handler = undefined;
      harness.workbench.commands.notifyCommandChanged(command.id);
    });
    expect(harness.toggle.disabled).toBe(true);
    await act(async () => registration?.dispose());
    expect(harness.toggle.disabled).toBe(true);
  });

  it('reports rejection without leaking raw errors or falling back to a layout setter', async () => {
    const harness = await createHarness();
    const before = structuredClone(harness.workbench.layoutService.getState());
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const command = harness.workbench.commands.getCommand(
      WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
    )!;
    vi.spyOn(command, 'handler').mockRejectedValue(new Error('Sensitive backend details'));
    const setVisible = vi.spyOn(harness.workbench.layoutService, 'setSideBarVisible');
    await act(async () => harness.toggle.click());
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'Workbench layout command failed: workbench.togglePrimarySidebar',
    );
    expect(setVisible).not.toHaveBeenCalled();
    expect(harness.workbench.layoutService.getState()).toEqual(before);
    expect(harness.toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('disposes both external-store subscriptions when only the toggle unmounts', async () => {
    const harness = await createHarness({ commandHost: false, toggle: false });
    const { commands, layoutService } = harness.workbench;
    const subscribeLayout = layoutService.onDidChangeLayout;
    const subscribeCommands = commands.onDidChangeCommands;
    const disposeLayout = vi.fn();
    const disposeCommands = vi.fn();
    vi.spyOn(layoutService, 'onDidChangeLayout').mockImplementation((listener) => {
      const subscription = subscribeLayout(listener);
      return {
        dispose: () => {
          disposeLayout();
          subscription.dispose();
        },
      };
    });
    vi.spyOn(commands, 'onDidChangeCommands').mockImplementation((listener) => {
      const subscription = subscribeCommands(listener);
      return {
        dispose: () => {
          disposeCommands();
          subscription.dispose();
        },
      };
    });
    await harness.render({ commandHost: false, toggle: true });
    expect(layoutService.onDidChangeLayout).toHaveBeenCalledTimes(1);
    expect(commands.onDidChangeCommands).toHaveBeenCalledTimes(1);
    await harness.render({ commandHost: false, toggle: false });
    expect(disposeLayout).toHaveBeenCalledTimes(1);
    expect(disposeCommands).toHaveBeenCalledTimes(1);
    await act(async () => layoutService.setSideBarVisible(false));
    expect(harness.container.querySelector('button')).toBeNull();
  });
});
