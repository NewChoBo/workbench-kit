/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorkbenchLayoutConfig } from '@workbench-kit/workbench-config';
import type { WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';
import {
  createWorkbenchWorkspaceHostPort,
  type VirtualWorkspaceInitialState,
} from '@workbench-kit/workspace';

vi.mock('@monaco-editor/react', () => ({
  default: ({
    onChange,
    value,
  }: {
    onChange?: ((value?: string) => void) | undefined;
    value?: string | undefined;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
  loader: { config: () => undefined },
}));

vi.mock('monaco-editor', () => ({}));

import { WorkbenchProvider, WorkbenchShell, useEditorService, useWorkbench } from './index.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function CommandProbe() {
  const workbench = useWorkbench();

  return <span>{workbench.extensionRegistry.getExtensions().length}</span>;
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
      const result = await executeCommand('workbench-kit.builtin.explorer.move', {
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

describe('WorkbenchProvider', () => {
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
        <WorkbenchShell editorArea={<main>Editor Area</main>} />
      </WorkbenchProvider>,
    );

    expect(markup).toContain('Explorer');
    expect(markup).toContain('codicon codicon-files');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Editor Area');
    expect(markup).toContain('extensions: 1');
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
          <WorkbenchShell editorArea={<main>Editor Area</main>} />
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
    expect(dialog?.textContent).toContain('default: false');

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
          <WorkbenchShell editorArea={<main>Editor Area</main>} />
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
          <WorkbenchShell
            editorArea={<main>Editor Area</main>}
            theme="dark"
            themeOptions={[
              { id: 'dark', label: 'Dark' },
              { id: 'light', label: 'Light' },
            ]}
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
    expect(dialog?.textContent).toContain('Color theme');

    const themeSelect = dialog?.querySelector<HTMLSelectElement>(
      '.workbench-appearance-settings select',
    );
    expect(themeSelect).not.toBeNull();

    await act(async () => {
      themeSelect!.value = 'light';
      themeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

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
          <WorkbenchShell
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
          <WorkbenchShell />
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

    await act(async () => {
      root.unmount();
    });
    container.remove();
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
          <WorkbenchShell />
        </WorkbenchProvider>,
      );
    });

    await flushReactEffects();

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
          <WorkbenchShell editorArea={<main>Editor Area</main>} />
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
