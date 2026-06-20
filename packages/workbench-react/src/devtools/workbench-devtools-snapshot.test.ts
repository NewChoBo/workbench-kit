import { describe, expect, it } from 'vitest';

import {
  createEditorHostFactoryRegistry,
  createEditorService,
  ExtensionRegistry,
  LayoutService,
} from '@workbench-kit/workbench-core';
import {
  createWorkbenchWorkspaceHostPort,
  createWorkspaceResourceTransaction,
} from '@workbench-kit/workspace';

import { collectWorkbenchDevtoolsSnapshot } from './workbench-devtools-snapshot.js';

describe('collectWorkbenchDevtoolsSnapshot', () => {
  it('collects registry, layout, editor, and workspace transaction snapshots', () => {
    const extensionRegistry = new ExtensionRegistry();
    const layoutService = new LayoutService({
      sideBar: {
        activeViewContainer: 'explorer',
        visible: true,
      },
    });
    const editorService = createEditorService({
      editorHostFactories: createEditorHostFactoryRegistry(),
    });
    const workspaceHostPort = createWorkbenchWorkspaceHostPort();
    workspaceHostPort.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'Initialize workspace',
        mutations: [
          {
            type: 'initialize-workspace',
            state: {
              files: [{ path: 'README.md', content: '# Hello' }],
              folders: [],
            },
          },
        ],
      }),
    );

    extensionRegistry.commands.registerCommand({
      id: 'sample.hello',
      title: 'Hello',
    });
    extensionRegistry.capabilityRegistry.registerValue('sample.capability', { ready: true });
    extensionRegistry.views.registerViewContainer({
      id: 'explorer',
      location: 'activitybar',
      title: 'Explorer',
    });
    extensionRegistry.views.registerView({
      containerId: 'explorer',
      id: 'workbench.explorer.files',
      name: 'Files',
    });

    const snapshot = collectWorkbenchDevtoolsSnapshot({
      capturedAt: '2026-06-20T00:00:00.000Z',
      editorService,
      extensionRegistry,
      layoutService,
      workspaceHostPort,
    });

    expect(snapshot.capturedAt).toBe('2026-06-20T00:00:00.000Z');
    expect(snapshot.commands).toEqual([
      {
        category: undefined,
        id: 'sample.hello',
        title: 'Hello',
      },
    ]);
    expect(snapshot.capabilities).toEqual(['sample.capability']);
    expect(snapshot.contextKeys).toMatchObject({
      'editor.openTabCount': 0,
      'layout.sideBar.activeViewContainer': 'explorer',
      'layout.sideBar.visible': true,
      'workspace.hasHostPort': true,
    });
    expect(snapshot.viewContainers).toEqual([
      {
        icon: undefined,
        id: 'explorer',
        location: 'activitybar',
        title: 'Explorer',
      },
    ]);
    expect(snapshot.views).toEqual([
      {
        containerId: 'explorer',
        id: 'workbench.explorer.files',
        name: 'Files',
      },
    ]);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]?.label).toBe('Initialize workspace');
  });
});
