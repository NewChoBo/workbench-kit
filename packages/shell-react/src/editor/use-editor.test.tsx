/** @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEFAULT_EDITOR_GROUP_ID,
  type WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

import { WorkbenchProvider, useWorkbench } from '../shell/provider.js';
import { useEditorHost, useEditorService } from './use-editor.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const LATE_EDITOR_ID = 'workbench-kit.tests.late-editor';
const LATE_EDITOR_URI = 'workbench://late-editor/sample-a';
const LATE_EXTENSION_ID = 'workbench-kit.tests.late-editor-host';
const LATE_VIEW_ID = 'workbench-kit.tests.late-editor-host.view';

function EditorServiceProbe() {
  const { editorService } = useWorkbench();
  return <span>{editorService.getState().groups[0]?.id ?? 'missing'}</span>;
}

function EditorHookProbe() {
  const editorService = useEditorService();
  return <span>{editorService.getState().activeGroupId ?? 'missing'}</span>;
}

function LateHostProbe({ onReady }: { onReady: (label: string) => void }) {
  const host = useEditorHost();
  const { extensionRegistry } = useWorkbench();

  useEffect(() => {
    void extensionRegistry.activateByEvent(`onView:${LATE_VIEW_ID}`);
  }, [extensionRegistry]);

  useEffect(() => {
    onReady(host ? 'host-ready' : 'host-missing');
  }, [host, onReady]);

  return <span>{host ? 'host-ready' : 'host-missing'}</span>;
}

describe('editor service wiring', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it('exposes editor service from workbench context', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: [],
          recommendations: [],
        }}
      >
        <EditorServiceProbe />
      </WorkbenchProvider>,
    );

    expect(markup).toContain(DEFAULT_EDITOR_GROUP_ID);
  });

  it('exposes editor service through useEditorService', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchProvider
        extensionsConfig={{
          enabled: [],
          recommendations: [],
        }}
      >
        <EditorHookProbe />
      </WorkbenchProvider>,
    );

    expect(markup).toContain(DEFAULT_EDITOR_GROUP_ID);
  });

  it('recreates editor hosts after late onView extension activation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const labels: string[] = [];

    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={[createLateEditorHostExtension()]}
          extensionsConfig={{
            enabled: [LATE_EXTENSION_ID],
            recommendations: [],
          }}
          initialEditorState={{
            activeGroupId: DEFAULT_EDITOR_GROUP_ID,
            groups: [
              {
                activeTabId: 'tab-late',
                id: DEFAULT_EDITOR_GROUP_ID,
                tabs: [
                  {
                    dirty: false,
                    editorId: LATE_EDITOR_ID,
                    id: 'tab-late',
                    pinned: false,
                    preview: false,
                    resourceUri: LATE_EDITOR_URI,
                    title: 'Late Sample',
                  },
                ],
              },
            ],
            layout: {
              groupId: DEFAULT_EDITOR_GROUP_ID,
              type: 'group',
            },
          }}
          persistEditorState={false}
          persistLayout={false}
        >
          <LateHostProbe
            onReady={(label) => {
              labels.push(label);
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await act(async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (container.textContent?.includes('host-ready')) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    expect(container.textContent).toContain('host-ready');
    expect(labels).toContain('host-missing');
    expect(labels).toContain('host-ready');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

function createLateEditorHostExtension(): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: [`onView:${LATE_VIEW_ID}`],
      contributes: {
        activities: [
          {
            icon: 'beaker',
            id: 'workbench-kit.tests.late-editor-host.activity',
            title: 'Late Host',
            viewContainerId: 'late-host',
          },
        ],
        viewContainers: {
          activitybar: [
            {
              icon: 'beaker',
              id: 'late-host',
              title: 'Late Host',
            },
          ],
        },
        views: {
          'late-host': [
            {
              containerId: 'late-host',
              id: LATE_VIEW_ID,
              name: 'Late Host',
            },
          ],
        },
      },
      displayName: 'Late Editor Host',
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id: LATE_EXTENSION_ID,
      name: 'late-editor-host',
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
    module: {
      activate(context) {
        context.editorHostFactories.registerFactory({
          id: 'workbench-kit.tests.late-editor-host.factory',
          priority: 20,
          canCreate: ({ editorId }) => editorId === LATE_EDITOR_ID,
          create: ({ resourceUri }) => ({
            dispose() {},
            getDirty: () => false,
            render: () => ({ kind: 'late-editor', resourceUri }),
            setDirty() {},
          }),
        });
      },
    },
  };
}
