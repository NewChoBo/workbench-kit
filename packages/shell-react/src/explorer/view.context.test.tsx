/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkbenchWorkspaceHostPort,
  createWorkspaceResourceTransaction,
} from '@workbench-kit/workspace';
import { BuiltinExplorerView } from './view.js';

const provider = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../shell/provider.js', () => ({ useWorkbench: () => provider.current }));
vi.mock('../editor/use-editor.js', () => ({ useActiveEditorTab: () => undefined }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const executeCommand = vi.fn(async (_commandId: string, _payload?: unknown) => undefined);
const createHost = () =>
  createWorkbenchWorkspaceHostPort({
    initialState: {
      files: ['a.md', 'b.md', 'c.md'].map((path) => ({ path, content: `Content of ${path}` })),
      folders: ['empty'],
    },
  });
let host: ReturnType<typeof createHost>;

beforeEach(async () => {
  executeCommand.mockClear();
  host = createHost();
  provider.current = { executeCommand, workspaceHostPort: host };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<BuiltinExplorerView />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  host.dispose?.();
});

function row(path: string) {
  const element = container.querySelector<HTMLButtonElement>(
    `button[data-workspace-path="${path}"]`,
  );
  expect(element, `row ${path}`).not.toBeNull();
  return element!;
}
function button(label: string) {
  const element = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.getAttribute('aria-label') === label || item.textContent === label,
  );
  expect(element, `button ${label}`).toBeDefined();
  return element!;
}
function menu() {
  return document.querySelector('[role="menu"]');
}
async function pointer(element: HTMLElement, type = 'click', init: MouseEventInit = {}) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  });
}
async function key(element: Element, value: string, shiftKey = false) {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true }),
    );
  });
}

describe('BuiltinExplorerView context ownership', () => {
  it('restores the invoked row rather than the previously focused row on Escape', async () => {
    row('a.md').focus();
    await pointer(row('b.md'), 'contextmenu');
    expect(menu()?.getAttribute('aria-label')).toBe('b.md menu');
    expect(executeCommand).not.toHaveBeenCalled();
    await key(menu()!, 'Escape');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(row('b.md'));
  });

  it.each(['more', 'keyboard'])(
    'opens the %s menu without opening a file and restores its invoker',
    async (entry) => {
      const invoker = entry === 'more' ? button('More actions for b.md') : row('b.md');
      if (entry === 'more') await pointer(invoker);
      else await key(invoker, 'F10', true);
      expect(menu()?.getAttribute('aria-label')).toBe('b.md menu');
      expect(executeCommand).not.toHaveBeenCalled();
      await key(menu()!, 'Escape');
      expect(document.activeElement).toBe(invoker);
    },
  );

  it('keeps multi-file targets for a selected row menu and moves subsequent keyboard actions', async () => {
    await pointer(row('a.md'));
    await pointer(row('b.md'), 'click', { ctrlKey: true });
    executeCommand.mockClear();
    await pointer(row('a.md'), 'contextmenu');
    expect(container.querySelectorAll('[role="treeitem"][aria-selected="true"]')).toHaveLength(2);
    const copy = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (item) => item.textContent?.includes('Copy path'),
    );
    expect(copy).toBeDefined();
    await pointer(copy!);
    expect(executeCommand).toHaveBeenCalledWith('workspace.copyPath', { paths: ['a.md', 'b.md'] });
    executeCommand.mockClear();
    await pointer(row('b.md'), 'contextmenu');
    await key(menu()!, 'Escape');
    await key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(row('c.md'));
    await key(document.activeElement!, 'Delete');
    expect(executeCommand).toHaveBeenCalledWith('workspace.delete', {
      kind: 'file',
      paths: ['c.md'],
    });
  });

  it('invalidates a menu when its workspace snapshot changes', async () => {
    await pointer(row('b.md'), 'contextmenu');
    const oldMenu = menu();
    expect(oldMenu).not.toBeNull();
    await act(async () => {
      host.service.applyTransaction(
        createWorkspaceResourceTransaction({
          label: 'Remove fixture target',
          mutations: [{ type: 'delete-file', path: 'b.md' }],
        }),
      );
    });
    expect(menu()).toBeNull();
    expect(oldMenu?.isConnected).toBe(false);
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it('invalidates a menu when the workspace service is replaced', async () => {
    await pointer(row('b.md'), 'contextmenu');
    const replacement = createHost();
    provider.current = { executeCommand, workspaceHostPort: replacement };
    await act(async () => root.render(<BuiltinExplorerView />));
    expect(menu()).toBeNull();
    expect(executeCommand).not.toHaveBeenCalled();
    replacement.dispose?.();
  });

  it('invalidates an existing menu when inline creation begins', async () => {
    await pointer(row('b.md'), 'contextmenu');
    await pointer(button('New file'));
    expect(container.querySelector('input[aria-label="Workspace item name"]')).not.toBeNull();
    expect(menu()).toBeNull();
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it('surfaces a rejected right-click Delete action without changing selection', async () => {
    await pointer(row('b.md'), 'contextmenu');
    const deleteItem = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (item) => item.textContent?.includes('Delete'),
    );
    expect(deleteItem).toBeDefined();
    executeCommand.mockRejectedValueOnce(new Error('Save the affected editor first.'));

    await pointer(deleteItem!);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Save the affected editor first.',
    );
    expect(container.querySelector('[data-workspace-path="b.md"]')).not.toBeNull();
    expect(host.service.getFile('b.md')).toBeDefined();
  });
});
