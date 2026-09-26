/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceSelectionState } from '@workbench-kit/workspace';
import { ContextMenu } from '../../overlay/ContextMenu';
import {
  WorkspaceExplorer,
  type WorkspaceExplorerItemContextMenuRequest,
  type WorkspaceExplorerProps,
} from './WorkspaceExplorer';
import type { WorkspaceTreeNode } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const files = ['src/Alpha.txt', 'src/Beta.txt', 'src/Gamma.txt'];
const nodes: WorkspaceTreeNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'folder',
    children: files.map((path) => ({
      name: path.slice(4),
      path,
      type: 'file',
      children: [],
      file: { path, content: path },
    })),
  },
  { name: 'archive', path: 'archive', type: 'folder', children: [] },
];
const initialSelection: WorkspaceSelectionState = {
  anchorPath: files[0],
  focusedPath: files[0],
  paths: [files[0]!, files[1]!],
};
let container: HTMLDivElement;
let root: Root | undefined;
let currentSelection: WorkspaceSelectionState;
let overrides: Partial<WorkspaceExplorerProps>;
let normalized: boolean;
let showMenu: boolean;
let request = vi.fn<(value: WorkspaceExplorerItemContextMenuRequest) => void>();
let activate = vi.fn();
let toggle = vi.fn();
let legacy = vi.fn();
let remove = vi.fn();
let rename = vi.fn();
let selectionChanged = vi.fn();
let commit = vi.fn();
let cancel = vi.fn();
let background = vi.fn();

function Host() {
  const [selection, setSelection] = useState(initialSelection);
  const [expandedPaths, setExpandedPaths] = useState(new Set(['src']));
  const [menu, setMenu] = useState<WorkspaceExplorerItemContextMenuRequest | null>(null);
  currentSelection = selection;
  return (
    <>
      <WorkspaceExplorer
        expandedPaths={expandedPaths}
        nodes={nodes}
        focusedPath={selection.focusedPath}
        selectedPaths={selection.paths}
        selectionAnchorPath={selection.anchorPath}
        onActivateFile={activate}
        onToggleFolder={(path) => {
          toggle(path);
          setExpandedPaths((previous) => {
            const next = new Set(previous);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
          });
        }}
        onItemContextMenu={legacy}
        onRequestItemContextMenu={
          normalized
            ? (value) => {
                request(value);
                if (showMenu) setMenu(value);
              }
            : undefined
        }
        onRequestDelete={remove}
        onRequestRename={rename}
        onSelectionChange={(value, meta) => {
          selectionChanged(value, meta);
          setSelection(value);
        }}
        onInlineEditCommit={commit}
        onInlineEditCancel={cancel}
        onBackgroundContextMenu={(event) => {
          background(event);
          event.preventDefault();
        }}
        {...overrides}
      />
      {menu ? (
        <ContextMenu
          ariaLabel="Explorer test actions"
          items={[{ label: 'Inspect', onSelect: vi.fn() }]}
          x={menu.x}
          y={menu.y}
          returnFocusTarget={menu.invoker}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  );
}

async function mount(
  options: {
    normalized?: boolean;
    showMenu?: boolean;
    props?: Partial<WorkspaceExplorerProps>;
  } = {},
) {
  normalized = options.normalized ?? true;
  showMenu = options.showMenu ?? false;
  overrides = options.props ?? {};
  request = vi.fn();
  activate = vi.fn();
  toggle = vi.fn();
  legacy = vi.fn();
  remove = vi.fn();
  rename = vi.fn();
  selectionChanged = vi.fn();
  commit = vi.fn();
  cancel = vi.fn();
  background = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<Host />));
}

function row(path: string): HTMLButtonElement {
  const result = container.querySelector<HTMLButtonElement>(
    `button[data-workspace-path="${path}"]`,
  );
  expect(result).not.toBeNull();
  return result!;
}

function more(path: string): HTMLButtonElement {
  const result = container.querySelector<HTMLButtonElement>(
    `button[aria-label="More actions for ${path}"]`,
  );
  expect(result).not.toBeNull();
  return result!;
}

async function fire(target: Element, event: Event) {
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
}

function context(target: Element) {
  return fire(
    target,
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 120,
      clientY: 160,
    }),
  );
}

function key(target: Element, value: string, shiftKey = false) {
  return fire(
    target,
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, shiftKey }),
  );
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('WorkspaceExplorer context ownership', () => {
  it('preserves the selected set and anchor while focusing the pointer target once', async () => {
    await mount();
    const invoker = row(files[1]!);
    const event = await context(invoker);
    expect(event.defaultPrevented).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    const opened = request.mock.calls[0]![0];
    expect(opened.node.path).toBe(files[1]);
    expect(opened.invoker).toBe(invoker);
    expect([opened.x, opened.y]).toEqual([120, 160]);
    expect(opened.meta.actionPaths).toEqual([files[0], files[1]]);
    expect(opened.meta.selected).toBe(true);
    expect(currentSelection).toEqual({
      anchorPath: files[0],
      focusedPath: files[1],
      paths: [files[0], files[1]],
    });
    expect(selectionChanged).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(invoker);
    expect(legacy).not.toHaveBeenCalled();
    expect(background).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });

  it.each([
    ['unselected file', 'src/Gamma.txt', ['src/Gamma.txt'], 'src/Gamma.txt'],
    ['folder', 'archive', [], undefined],
  ] as const)(
    'selects the %s target without opening or expanding it',
    async (_label, path, paths, anchorPath) => {
      await mount();
      await context(row(path));
      expect(currentSelection).toEqual({ anchorPath, focusedPath: path, paths });
      expect(request.mock.calls[0]?.[0].meta.actionPaths).toEqual([path]);
      expect(activate).not.toHaveBeenCalled();
      expect(toggle).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(rename).not.toHaveBeenCalled();
    },
  );

  it('preserves the real pointer callback fallback without adding inert keyboard or More entries', async () => {
    await mount({ normalized: false });
    const invoker = row(files[1]!);
    const event = await context(invoker);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(legacy.mock.calls[0]?.[0].nativeEvent).toBe(event);
    expect(legacy.mock.calls[0]?.[1].path).toBe(files[1]);
    expect(legacy.mock.calls[0]?.[2].actionPaths).toEqual([files[0], files[1]]);
    expect(currentSelection.focusedPath).toBe(files[1]);
    expect(container.querySelector('[aria-label^="More actions for"]')).toBeNull();
    expect((await key(invoker, 'F10', true)).defaultPrevented).toBe(false);
    expect((await key(invoker, 'ContextMenu')).defaultPrevented).toBe(false);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['More', 'Shift+F10', 'ContextMenu'])(
    'uses the real invoker rectangle and common targets for %s',
    async (entry) => {
      await mount();
      const invoker = entry === 'More' ? more(files[1]!) : row(files[1]!);
      vi.spyOn(invoker, 'getBoundingClientRect').mockReturnValue({
        left: 48,
        bottom: 96,
      } as DOMRect);
      if (entry === 'More') await act(async () => invoker.click());
      else
        expect(
          (await key(invoker, entry === 'Shift+F10' ? 'F10' : 'ContextMenu', entry === 'Shift+F10'))
            .defaultPrevented,
        ).toBe(true);
      expect(request).toHaveBeenCalledTimes(1);
      const opened = request.mock.calls[0]![0];
      expect(opened.invoker).toBe(invoker);
      expect([opened.x, opened.y]).toEqual([48, 96]);
      expect(opened.node.path).toBe(files[1]);
      expect(opened.meta.actionPaths).toEqual([files[0], files[1]]);
      expect(currentSelection.focusedPath).toBe(files[1]);
      expect(document.activeElement).toBe(invoker);
      expect(activate).not.toHaveBeenCalled();
      expect(toggle).not.toHaveBeenCalled();
      expect(legacy).not.toHaveBeenCalled();
    },
  );

  it('keeps custom action siblings independent from More and row keyboard actions', async () => {
    const custom = vi.fn();
    await mount({
      props: {
        renderItemActions: (node) => (
          <button aria-label={`Custom ${node.path}`} onClick={custom}>
            Custom
          </button>
        ),
      },
    });
    const invoker = more(files[1]!);
    expect(invoker.closest('.ui-sidebar-list-item')).toBeNull();
    expect(invoker.parentElement?.closest('li')).toBe(row(files[1]!).closest('li'));
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Custom src/Beta.txt"]')!.click(),
    );
    await key(invoker, 'Delete');
    await key(invoker, 'F2');
    await key(invoker, 'Enter');
    await key(invoker, ' ');
    expect(custom).toHaveBeenCalledTimes(1);
    expect(activate).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    await key(invoker, 'ContextMenu');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0].invoker).toBe(invoker);
  });

  it('returns from Escape to B then moves DOM focus and Delete or F2 targets to C', async () => {
    await mount({ showMenu: true });
    await context(row(files[1]!));
    const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu).not.toBeNull();
    await key(menu, 'Escape');
    expect(document.activeElement).toBe(row(files[1]!));
    await key(row(files[1]!), 'ArrowDown');
    expect(document.activeElement).toBe(row(files[2]!));
    expect(currentSelection).toEqual({
      anchorPath: files[2],
      focusedPath: files[2],
      paths: [files[2]],
    });
    await key(document.activeElement!, 'Delete');
    await key(document.activeElement!, 'F2');
    expect(remove.mock.calls[0]?.[0]).toMatchObject({
      node: { path: files[2] },
      actionPaths: [files[2]],
    });
    expect(rename.mock.calls[0]?.[0]).toMatchObject({
      node: { path: files[2] },
      actionPaths: [files[2]],
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(activate).not.toHaveBeenCalled();
  });

  it('moves real focus for Home End arrows and horizontal folder navigation', async () => {
    await mount();
    const endFocus = vi.spyOn(row('archive'), 'focus');
    await act(async () => row(files[1]!).focus());
    await key(row(files[1]!), 'End');
    expect(document.activeElement).toBe(row('archive'));
    expect(endFocus).toHaveBeenCalledExactlyOnceWith();
    await key(row('archive'), 'Home');
    expect(document.activeElement).toBe(row('src'));
    await key(row('src'), 'ArrowRight');
    expect(document.activeElement).toBe(row(files[0]!));
    await key(row(files[0]!), 'ArrowDown');
    expect(document.activeElement).toBe(row(files[1]!));
    await key(row(files[1]!), 'ArrowUp');
    expect(document.activeElement).toBe(row(files[0]!));
    await key(row(files[0]!), 'ArrowLeft');
    expect(document.activeElement).toBe(row('src'));
    await key(row('src'), 'ArrowLeft');
    expect(toggle).toHaveBeenLastCalledWith('src');
    expect(container.querySelector('[data-workspace-path="src/Alpha.txt"]')).toBeNull();
    expect(document.activeElement).toBe(row('src'));
    expect(activate).not.toHaveBeenCalled();
  });

  it('preserves native rename menus and prevents context entry from committing an active draft', async () => {
    await mount({
      props: {
        inlineEdit: { id: 'rename', kind: 'rename-file', path: files[0], value: 'Alpha.txt' },
      },
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    )!;
    expect(document.activeElement).toBe(input);
    input.setSelectionRange(1, 4);
    expect((await context(input)).defaultPrevented).toBe(false);
    expect((await key(input, 'F10', true)).defaultPrevented).toBe(false);
    expect(background).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    const pointer = await fire(
      row(files[1]!),
      new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true }),
    );
    expect(pointer.defaultPrevented).toBe(true);
    await context(row(files[1]!));
    expect(more(files[1]!).disabled).toBe(true);
    await act(async () => more(files[1]!).click());
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
    expect(input.value).toBe('Alpha.txt');
    expect(request).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('retains inline rename Enter retry and Escape cancellation after native context use', async () => {
    const draft = {
      id: 'rename',
      kind: 'rename-file' as const,
      path: files[0],
      value: 'Renamed.txt',
    };
    await mount({ props: { inlineEdit: draft } });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Workspace item name"]',
    )!;
    await context(input);
    await key(input, 'Enter');
    expect(commit).toHaveBeenCalledExactlyOnceWith({ edit: draft, value: 'Renamed.txt' });
    overrides = { inlineEdit: { ...draft, error: 'Name already exists' } };
    await act(async () => root!.render(<Host />));
    await key(input, 'Enter');
    expect(commit).toHaveBeenCalledTimes(2);
    await key(input, 'Escape');
    expect(cancel).toHaveBeenCalledExactlyOnceWith(overrides.inlineEdit);
    expect(request).not.toHaveBeenCalled();
  });
});
