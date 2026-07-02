/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorkbenchLayoutConfig } from '@workbench-kit/workbench-config';
import type { EditorState, WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';
import {
  createWorkbenchHostThemeRegistration,
  REQUIRED_THEME_TOKEN_KEYS,
} from '@workbench-kit/workbench-core';
import {
  createWorkbenchWorkspaceHostPort,
  type VirtualWorkspaceInitialState,
} from '@workbench-kit/workspace';

class ResizeObserverMock {
  disconnect() {}
  observe() {}
  unobserve() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

import {
  DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  WorkbenchProvider,
  WorkbenchShell,
  useEditorService,
  useWorkbench,
  type WorkbenchStorageAdapter,
  type WorkbenchShellProps,
} from './index.js';
import {
  BUILTIN_EXPLORER_MOVE_COMMAND_ID,
  BUILTIN_EXPLORER_REVEAL_COMMAND_ID,
} from './explorer-view-data.js';
import { BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID } from './extensions-view-data.js';

function ExplorerRevealCommandProbe({
  initialState,
  onResult,
  path,
}: {
  initialState: VirtualWorkspaceInitialState;
  onResult: (result: unknown) => void;
  path: string;
}) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await executeCommand('workspace.init', initialState);
      const result = await executeCommand(BUILTIN_EXPLORER_REVEAL_COMMAND_ID, { path });
      if (!cancelled) {
        onResult(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [executeCommand, initialState, onResult, path]);

  return null;
}

function OpenEditorTabProbe({ path, onReady }: { onReady: () => void; path: string }) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void executeCommand('workspace.open', { path }).then(() => {
      if (!cancelled) {
        onReady();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [executeCommand, onReady, path]);

  return null;
}

function PersistEditorStateProbe({ onReady }: { onReady: () => void }) {
  const editorService = useEditorService();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      while (
        !cancelled &&
        editorService.resolveEditorId('workspace://file/src/App.tsx') === undefined
      ) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (cancelled) {
        return;
      }

      const opened = editorService.openEditor({
        pinned: true,
        resourceUri: 'workspace://file/src/App.tsx',
        title: 'App.tsx',
      });
      editorService.splitEditor({
        direction: 'vertical',
        tabId: opened.id,
      });
      onReady();
    })();

    return () => {
      cancelled = true;
    };
  }, [editorService, onReady]);

  return null;
}

function CaptureEditorStateProbe({ onState }: { onState: (state: EditorState) => void }) {
  const editorService = useEditorService();

  useEffect(() => {
    onState(editorService.getState());
  }, [editorService, onState]);

  return null;
}

const WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID = 'workbench.togglePrimarySidebar';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function TestWorkbenchShell(props: Omit<WorkbenchShellProps, 'commandHost'>) {
  return <WorkbenchShell {...props} commandHost={false} />;
}

function createMemoryStorage(): WorkbenchStorageAdapter {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function CommandProbe() {
  const workbench = useWorkbench();

  return <span>{workbench.extensionRegistry.getExtensions().length}</span>;
}

function CommandTitleProbe({ commandId }: { commandId: string }) {
  const workbench = useWorkbench();

  return (
    <span>{workbench.extensionRegistry.commands.getCommand(commandId)?.title ?? 'missing'}</span>
  );
}

function HostThemeProbe({ themeId }: { themeId: string }) {
  const workbench = useWorkbench();

  return <span>{workbench.extensionRegistry.themes.getTheme(themeId)?.label ?? 'missing'}</span>;
}

function PreferenceValueProbe({
  onValue,
  preferenceKey,
}: {
  onValue: (value: unknown) => void;
  preferenceKey: string;
}) {
  const { preferenceService } = useWorkbench();

  useEffect(() => {
    onValue(preferenceService.getEffectiveValue(preferenceKey));
    const disposable = preferenceService.onDidChangePreference((event) => {
      if (event.key === preferenceKey) {
        onValue(event.effectiveValue);
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [onValue, preferenceKey, preferenceService]);

  return null;
}

function WorkspaceCreateCommandProbe({ onResult }: { onResult: (result: unknown) => void }) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void executeCommand('workspace.newFile', { path: 'notes.md' }).then((result) => {
      if (!cancelled) {
        onResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [executeCommand, onResult]);

  return null;
}

function FocusExtensionsCommandProbe({ onResult }: { onResult: (result: unknown) => void }) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void executeCommand(BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID).then((result) => {
      if (!cancelled) {
        onResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [executeCommand, onResult]);

  return null;
}

function WorkspaceInitCommandProbe({
  initialState,
  onResult,
}: {
  initialState: VirtualWorkspaceInitialState;
  onResult: (result: unknown) => void;
}) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void executeCommand('workspace.init', initialState).then((result) => {
      if (!cancelled) {
        onResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [executeCommand, initialState, onResult]);

  return null;
}

function WorkspaceMoveFolderCommandProbe({ onResult }: { onResult: (result: unknown) => void }) {
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await executeCommand('workspace.init', {
        expandedPaths: ['src', 'src/components'],
        files: [{ content: 'button', path: 'src/components/Button.tsx' }],
        folders: ['docs', 'src/components'],
        openPaths: ['src/components/Button.tsx'],
        selectedPath: 'src/components/Button.tsx',
      });
      const result = await executeCommand(BUILTIN_EXPLORER_MOVE_COMMAND_ID, {
        sourcePaths: ['src/components'],
        targetFolderPath: 'docs',
      });

      if (!cancelled) {
        onResult(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [executeCommand, onResult]);

  return null;
}

function OpenSettingsCommandButton() {
  const { executeCommand } = useWorkbench();

  return (
    <button
      type="button"
      onClick={() => {
        void executeCommand('workbench-kit.builtin.settings.open');
      }}
    >
      Open Settings Command
    </button>
  );
}

function ToggleSidebarShellCommandButton({ onResult }: { onResult: (visible: boolean) => void }) {
  const { executeCommand, layoutService } = useWorkbench();

  return (
    <button
      type="button"
      onClick={() => {
        void executeCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID).then(() => {
          onResult(layoutService.getState().sideBar.visible);
        });
      }}
    >
      Toggle Sidebar Command
    </button>
  );
}

function SidebarVisibilityProbe({ onChange }: { onChange: (visible: boolean) => void }) {
  const { layoutService } = useWorkbench();

  useEffect(() => {
    onChange(layoutService.getState().sideBar.visible);
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      onChange(state.sideBar.visible);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService, onChange]);

  return null;
}

describe('WorkbenchProvider', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it('provides configured core registries to React children', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: ['workbench-kit.builtin.explorer'],
          recommendations: [],
        }}
      >
        <CommandProbe />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('<span>1</span>');
  });

  it('registers host themes from bootstrap props', () => {
    const tokenOverrides = Object.fromEntries(
      REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, '#101820']),
    );
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        hostThemes={[
          createWorkbenchHostThemeRegistration('workbench-kit.test.host.theme', tokenOverrides, {
            label: 'Test Host Theme',
            mode: 'dark',
          }),
        ]}
      >
        <HostThemeProbe themeId="workbench-kit.test.host.theme" />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('Test Host Theme');
  });

  it('loads installed extension records from an injected storage adapter', () => {
    const installedExtensionsStorageKey = 'workbench-kit/.workbench/installed-extensions/test';
    const installedExtensionsStorage = createMemoryStorage();
    installedExtensionsStorage.setItem(
      installedExtensionsStorageKey,
      JSON.stringify([
        {
          category: 'sample',
          enabled: true,
          id: 'workbench-kit.samples.hello-world',
          installedAt: '2026-06-21T00:00:00.000Z',
          manifestUrl: '/extensions/samples.hello-world/workbench.extension.json',
        },
      ]),
    );

    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        installedExtensionsStorage={installedExtensionsStorage}
        installedExtensionsStorageKey={installedExtensionsStorageKey}
      >
        <CommandTitleProbe commandId="workbench-kit.samples.hello-world.sayHello" />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('Hello World: Say Hello');
  });

  it('renders a workbench shell from registered view contributions', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: ['workbench-kit.builtin.explorer'],
          recommendations: [],
        }}
        initialLayout={parseWorkbenchLayoutConfig({
          sideBar: {
            activeViewContainer: 'explorer',
            visible: true,
          },
        })}
      >
        <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('Explorer');
    expect(markup).toContain('codicon codicon-files');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Editor Area');
    expect(markup).toContain('extensions: 1');
  });

  it('hides configured primary activity bar items from layout state', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: ['workbench-kit.builtin.explorer', 'workbench-kit.builtin.search'],
          recommendations: [],
        }}
        initialLayout={parseWorkbenchLayoutConfig({
          activityBar: {
            hiddenItemIds: ['search'],
            visible: true,
          },
          sideBar: {
            activeViewContainer: 'explorer',
            visible: true,
          },
        })}
      >
        <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('aria-label="Explorer"');
    expect(markup).not.toContain('aria-label="Search"');
  });

  it('opens the extensions sidebar from the built-in focus command', async () => {
    const commandResults: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.extensions'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              visible: false,
            },
          })}
        >
          <FocusExtensionsCommandProbe
            onResult={(result) => {
              commandResults.push(result);
            }}
          />
          <TestWorkbenchShell catalogUrl="" editorArea={<main>Editor Area</main>} />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await act(async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (container.querySelector('[data-view-id="workbench-kit.builtin.extensions.panel"]')) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
    await flushReactEffects();

    expect(commandResults[0]).toMatchObject({
      focused: true,
      viewId: 'workbench-kit.builtin.extensions.panel',
    });
    expect(
      container.querySelector('[data-view-id="workbench-kit.builtin.extensions.panel"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain('Extensions');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens contributed settings in a modal overlay', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: [
              'workbench-kit.builtin.accounts',
              'workbench-kit.builtin.settings',
              'workbench-kit.builtin.workspace',
            ],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    expect(
      container.querySelector('[data-view-id="workbench-kit.builtin.settings.view"]'),
    ).toBeNull();

    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Settings"]',
    );
    expect(settingsButton).toBeDefined();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Settings');
    expect(dialog?.textContent).toContain('workbench.settings.openOnStartup');
    expect(dialog?.textContent).toContain('effective: false');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('writes contributed settings through the selected preference scope', async () => {
    const preferenceKey = 'workbench.settings.openOnStartup';
    const storageKey = `${DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY}/provider-scope-test`;
    const localPreferenceStorage = createMemoryStorage();
    const observedValues: unknown[] = [];
    const restoredValues: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.settings'],
            recommendations: [],
          }}
          initialWorkspaceSettings={{
            [preferenceKey]: true,
          }}
          localPreferenceStorage={localPreferenceStorage}
          localPreferenceStorageKey={storageKey}
          persistLocalPreferences
        >
          <PreferenceValueProbe
            preferenceKey={preferenceKey}
            onValue={(value) => observedValues.push(value)}
          />
          <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    expect(observedValues[observedValues.length - 1]).toBe(true);

    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Settings"]',
    );
    expect(settingsButton).toBeDefined();

    await act(async () => {
      settingsButton?.click();
    });
    await flushReactEffects();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Settings');
    expect(dialog?.textContent).toContain('Default');
    expect(dialog?.textContent).toContain('Workspace');
    expect(dialog?.textContent).toContain('Local');
    expect(dialog?.textContent).toContain('effective: true');

    const localScopeButton = findButtonByText(container, 'Local');
    expect(localScopeButton).toBeDefined();

    await act(async () => {
      localScopeButton?.click();
    });
    await flushReactEffects();

    const localCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(localCheckbox?.checked).toBe(true);

    await act(async () => {
      localCheckbox?.click();
    });
    await flushReactEffects();

    expect(observedValues[observedValues.length - 1]).toBe(false);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('effective: false');
    expect(localPreferenceStorage.getItem(storageKey)).toContain(
      '"workbench.settings.openOnStartup": false',
    );

    const workspaceScopeButton = findButtonByText(container, 'Workspace');
    expect(workspaceScopeButton).toBeDefined();

    await act(async () => {
      workspaceScopeButton?.click();
    });
    await flushReactEffects();

    const workspaceCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(workspaceCheckbox?.checked).toBe(true);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('effective: false');

    await act(async () => {
      root.unmount();
    });
    container.remove();
    await flushReactEffects();

    const restoredContainer = document.createElement('div');
    document.body.append(restoredContainer);
    const restoredRoot = createRoot(restoredContainer);

    await act(async () => {
      restoredRoot.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.settings'],
            recommendations: [],
          }}
          initialWorkspaceSettings={{
            [preferenceKey]: true,
          }}
          localPreferenceStorage={localPreferenceStorage}
          localPreferenceStorageKey={storageKey}
          persistLocalPreferences
        >
          <PreferenceValueProbe
            preferenceKey={preferenceKey}
            onValue={(value) => restoredValues.push(value)}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    expect(restoredValues[restoredValues.length - 1]).toBe(false);

    await act(async () => {
      restoredRoot.unmount();
    });
    restoredContainer.remove();
  });

  it('opens the service profile from the secondary activity bar action', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.accounts', 'workbench-kit.builtin.settings'],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell
            accountManagement={{
              accounts: [
                {
                  displayName: 'GitHub Project Access',
                  email: 'project@example.com',
                  id: 'github-project',
                  providerId: 'github',
                  providerLabel: 'GitHub',
                  status: 'signed-out',
                },
              ],
            }}
            editorArea={<main>Editor Area</main>}
            profile={{
              accountId: 'tester',
              displayName: 'Tester',
              email: 'tester@example.com',
              providerLabel: 'Sample Login',
              sessionLabel: 'Demo session active',
              statusLabel: 'Active',
              workspaceLabel: 'Demo Workspace',
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const activityBar = container.querySelector('[aria-label="Activity bar"]');
    const activityLabels = Array.from(
      activityBar?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).map((button) => button.getAttribute('aria-label'));

    expect(activityLabels.indexOf('Profile')).toBeLessThan(activityLabels.indexOf('Settings'));

    const profileButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Profile"]',
    );
    expect(profileButton).toBeDefined();

    await act(async () => {
      profileButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Profile');
    expect(dialog?.textContent).toContain('Tester');
    expect(dialog?.textContent).toContain('Demo Workspace');
    expect(dialog?.textContent).not.toContain('Linked Accounts');
    expect(profileButton?.getAttribute('aria-pressed')).toBe('true');

    const closeButton = findButtonByText(container, 'Close');
    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Settings"]',
    );
    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const settingsDialog = container.querySelector('[role="dialog"]');
    expect(settingsDialog?.textContent).toContain('Linked Accounts');

    const linkedAccountsButton = findButtonByText(container, 'Linked Accounts');
    await act(async () => {
      linkedAccountsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const linkedAccountsDialog = container.querySelector('[role="dialog"]');
    expect(linkedAccountsDialog?.textContent).toContain('Linked Accounts');
    expect(linkedAccountsDialog?.textContent).toContain('GitHub Project Access');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens contributed settings through the built-in settings command', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.settings'],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
          <OpenSettingsCommandButton />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const commandButton = findButtonByText(container, 'Open Settings Command');
    expect(commandButton).toBeDefined();

    await act(async () => {
      commandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Settings');
    expect(dialog?.textContent).toContain('workbench.settings.openOnStartup');
    expect(dialog?.textContent).not.toContain('workbench.accounts.enabledEnable');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('routes shell commands through the provider command registry', async () => {
    const sidebarStates: boolean[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'explorer',
              visible: true,
            },
          })}
        >
          <WorkbenchShell editorArea={<main>Editor Area</main>} />
          <ToggleSidebarShellCommandButton
            onResult={(visible) => {
              sidebarStates.push(visible);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const commandButton = findButtonByText(container, 'Toggle Sidebar Command');
    expect(commandButton).toBeDefined();

    await act(async () => {
      commandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    expect(sidebarStates).toEqual([false]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('runs workbench commands from the built-in chat slash input', async () => {
    const sidebarStates: boolean[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.chat'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'chatting',
              visible: true,
            },
          })}
        >
          <WorkbenchShell editorArea={<main>Editor Area</main>} />
          <SidebarVisibilityProbe
            onChange={(visible) => {
              sidebarStates.push(visible);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    const textarea = await waitForElement(() =>
      container.querySelector<HTMLTextAreaElement>('textarea[placeholder="Message your team"]'),
    );
    expect(textarea).not.toBeNull();

    await act(async () => {
      setTextAreaValue(textarea, '/workbench.togglePrimarySidebar');
    });
    await waitForText(container, 'Toggle primary sidebar');

    await act(async () => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      );
    });
    await flushReactEffects();

    expect(sidebarStates[sidebarStates.length - 1]).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('exposes theme selection through the settings appearance category', async () => {
    const themeChanges: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.settings'],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell
            darkPreset="purple"
            editorArea={<main>Editor Area</main>}
            lightPreset="skyblue"
            theme="system"
            onThemeChange={(nextTheme) => {
              themeChanges.push(nextTheme);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Settings"]',
    );
    expect(settingsButton).toBeDefined();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const appearanceButton = findButtonByText(container, 'Appearance');
    expect(appearanceButton).toBeDefined();

    await act(async () => {
      appearanceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.textContent).toContain('Color scheme');
    expect(dialog?.textContent).toContain('Light preset');
    expect(dialog?.textContent).toContain('Dark preset');

    const colorSchemeCombobox = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>('button[role="combobox"]') ?? [],
    ).find((button) => button.getAttribute('aria-label') === 'Color scheme');
    expect(colorSchemeCombobox).toBeDefined();

    const themeSelect = colorSchemeCombobox?.parentElement?.querySelector<HTMLSelectElement>(
      'select.ui-select__native',
    );
    expect(themeSelect).not.toBeNull();

    await act(async () => {
      themeSelect!.value = 'light';
      themeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flushReactEffects();

    expect(themeChanges).toEqual(['light']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders shell titlebar actions and opens help in a modal overlay', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell
            editorArea={<main>Editor Area</main>}
            helpContent={<p>Open example.jdw.json to preview the sample.</p>}
            title="Workbench Sample"
            titleBarActions={<button type="button">Sample Action</button>}
            titleMeta={<span>4 files</span>}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const titleBar = container.querySelector('.ui-workbench-titlebar');
    expect(titleBar?.textContent).toContain('Workbench Sample');
    expect(titleBar?.textContent).toContain('4 files');
    expect(titleBar?.textContent).toContain('Sample Action');

    const helpButton = container.querySelector<HTMLButtonElement>('button[aria-label="Help"]');
    expect(helpButton).toBeDefined();

    await act(async () => {
      helpButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Workbench Help');
    expect(dialog?.textContent).toContain('Open example.jdw.json to preview the sample.');
    expect(
      dialog?.querySelector('.ui-modal__body')?.classList.contains('ui-workbench-scrollbar'),
    ).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders shell titlebar layout controls and toggles the primary sidebar', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
        >
          <TestWorkbenchShell editorArea={<main>Editor Area</main>} title="Workbench Sample" />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    const primaryToggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle Primary Side Bar"]',
    );
    const panelToggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle Panel"]',
    );
    const secondaryToggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle Secondary Side Bar"]',
    );
    expect(primaryToggle).not.toBeNull();
    expect(panelToggle).not.toBeNull();
    expect(secondaryToggle).not.toBeNull();
    expect(primaryToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(panelToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(secondaryToggle?.getAttribute('aria-pressed')).toBe('false');

    const primarySidebar = container.querySelector('.workbench-primary-side-bar');
    const auxiliarySidebar = container.querySelector('.workbench-auxiliary-side-bar');
    const bottomPanel = container.querySelector('.workbench-bottom-panel');
    const auxiliarySplitView = auxiliarySidebar?.closest('.ui-workbench-split-view');
    const bottomPanelSplitView = bottomPanel?.closest('.ui-workbench-split-view');
    expect(primarySidebar).not.toBeNull();
    expect(auxiliarySidebar).not.toBeNull();
    expect(bottomPanel).not.toBeNull();
    expect(
      auxiliarySplitView?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(true);
    expect(
      bottomPanelSplitView?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(true);

    await act(async () => {
      primaryToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    expect(primaryToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.workbench-primary-side-bar')).not.toBeNull();
    expect(primarySidebar?.closest('.ui-workbench-split-view--primary-collapsed')).not.toBeNull();

    await act(async () => {
      secondaryToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    expect(secondaryToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(
      auxiliarySplitView?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(false);

    await act(async () => {
      panelToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    expect(panelToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(
      bottomPanelSplitView?.classList.contains('ui-workbench-split-view--secondary-collapsed'),
    ).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the built-in explorer from the virtual workspace and opens files', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const initialState = {
      expandedPaths: ['src'],
      files: [
        {
          content: 'export const sample = true;',
          path: 'src/App.tsx',
        },
        {
          content: '{}',
          path: 'config.json',
        },
      ],
      folders: ['src'],
    } satisfies VirtualWorkspaceInitialState;
    const commandResults: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor', 'workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'explorer',
              visible: true,
            },
          })}
          workspaceHostPort={workspaceHostPort}
        >
          <WorkspaceInitCommandProbe
            initialState={initialState}
            onResult={(result) => {
              commandResults.push(result);
            }}
          />
          <TestWorkbenchShell />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    expect(container.textContent).toContain('src');
    expect(container.textContent).toContain('App.tsx');
    expect(container.textContent).toContain('config.json');
    expect(workspaceHostPort.service.getTransactionJournal()[0]).toMatchObject({
      label: 'Initialize workspace',
      mutations: [
        {
          state: initialState,
          type: 'initialize-workspace',
        },
      ],
    });
    expect(commandResults[0]).toMatchObject({
      paths: ['src', 'src/App.tsx', 'config.json'],
      transactionId: expect.any(String),
    });

    const appButton = findButtonByText(container, 'App.tsx');
    expect(appButton).toBeDefined();

    await act(async () => {
      appButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushReactEffects();

    expect(container.querySelector('[role="tab"]')?.textContent).toContain('App.tsx');
    expect(findButtonByText(container, 'App.tsx')?.getAttribute('aria-current')).toBe('true');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('reveals nested workspace paths through the explorer reveal command', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const initialState = {
      expandedPaths: [],
      files: [
        {
          content: 'export const sample = true;',
          path: 'src/App.tsx',
        },
      ],
      folders: ['src'],
    } satisfies VirtualWorkspaceInitialState;
    const commandResults: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'explorer',
              visible: true,
            },
          })}
          workspaceHostPort={workspaceHostPort}
        >
          <ExplorerRevealCommandProbe
            initialState={initialState}
            path="src/App.tsx"
            onResult={(result) => {
              commandResults.push(result);
            }}
          />
          <TestWorkbenchShell />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await act(async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (commandResults[0] && findButtonByText(container, 'App.tsx')) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
    await flushReactEffects();

    expect(commandResults[0]).toMatchObject({
      path: 'src/App.tsx',
      viewId: 'workbench-kit.builtin.explorer.tree',
    });
    expect(findButtonByText(container, 'App.tsx')?.dataset.selected).toBe('true');
    expect(findButtonByText(container, 'src')?.querySelector('.codicon-chevron-down')).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('syncs explorer active highlighting when a file is opened from the editor service', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const initialState = {
      expandedPaths: [],
      files: [
        {
          content: 'export const sample = true;',
          path: 'src/App.tsx',
        },
        {
          content: '{}',
          path: 'config.json',
        },
      ],
      folders: ['src'],
    } satisfies VirtualWorkspaceInitialState;
    let editorReady = false;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor', 'workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'explorer',
              visible: true,
            },
          })}
          workspaceHostPort={workspaceHostPort}
        >
          <WorkspaceInitCommandProbe initialState={initialState} onResult={() => undefined} />
          <OpenEditorTabProbe
            path="config.json"
            onReady={() => {
              editorReady = true;
            }}
          />
          <TestWorkbenchShell />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await waitForText(container, 'config.json');
    await act(async () => {
      for (let attempt = 0; attempt < 20 && !editorReady; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
    await flushReactEffects();

    expect(container.querySelector('[role="tab"]')?.textContent).toContain('config.json');
    expect(findButtonByText(container, 'config.json')?.getAttribute('aria-current')).toBe('true');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('persists and restores editor service state through an injected storage adapter', async () => {
    const storageKey = `${DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY}/provider-test`;
    const editorStateStorage = createMemoryStorage();
    const firstContainer = document.createElement('div');
    document.body.append(firstContainer);
    const firstRoot = createRoot(firstContainer);
    let persistedReady = false;

    await act(async () => {
      firstRoot.render(
        <WorkbenchProvider
          editorStateStorage={editorStateStorage}
          editorStateStorageKey={storageKey}
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <PersistEditorStateProbe
            onReady={() => {
              persistedReady = true;
            }}
          />
        </WorkbenchProvider>,
      );
    });

    for (let attempt = 0; attempt < 20 && !persistedReady; attempt += 1) {
      await flushReactEffects();
    }

    expect(persistedReady).toBe(true);
    const rawPersisted = editorStateStorage.getItem(storageKey);
    expect(rawPersisted).toContain('workspace://file/src/App.tsx');
    expect(rawPersisted).toContain('"direction": "vertical"');

    await act(async () => {
      firstRoot.unmount();
    });
    firstContainer.remove();
    await flushReactEffects();

    const secondContainer = document.createElement('div');
    document.body.append(secondContainer);
    const secondRoot = createRoot(secondContainer);
    const restoredStates: EditorState[] = [];

    await act(async () => {
      secondRoot.render(
        <WorkbenchProvider
          editorStateStorage={editorStateStorage}
          editorStateStorageKey={storageKey}
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor'],
            recommendations: [],
          }}
        >
          <CaptureEditorStateProbe
            onState={(state) => {
              restoredStates.push(state);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    expect(restoredStates[0]?.groups).toHaveLength(2);
    expect(restoredStates[0]?.layout).toEqual({
      children: restoredStates[0]?.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      type: 'split',
    });

    await act(async () => {
      secondRoot.unmount();
    });
    secondContainer.remove();
  });

  it('opens built-in explorer item context menus with file and folder actions', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const initialState = {
      expandedPaths: ['src'],
      files: [
        {
          content: 'export const sample = true;',
          path: 'src/App.tsx',
        },
        {
          content: '# Notes',
          path: 'README.md',
        },
      ],
      folders: ['src'],
    } satisfies VirtualWorkspaceInitialState;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.editor', 'workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'explorer',
              visible: true,
            },
          })}
          workspaceHostPort={workspaceHostPort}
        >
          <WorkspaceInitCommandProbe initialState={initialState} onResult={() => undefined} />
          <TestWorkbenchShell />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();
    await act(async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (findButtonByText(container, 'App.tsx')) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    const srcButton = findButtonByText(container, 'src');
    expect(srcButton).toBeDefined();

    await act(async () => {
      dispatchTestMouseEvent(srcButton, 'contextmenu');
    });
    await flushReactEffects();

    const folderMenu = container.querySelector('[role="menu"]');
    expect(folderMenu?.textContent).toContain('New file');
    expect(folderMenu?.textContent).toContain('New folder');
    expect(folderMenu?.textContent).toContain('Reveal folder');
    expect(folderMenu?.textContent).toContain('Copy path');
    expect(folderMenu?.textContent).toContain('Rename');
    expect(folderMenu?.textContent).toContain('Delete folder');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });
    await flushReactEffects();

    const appButton = findButtonByText(container, 'App.tsx');
    expect(appButton).toBeDefined();

    await act(async () => {
      dispatchTestMouseEvent(appButton, 'contextmenu');
    });
    await flushReactEffects();

    const fileMenu = container.querySelector('[role="menu"]');
    expect(fileMenu?.textContent).toContain('Open file');
    expect(fileMenu?.textContent).toContain('Copy path');
    expect(fileMenu?.textContent).toContain('Rename');
    expect(fileMenu?.textContent).toContain('Delete');

    const renameItem = findMenuItemByText(container, 'Rename');
    expect(renameItem).toBeDefined();

    await act(async () => {
      renameItem?.click();
    });
    await flushReactEffects();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await flushReactEffects();

    const inlineEdit = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    );
    expect(inlineEdit?.value).toBe('App.tsx');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('routes workspace create commands through resource transactions', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const commandResults: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          workspaceHostPort={workspaceHostPort}
        >
          <WorkspaceCreateCommandProbe
            onResult={(result) => {
              commandResults.push(result);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    expect(workspaceHostPort.service.getFile('notes.md')).toMatchObject({
      content: '',
      path: 'notes.md',
    });
    expect(workspaceHostPort.service.getTransactionJournal()).toHaveLength(1);
    expect(workspaceHostPort.service.getTransactionJournal()[0]?.mutations).toEqual([
      {
        file: {
          content: '',
          path: 'notes.md',
          source: 'user',
        },
        path: 'notes.md',
        type: 'create-file',
      },
    ]);
    expect(commandResults[0]).toMatchObject({
      path: 'notes.md',
      transactionId: expect.any(String),
    });

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('routes workspace folder move commands through resource transactions', async () => {
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    const commandResults: unknown[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          extensionsConfig={{
            enabled: ['workbench-kit.builtin.explorer'],
            recommendations: [],
          }}
          workspaceHostPort={workspaceHostPort}
        >
          <WorkspaceMoveFolderCommandProbe
            onResult={(result) => {
              commandResults.push(result);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

    expect(workspaceHostPort.service.getFile('docs/components/Button.tsx')).toMatchObject({
      content: 'button',
      path: 'docs/components/Button.tsx',
    });
    expect(workspaceHostPort.service.getState().folders).toEqual([
      'docs',
      'docs/components',
      'src',
    ]);
    expect(workspaceHostPort.service.getTransactionJournal()[1]?.mutations).toEqual([
      {
        sourcePath: 'src/components',
        targetFolderPath: 'docs',
        type: 'move-folder',
      },
    ]);
    expect(commandResults[0]).toMatchObject({
      paths: ['docs/components'],
      transactionId: expect.any(String),
    });

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('notifies view host lifecycle hooks while preserving provider rendering', async () => {
    const events: string[] = [];
    const extension = createLifecycleProbeExtension(events);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={[extension]}
          extensionsConfig={{
            enabled: ['workbench-kit.lifecycle-probe'],
            recommendations: [],
          }}
          initialLayout={parseWorkbenchLayoutConfig({
            sideBar: {
              activeViewContainer: 'lifecycle',
              visible: true,
            },
          })}
        >
          <TestWorkbenchShell editorArea={<main>Editor Area</main>} />
        </WorkbenchProvider>,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Lifecycle Probe',
    );

    expect(container.textContent).toContain('Lifecycle Probe');
    expect(events).toContain('show');

    await act(async () => {
      button?.focus();
    });

    expect(events).toContain('focus');

    await act(async () => {
      root.unmount();
    });
    container.remove();

    expect(events).toEqual(expect.arrayContaining(['hide', 'dispose']));
  });

  it('keeps startup editor resolvers available after StrictMode effect replay', async () => {
    const errors: unknown[] = [];
    const resolvedEditorIds: (string | undefined)[] = [];

    function EditorResolverProbe() {
      const editorService = useEditorService();

      useEffect(() => {
        let cancelled = false;

        void (async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (cancelled) {
            return;
          }

          try {
            resolvedEditorIds.push(editorService.resolveEditorId('workspace://file/config.json'));
          } catch (error) {
            errors.push(error);
          }
        })();

        return () => {
          cancelled = true;
        };
      }, [editorService]);

      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            extensionsConfig={{
              enabled: ['workbench-kit.builtin.editor'],
              recommendations: [],
            }}
          >
            <EditorResolverProbe />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(errors).toEqual([]);
    expect(resolvedEditorIds).toContain('workbench-kit.builtin.editor.text');

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

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === text,
  );
}

function findMenuItemByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
    (button) => button.textContent?.includes(text),
  );
}

function dispatchTestMouseEvent(target: Element | undefined, type: string): void {
  target?.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 36,
    }),
  );
}

async function waitForElement<T extends Element>(query: () => T | null): Promise<T> {
  let element = query();

  await act(async () => {
    for (let attempt = 0; attempt < 20 && !element; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      element = query();
    }
  });

  if (!element) {
    throw new Error('Element was not rendered before timeout.');
  }

  return element;
}

async function waitForText(container: HTMLElement, text: string): Promise<void> {
  let found = false;

  await act(async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (container.textContent?.includes(text)) {
        found = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

  if (!found) {
    throw new Error(`Text was not rendered before timeout: ${text}`);
  }
}

function setTextAreaValue(textarea: HTMLTextAreaElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

  valueSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function createLifecycleProbeExtension(events: string[]): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: ['onView:workbench-kit.lifecycle-probe.view'],
      contributes: {
        activities: [
          {
            icon: 'beaker',
            id: 'workbench-kit.lifecycle-probe.activity',
            title: 'Lifecycle',
            viewContainerId: 'lifecycle',
          },
        ],
        viewContainers: {
          activitybar: [
            {
              icon: 'beaker',
              id: 'lifecycle',
              title: 'Lifecycle',
            },
          ],
        },
        views: {
          lifecycle: [
            {
              containerId: 'lifecycle',
              id: 'workbench-kit.lifecycle-probe.view',
              name: 'Lifecycle',
            },
          ],
        },
      },
      displayName: 'Lifecycle Probe',
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id: 'workbench-kit.lifecycle-probe',
      name: 'lifecycle-probe',
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
    module: {
      activate(context) {
        context.views.registerViewProvider({
          viewId: 'workbench-kit.lifecycle-probe.view',
          resolveViewHost: () => ({
            dispose: () => events.push('dispose'),
            icon: 'beaker',
            onDidBlur: () => events.push('blur'),
            onDidFocus: () => events.push('focus'),
            onDidHide: () => events.push('hide'),
            onDidShow: () => events.push('show'),
            render: () => <button type="button">Lifecycle Probe</button>,
            title: 'Lifecycle Probe',
          }),
        });
      },
    },
  };
}
