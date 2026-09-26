/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  useWorkspaceExplorerController,
  type WorkspaceExplorerController,
} from './useWorkspaceExplorerController';
import type {
  WorkspaceExplorerItemKeyboardActionMeta,
  WorkspaceExplorerMoveRequestMeta,
} from './WorkspaceExplorer';
import type { WorkspaceExplorerControllerPort } from './workspaceExplorerController';
import type { WorkspaceTreeNode } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const file: WorkspaceTreeNode = {
  children: [],
  file: { content: '', path: 'src/App.tsx' },
  name: 'App.tsx',
  path: 'src/App.tsx',
  type: 'file',
};

let controller: WorkspaceExplorerController | undefined;
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

function Host({ port }: { port: WorkspaceExplorerControllerPort }) {
  const current = useWorkspaceExplorerController({
    initialSelection: {
      anchorPath: file.path,
      focusedPath: file.path,
      paths: [file.path],
    },
    port,
  });
  controller = current;
  return null;
}

async function mount(port: WorkspaceExplorerControllerPort) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<Host port={port} />));
}

function actionMeta(): WorkspaceExplorerItemKeyboardActionMeta {
  return {
    actionPaths: [file.path],
    event: new KeyboardEvent('keydown') as unknown as React.KeyboardEvent<HTMLButtonElement>,
    node: file,
    selected: true,
    selection: {
      anchorPath: file.path,
      focusedPath: file.path,
      paths: [file.path],
    },
  };
}

function moveMeta(): WorkspaceExplorerMoveRequestMeta {
  return {
    event: new Event('drop') as unknown as React.DragEvent<HTMLButtonElement>,
    sourcePaths: [file.path],
    targetFolderPath: 'docs',
  };
}

function portWithFailure(
  action: 'delete' | 'move' | 'open',
  mode: 'throw' | 'reject',
  reportError: (message: string) => void,
): WorkspaceExplorerControllerPort {
  const fail = () => {
    const error = new Error(`${action} failed`);
    if (mode === 'throw') {
      throw error;
    }
    return Promise.reject(error);
  };
  return {
    snapshot: { files: [file.file!], folders: ['src', 'docs'] },
    createFile: () => undefined,
    createFolder: () => undefined,
    deleteEntries: action === 'delete' ? fail : () => undefined,
    moveEntries: action === 'move' ? fail : () => undefined,
    openFile: action === 'open' ? fail : () => undefined,
    renameEntry: () => undefined,
    reportError,
  };
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  controller = undefined;
  container?.remove();
  container = undefined;
});

describe('WorkspaceExplorer async action errors', () => {
  it.each([
    ['open', 'throw'],
    ['open', 'reject'],
    ['delete', 'throw'],
    ['delete', 'reject'],
    ['move', 'throw'],
    ['move', 'reject'],
  ] as const)(
    'reports %s failures from a %s port without an unhandled rejection',
    async (action, mode) => {
      const reportError = vi.fn();
      await mount(portWithFailure(action, mode, reportError));

      await act(async () => {
        if (action === 'open') {
          controller!.handleActivateFile(file.path);
        } else if (action === 'delete') {
          controller!.handleRequestDelete(actionMeta());
        } else {
          controller!.handleRequestMove(moveMeta());
        }
        await Promise.resolve();
      });

      expect(reportError).toHaveBeenCalledOnce();
      expect(reportError).toHaveBeenCalledWith(`${action} failed`);
      if (action !== 'open') {
        expect(controller!.selection.paths).toEqual([file.path]);
      }
    },
  );

  it('does not apply a fake success result after a failed move', async () => {
    const reportError = vi.fn();
    const moveEntries = vi.fn(() => Promise.reject(new Error('move failed')));
    await mount({
      ...portWithFailure('open', 'throw', reportError),
      moveEntries,
    });

    await act(async () => {
      controller!.handleRequestMove(moveMeta());
      await Promise.resolve();
    });

    expect(moveEntries).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith('move failed');
    expect(controller!.selection).toEqual({
      anchorPath: file.path,
      focusedPath: file.path,
      paths: [file.path],
    });
  });

  it('reports one rejected rename and permits the same draft to retry', async () => {
    const reportError = vi.fn();
    const renameEntry = vi
      .fn()
      .mockRejectedValueOnce(new Error('rename failed'))
      .mockResolvedValueOnce(undefined);
    await mount({
      ...portWithFailure('open', 'throw', reportError),
      renameEntry,
    });

    const edit = { kind: 'rename-file' as const, path: file.path, value: 'Renamed.tsx' };
    await act(async () => {
      controller!.setInlineEdit(edit);
      controller!.handleInlineEditCommit({ edit, value: edit.value });
      await Promise.resolve();
    });
    expect(reportError).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith('rename failed');

    await act(async () => {
      controller!.handleInlineEditCommit({ edit, value: edit.value });
      await Promise.resolve();
    });
    expect(renameEntry).toHaveBeenCalledTimes(2);
  });
});
