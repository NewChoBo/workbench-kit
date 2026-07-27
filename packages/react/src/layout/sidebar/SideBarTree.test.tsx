/** @vitest-environment jsdom */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  flattenVisibleSideBarTreeItems,
  isSideBarTreeBranch,
  selectSideBarTreeIds,
  SideBarTree,
  toggleSideBarTreeId,
  type SideBarTreeItem,
} from './SideBarTree';

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
});
