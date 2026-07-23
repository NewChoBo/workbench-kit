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
});
