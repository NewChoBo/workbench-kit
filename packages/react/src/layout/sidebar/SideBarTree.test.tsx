/** @vitest-environment jsdom */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  flattenVisibleSideBarTreeItems,
  isSideBarTreeBranch,
  selectSideBarTreeIds,
  SideBarTree,
  toggleSideBarTreeId,
  type SideBarTreeItem,
  type SideBarTreeProps,
} from './SideBarTree';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_ITEMS: SideBarTreeItem[] = [
  {
    id: 'providers',
    label: 'Providers',
    children: [
      { id: 'steam', label: 'Steam' },
      { id: 'epic', label: 'Epic' },
    ],
  },
  { id: 'favorites', label: 'Favorites' },
];

type TreeInputs = Pick<SideBarTreeProps, 'items' | 'expandedIds' | 'selectedIds'> &
  Partial<Pick<SideBarTreeProps, 'keyboardNavigation' | 'selectionMode'>>;

const mountedTrees: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const unmount of mountedTrees.splice(0)) await unmount();
});

async function mountTree(inputs: TreeInputs) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onExpandedIdsChange = vi.fn();
  const onSelectedIdsChange = vi.fn();
  let current = inputs;
  const render = async (patch: Partial<TreeInputs> = {}) => {
    current = { ...current, ...patch };
    await act(async () => {
      root.render(
        <SideBarTree
          {...current}
          onExpandedIdsChange={onExpandedIdsChange}
          onSelectedIdsChange={onSelectedIdsChange}
        />,
      );
    });
  };
  const row = (id: string): HTMLButtonElement => {
    const button = container.querySelector<HTMLButtonElement>(`[data-sidebar-tree-id="${id}"]`);
    if (!button) throw new Error(`Missing tree row: ${id}`);
    return button;
  };
  await render();
  mountedTrees.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  return { container, onExpandedIdsChange, onSelectedIdsChange, render, row };
}

async function focusRow(row: HTMLButtonElement) {
  await act(async () => row.focus());
  expect(document.activeElement).toBe(row);
}

async function pressKey(row: HTMLButtonElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => row.dispatchEvent(event));
  return event;
}

function lastIds(callback: ReturnType<typeof vi.fn>): string[] {
  const ids = callback.mock.lastCall?.[0] as Set<string> | undefined;
  return ids ? [...ids] : [];
}

describe('SideBarTree helpers', () => {
  it('treats children presence as the branch convention', () => {
    expect(isSideBarTreeBranch({ id: 'a', label: 'A', children: [] })).toBe(true);
    expect(isSideBarTreeBranch({ id: 'b', label: 'B' })).toBe(false);
  });

  it('flattens only expanded branches', () => {
    const collapsed = flattenVisibleSideBarTreeItems(SAMPLE_ITEMS, new Set());
    expect(collapsed.map((row) => row.item.id)).toEqual(['providers', 'favorites']);

    const expanded = flattenVisibleSideBarTreeItems(SAMPLE_ITEMS, new Set(['providers']));
    expect(expanded.map((row) => row.item.id)).toEqual(['providers', 'steam', 'epic', 'favorites']);
    expect(expanded.find((row) => row.item.id === 'steam')?.depth).toBe(1);
    expect(expanded.find((row) => row.item.id === 'steam')?.parentId).toBe('providers');
  });

  it('toggles expand ids and selects single / multi', () => {
    expect([...toggleSideBarTreeId(new Set(['a']), 'b')].sort()).toEqual(['a', 'b']);
    expect([...toggleSideBarTreeId(new Set(['a', 'b']), 'a')]).toEqual(['b']);

    expect([...selectSideBarTreeIds(new Set(['a']), 'b', 'single', false)]).toEqual(['b']);
    expect([...selectSideBarTreeIds(new Set(['a']), 'b', 'multi', true)].sort()).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('SideBarTree', () => {
  it('renders tree roles and expands on branch click', async () => {
    const onExpandedIdsChange = vi.fn();
    const onSelectedIdsChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SideBarTree
          expandedIds={new Set()}
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onExpandedIdsChange={onExpandedIdsChange}
          onSelectedIdsChange={onSelectedIdsChange}
        />,
      );
    });

    expect(container.querySelector('[role="tree"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(2);

    const providers = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Providers'),
    );
    expect(providers).toBeTruthy();

    await act(async () => {
      providers?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectedIdsChange).toHaveBeenCalled();
    const selectedCalls = onSelectedIdsChange.mock.calls;
    const selected = selectedCalls[selectedCalls.length - 1]?.[0] as Set<string>;
    expect([...selected]).toEqual(['providers']);

    expect(onExpandedIdsChange).toHaveBeenCalled();
    const expandedCalls = onExpandedIdsChange.mock.calls;
    const expanded = expandedCalls[expandedCalls.length - 1]?.[0] as Set<string>;
    expect([...expanded]).toEqual(['providers']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('expands with ArrowRight when keyboard navigation is enabled', async () => {
    const onExpandedIdsChange = vi.fn();
    const onSelectedIdsChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SideBarTree
          expandedIds={new Set()}
          items={SAMPLE_ITEMS}
          selectedIds={new Set(['providers'])}
          onExpandedIdsChange={onExpandedIdsChange}
          onSelectedIdsChange={onSelectedIdsChange}
        />,
      );
    });

    const tree = container.querySelector('[role="tree"]');
    expect(tree).not.toBeNull();

    await act(async () => {
      tree?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });

    expect(onExpandedIdsChange).toHaveBeenCalled();
    const expandedCalls = onExpandedIdsChange.mock.calls;
    const expanded = expandedCalls[expandedCalls.length - 1]?.[0] as Set<string>;
    expect([...expanded]).toEqual(['providers']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it.each(['single', 'multi'] as const)(
    'moves DOM focus with ArrowUp and ArrowDown in %s mode before Enter activates the focused row',
    async (selectionMode) => {
      const tree = await mountTree({
        items: SAMPLE_ITEMS,
        expandedIds: new Set(),
        selectedIds: new Set(['favorites']),
        selectionMode,
      });
      await focusRow(tree.row('favorites'));

      await pressKey(tree.row('favorites'), 'ArrowUp');
      expect(document.activeElement).toBe(tree.row('providers'));
      expect(tree.row('providers').tabIndex).toBe(0);
      if (selectionMode === 'single')
        expect(lastIds(tree.onSelectedIdsChange)).toEqual(['providers']);
      else expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();

      await pressKey(tree.row('providers'), 'Enter');
      expect(document.activeElement).toBe(tree.row('providers'));
      expect(lastIds(tree.onSelectedIdsChange)).toEqual(['providers']);

      await pressKey(tree.row('providers'), 'ArrowDown');
      expect(document.activeElement).toBe(tree.row('favorites'));
      expect(tree.row('favorites').tabIndex).toBe(0);
      if (selectionMode === 'single')
        expect(lastIds(tree.onSelectedIdsChange)).toEqual(['favorites']);
      else expect(tree.onSelectedIdsChange).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps multi-selection on arrows and honors Ctrl/Meta activation on the focused row', async () => {
    const tree = await mountTree({
      items: SAMPLE_ITEMS,
      expandedIds: new Set(),
      selectedIds: new Set(['favorites']),
      selectionMode: 'multi',
    });
    await focusRow(tree.row('favorites'));
    await pressKey(tree.row('favorites'), 'ArrowUp');
    expect(document.activeElement).toBe(tree.row('providers'));
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();

    await pressKey(tree.row('providers'), 'Enter', { ctrlKey: true });
    expect(lastIds(tree.onSelectedIdsChange).sort()).toEqual(['favorites', 'providers']);
    await tree.render({ selectedIds: new Set(['favorites', 'providers']) });
    await pressKey(tree.row('providers'), ' ', { metaKey: true });
    expect(lastIds(tree.onSelectedIdsChange)).toEqual(['favorites']);
    expect(document.activeElement).toBe(tree.row('providers'));
  });

  it('keeps focus on an expanding or collapsing branch and moves it to an enabled child or parent', async () => {
    const tree = await mountTree({
      items: SAMPLE_ITEMS,
      expandedIds: new Set(),
      selectedIds: new Set(['providers']),
    });
    await focusRow(tree.row('providers'));
    await pressKey(tree.row('providers'), 'ArrowRight');
    expect(document.activeElement).toBe(tree.row('providers'));
    expect(lastIds(tree.onExpandedIdsChange)).toEqual(['providers']);

    await tree.render({ expandedIds: new Set(['providers']) });
    await pressKey(tree.row('providers'), 'ArrowRight');
    expect(document.activeElement).toBe(tree.row('steam'));
    expect(lastIds(tree.onSelectedIdsChange)).toEqual(['steam']);

    await pressKey(tree.row('steam'), 'ArrowLeft');
    expect(document.activeElement).toBe(tree.row('providers'));
    expect(lastIds(tree.onSelectedIdsChange)).toEqual(['providers']);

    await pressKey(tree.row('providers'), 'ArrowLeft');
    expect(document.activeElement).toBe(tree.row('providers'));
    expect(lastIds(tree.onExpandedIdsChange)).toEqual([]);
  });

  it('does not move focus or selection through a disabled neighboring row', async () => {
    const tree = await mountTree({
      items: [
        { id: 'first', label: 'First' },
        { id: 'disabled', label: 'Disabled', disabled: true },
        { id: 'last', label: 'Last' },
      ],
      expandedIds: new Set(),
      selectedIds: new Set(['first']),
    });
    await focusRow(tree.row('first'));
    await pressKey(tree.row('first'), 'ArrowDown');
    expect(document.activeElement).toBe(tree.row('first'));
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();

    await focusRow(tree.row('last'));
    await pressKey(tree.row('last'), 'ArrowUp');
    expect(document.activeElement).toBe(tree.row('last'));
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();
  });

  it('keeps an enabled child focused when its expanded parent is disabled', async () => {
    const tree = await mountTree({
      items: [
        {
          id: 'disabled-parent',
          label: 'Disabled parent',
          disabled: true,
          children: [{ id: 'enabled-child', label: 'Enabled child' }],
        },
      ],
      expandedIds: new Set(['disabled-parent']),
      selectedIds: new Set(['enabled-child']),
    });
    await focusRow(tree.row('enabled-child'));
    await pressKey(tree.row('enabled-child'), 'ArrowLeft');
    expect(document.activeElement).toBe(tree.row('enabled-child'));
    expect(tree.row('enabled-child').tabIndex).toBe(0);
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();
    expect(tree.onExpandedIdsChange).not.toHaveBeenCalled();

    await pressKey(tree.row('enabled-child'), 'ArrowUp');
    expect(document.activeElement).toBe(tree.row('enabled-child'));
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();
  });

  it('does not steal focus on an external controlled update', async () => {
    const tree = await mountTree({
      items: SAMPLE_ITEMS,
      expandedIds: new Set(),
      selectedIds: new Set(),
    });
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    mountedTrees.push(async () => outside.remove());
    await act(async () => outside.focus());
    expect(document.activeElement).toBe(outside);

    await tree.render({
      expandedIds: new Set(['providers']),
      selectedIds: new Set(['steam']),
    });
    expect(document.activeElement).toBe(outside);
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();
    expect(tree.onExpandedIdsChange).not.toHaveBeenCalled();
  });

  it('leaves arrow, activation and Tab keys alone when keyboard navigation is disabled', async () => {
    const tree = await mountTree({
      items: SAMPLE_ITEMS,
      expandedIds: new Set(),
      selectedIds: new Set(['favorites']),
      keyboardNavigation: false,
    });
    await focusRow(tree.row('favorites'));
    for (const key of ['ArrowUp', 'Enter', 'Tab']) {
      const event = await pressKey(tree.row('favorites'), key);
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(tree.row('favorites'));
    }
    expect(tree.onSelectedIdsChange).not.toHaveBeenCalled();
    expect(tree.onExpandedIdsChange).not.toHaveBeenCalled();

    await tree.render({ keyboardNavigation: true });
    expect((await pressKey(tree.row('favorites'), 'Tab')).defaultPrevented).toBe(false);
  });
});
