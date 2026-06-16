/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorkbenchLayoutConfig } from '@workbench-kit/workbench-config';
import type { WorkbenchExtensionDescription } from '@workbench-kit/workbench-core';

import { WorkbenchProvider, WorkbenchShell, useEditorService, useWorkbench } from './index.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function CommandProbe() {
  const workbench = useWorkbench();

  return <span>{workbench.extensionRegistry.getExtensions().length}</span>;
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
    expect(markup).toContain('Editor Area');
    expect(markup).toContain('extensions: 1');
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
