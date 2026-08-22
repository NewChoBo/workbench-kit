/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchEditorTabs } from './WorkbenchEditorTabs';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchEditorTabs', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens a Close context menu that respects closable: false', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onClose = vi.fn();
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="library"
          onClose={onClose}
          onSelect={onSelect}
          tabs={[
            { closable: false, id: 'library', label: 'Library' },
            { closable: true, id: 'item-1', label: 'Item One' },
          ]}
        />,
      );
    });

    const libraryTab = container.querySelector('[aria-selected="true"]');
    expect(libraryTab).toBeTruthy();

    await act(async () => {
      libraryTab?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 24,
        }),
      );
    });

    expect(onSelect).toHaveBeenCalledWith('library');

    const menu = document.querySelector('[aria-label="Editor tab menu"]');
    expect(menu).toBeTruthy();

    const closeButton = Array.from(menu?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Close'),
    );
    expect(closeButton).toBeTruthy();
    expect(
      closeButton?.hasAttribute('disabled') || closeButton?.getAttribute('aria-disabled'),
    ).toBeTruthy();

    const closeOthersButton = Array.from(menu?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Close others'),
    );
    expect(closeOthersButton).toBeTruthy();

    await act(async () => {
      closeOthersButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledWith('item-1');
    expect(onClose).not.toHaveBeenCalledWith('library');

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps the observer and appends host items without replacing built-ins', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onClose = vi.fn();
    const onInspect = vi.fn();
    const onTabContextMenu = vi.fn();

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="middle"
          getExtraTabContextMenuItems={(tabId) => [
            { id: 'inspect', label: 'Inspect tab', onSelect: () => onInspect(tabId) },
          ]}
          onClose={onClose}
          onSelect={() => undefined}
          onTabContextMenu={onTabContextMenu}
          tabs={[
            { id: 'first', label: 'First' },
            { id: 'middle', label: 'Middle' },
            { closable: false, id: 'pinned', label: 'Pinned' },
            { id: 'last', label: 'Last' },
          ]}
        />,
      );
    });

    const middleTab = container.querySelector('[aria-selected="true"]');
    expect(middleTab).toBeTruthy();

    await act(async () => {
      middleTab?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });

    expect(onTabContextMenu).toHaveBeenCalledOnce();
    expect(onTabContextMenu).toHaveBeenCalledWith('middle', expect.any(Object));

    const menu = document.querySelector('[aria-label="Editor tab menu"]');
    expect(menu).toBeTruthy();
    expect(
      Array.from(menu?.querySelectorAll('button') ?? []).map((button) => button.textContent),
    ).toEqual(['Close', 'Close others', 'Close to the right', 'Close all', 'Inspect tab']);
    expect(menu?.querySelectorAll('[role="separator"]')).toHaveLength(1);

    const inspectButton = Array.from(menu?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Inspect tab',
    );
    await act(async () => {
      inspectButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onInspect).toHaveBeenCalledWith('middle');
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('restores focus to the editor tab currentTarget after Escape', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchEditorTabs
          activeId="library"
          onClose={() => undefined}
          onSelect={() => undefined}
          tabs={[{ id: 'library', label: 'Library' }]}
        />,
      );
    });

    const libraryTab = container.querySelector<HTMLElement>('[aria-selected="true"]');
    expect(libraryTab).toBeTruthy();

    await act(async () => {
      libraryTab?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 24,
        }),
      );
    });

    expect(document.activeElement).toBe(
      document.querySelector<HTMLElement>('[aria-label="Editor tab menu"] [role="menuitem"]'),
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(document.querySelector('[aria-label="Editor tab menu"]')).toBeNull();
    expect(document.activeElement).toBe(libraryTab);

    await act(async () => {
      root.unmount();
    });
  });
});
