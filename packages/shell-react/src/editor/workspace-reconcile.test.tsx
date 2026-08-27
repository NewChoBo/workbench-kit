/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditorService } from '@workbench-kit/workbench-core';
import type {
  VirtualWorkspaceState,
  WorkspaceChangeEvent,
  WorkspaceResourceService,
} from '@workbench-kit/workspace';

import { EditorWorkspaceReconciler } from './workspace-reconcile.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<ReturnType<typeof createRoot>> = [];
const mountedContainers: HTMLElement[] = [];

afterEach(async () => {
  await act(async () => {
    for (const root of mountedRoots.splice(0)) root.unmount();
  });
  for (const container of mountedContainers.splice(0)) container.remove();
});

describe('EditorWorkspaceReconciler direct inputs', () => {
  it.each([undefined, null, {}, { getState: () => createState([]) }])(
    'ignores an absent or invalid workspace service: %s',
    async (workspaceHostService) => {
      const reconcileWorkspaceFileTabs = vi.fn();

      await renderReconciler({ reconcileWorkspaceFileTabs }, workspaceHostService);

      expect(reconcileWorkspaceFileTabs).not.toHaveBeenCalled();
    },
  );

  it('reconciles initial files and workspace updates from the supplied service', async () => {
    const reconcileWorkspaceFileTabs = vi.fn();
    const workspace = createWorkspaceService(['src/initial.ts']);

    await renderReconciler({ reconcileWorkspaceFileTabs }, workspace.service);

    expectAvailability(reconcileWorkspaceFileTabs, {
      'workspace://file/src/initial.ts': true,
      'workspace://file/src/missing.ts': false,
    });

    await act(async () => workspace.update(['src/updated.ts']));

    expectAvailability(reconcileWorkspaceFileTabs, {
      'workspace://file/src/initial.ts': false,
      'workspace://file/src/updated.ts': true,
    });
  });

  it('unsubscribes on cleanup and performs no later reconciliation', async () => {
    const reconcileWorkspaceFileTabs = vi.fn();
    const workspace = createWorkspaceService(['src/initial.ts']);
    const root = await renderReconciler({ reconcileWorkspaceFileTabs }, workspace.service);
    const callsBeforeCleanup = reconcileWorkspaceFileTabs.mock.calls.length;

    await act(async () => root.unmount());
    mountedRoots.splice(mountedRoots.indexOf(root), 1);
    expect(workspace.dispose).toHaveBeenCalledOnce();

    await act(async () => workspace.update(['src/after-cleanup.ts']));
    expect(reconcileWorkspaceFileTabs).toHaveBeenCalledTimes(callsBeforeCleanup);
  });
});

async function renderReconciler(
  editorService: Pick<EditorService, 'reconcileWorkspaceFileTabs'>,
  workspaceHostService: unknown,
) {
  const container = document.createElement('div');
  document.body.append(container);
  mountedContainers.push(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  await act(async () => {
    root.render(
      <EditorWorkspaceReconciler
        editorService={editorService as EditorService}
        workspaceHostService={workspaceHostService}
      />,
    );
  });
  return root;
}

function createWorkspaceService(initialPaths: readonly string[]) {
  let state = createState(initialPaths);
  let listener: ((event: WorkspaceChangeEvent) => void) | undefined;
  const dispose = vi.fn(() => {
    listener = undefined;
  });
  const service = {
    getState: () => state,
    onDidChangeWorkspace: (nextListener: (event: WorkspaceChangeEvent) => void) => {
      listener = nextListener;
      return dispose;
    },
  } as WorkspaceResourceService;

  return {
    dispose,
    service,
    update: (paths: readonly string[]) => {
      state = createState(paths);
      listener?.({ state } as WorkspaceChangeEvent);
    },
  };
}

function createState(paths: readonly string[]): VirtualWorkspaceState {
  return {
    expandedPaths: new Set(),
    files: paths.map((path) => ({ content: '', path })),
    folders: [],
    openPaths: [],
    searchQuery: '',
  };
}

function expectAvailability(
  reconcileWorkspaceFileTabs: ReturnType<typeof vi.fn>,
  expectations: Readonly<Record<string, boolean>>,
) {
  const checker = reconcileWorkspaceFileTabs.mock.lastCall?.[0] as
    ((resourceUri: string) => boolean) | undefined;
  expect(checker).toBeTypeOf('function');
  for (const [resourceUri, expected] of Object.entries(expectations)) {
    expect(checker?.(resourceUri)).toBe(expected);
  }
}
