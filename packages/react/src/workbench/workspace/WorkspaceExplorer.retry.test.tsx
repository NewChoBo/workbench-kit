/** @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceExplorer } from './WorkspaceExplorer';
import {
  useWorkspaceExplorerController,
  type WorkspaceExplorerController,
} from './useWorkspaceExplorerController';
import type { WorkspaceExplorerControllerPort } from './workspaceExplorerController';
import type { WorkspaceTreeNode } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const node: WorkspaceTreeNode = {
  children: [],
  file: { content: '', path: 'src/App.tsx' },
  name: 'App.tsx',
  path: 'src/App.tsx',
  type: 'file',
};
const nodes: WorkspaceTreeNode[] = [{ children: [node], name: 'src', path: 'src', type: 'folder' }];

let container: HTMLDivElement;
let root: Root | undefined;
let activeController: WorkspaceExplorerController | undefined;

function Host({ port }: { port: WorkspaceExplorerControllerPort }) {
  const controller = useWorkspaceExplorerController({
    initialExpandedPaths: ['src'],
    port,
  });
  activeController = controller;

  useEffect(() => {
    controller.startRename(node);
  }, [controller.startRename]);

  return (
    <WorkspaceExplorer
      expandedPaths={controller.expandedPaths}
      inlineEdit={controller.inlineEdit}
      nodes={nodes}
      onActivateFile={controller.handleActivateFile}
      onInlineEditCancel={controller.cancelInlineEdit}
      onInlineEditCommit={controller.handleInlineEditCommit}
      onInlineEditValueChange={controller.handleInlineEditValueChange}
      onToggleFolder={controller.handleToggleFolder}
    />
  );
}

async function mount(port: WorkspaceExplorerControllerPort) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<Host port={port} />));
}

async function changeInput(value: string) {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Workspace item name"]',
  );
  expect(input).not.toBeNull();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    input!.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function keyEnter() {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Workspace item name"]',
  );
  expect(input).not.toBeNull();
  await act(async () => {
    input!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  });
}

async function keyEscape() {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Workspace item name"]',
  );
  expect(input).not.toBeNull();
  await act(async () => {
    input!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
  });
}

async function blurInput() {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Workspace item name"]',
  );
  expect(input).not.toBeNull();
  await act(async () => {
    input!.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  activeController = undefined;
  document.body.replaceChildren();
});

describe('WorkspaceExplorer inline rename retry', () => {
  it('retries after two identical validation failures and calls renameEntry', async () => {
    const renameEntry = vi.fn(() => undefined);
    const port: WorkspaceExplorerControllerPort = {
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    };

    await mount(port);
    await changeInput('bad/name');
    await keyEnter();
    await keyEnter();
    await changeInput('valid.txt');
    await keyEnter();

    expect(renameEntry).toHaveBeenCalledTimes(1);
    expect(renameEntry).toHaveBeenCalledWith({
      kind: 'file',
      name: 'valid.txt',
      path: 'src/App.tsx',
    });
  });

  it('retries after three identical validation failures', async () => {
    const renameEntry = vi.fn(() => undefined);
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('bad/name');
    await keyEnter();
    await keyEnter();
    await keyEnter();
    await changeInput('third.txt');
    await keyEnter();

    expect(renameEntry).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft after a collision and retries with a new name', async () => {
    const renameEntry = vi.fn(() => undefined);
    await mount({
      snapshot: {
        files: [node.file!, { content: '', path: 'src/Existing.tsx' }],
        folders: ['src'],
      },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('Existing.tsx');
    await keyEnter();
    expect(container.querySelector('.ui-sidebar-inline-edit__error')?.textContent).toContain(
      'Existing.tsx already exists.',
    );
    await changeInput('Available.tsx');
    await keyEnter();

    expect(renameEntry).toHaveBeenCalledTimes(1);
  });

  it('deduplicates Enter, blur, and repeated Enter while rename is pending', async () => {
    let resolveRename!: () => void;
    const renameEntry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRename = resolve;
        }),
    );
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('Pending.tsx');
    await keyEnter();
    await blurInput();
    await keyEnter();
    expect(renameEntry).toHaveBeenCalledTimes(1);
    resolveRename();
    await act(async () => await Promise.resolve());
  });

  it('opens a retry after a rejected rename promise', async () => {
    let rejectRename!: (error: Error) => void;
    const renameEntry = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRename = reject;
        }),
    );
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('Retry.tsx');
    await keyEnter();
    rejectRename(new Error(''));
    await act(async () => await Promise.resolve());
    await keyEnter();

    expect(renameEntry).toHaveBeenCalledTimes(2);
  });

  it('does not let an old promise clear or report over a replacement draft', async () => {
    let resolveFirst!: () => void;
    const renameEntry = vi.fn((input: { name: string }) => {
      if (input.name === 'Old.tsx') {
        return new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return undefined;
    });
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('Old.tsx');
    await keyEnter();
    await act(async () => {
      activeController!.setInlineEdit({
        id: 'replacement',
        kind: 'rename-file',
        path: 'src/App.tsx',
        value: 'Replacement.tsx',
      });
    });
    resolveFirst();
    await act(async () => await Promise.resolve());

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    );
    expect(input?.value).toBe('Replacement.tsx');
    await keyEnter();
    expect(renameEntry).toHaveBeenCalledTimes(2);
  });

  it('ignores an old rejection after a replacement draft starts submitting', async () => {
    let rejectOld!: (error: Error) => void;
    let resolveNew!: () => void;
    const renameEntry = vi.fn((input: { name: string }) => {
      if (input.name === 'Old.tsx') {
        return new Promise<void>((_resolve, reject) => {
          rejectOld = reject;
        });
      }
      return new Promise<void>((resolve) => {
        resolveNew = resolve;
      });
    });
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('Old.tsx');
    await keyEnter();
    await act(async () => {
      activeController!.setInlineEdit({
        id: 'replacement-pending',
        kind: 'rename-file',
        path: 'src/App.tsx',
        value: 'New.tsx',
      });
    });
    await keyEnter();
    rejectOld(new Error('old failure'));
    await act(async () => await Promise.resolve());

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    );
    expect(input?.value).toBe('New.tsx');
    expect(container.querySelector('.ui-sidebar-inline-edit__error')).toBeNull();
    await keyEnter();
    expect(renameEntry).toHaveBeenCalledTimes(2);
    resolveNew();
  });

  it('preserves later typing when the original pending rename rejects', async () => {
    let rejectRename!: (error: Error) => void;
    const renameEntry = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRename = reject;
        }),
    );
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await changeInput('First.tsx');
    await keyEnter();
    await changeInput('Later.tsx');
    rejectRename(new Error('temporary failure'));
    await act(async () => await Promise.resolve());

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    );
    expect(input?.value).toBe('Later.tsx');
    await keyEnter();
    expect(renameEntry).toHaveBeenCalledTimes(2);
  });

  it('cancels an idle draft with Escape without committing', async () => {
    const renameEntry = vi.fn(() => undefined);
    await mount({
      snapshot: { files: [node.file!], folders: ['src'] },
      createFile: () => undefined,
      createFolder: () => undefined,
      deleteEntries: () => undefined,
      openFile: () => undefined,
      renameEntry,
    });

    await keyEscape();

    expect(renameEntry).not.toHaveBeenCalled();
    expect(container.querySelector('input[aria-label="Workspace item name"]')).toBeNull();
  });
});
