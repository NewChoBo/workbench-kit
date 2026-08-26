/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabbedPanels } from './TabbedPanels';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const items = [
  { id: 'source', label: 'Source', panel: <div>Source panel</div> },
  { id: 'defaults', label: 'Defaults', panel: <div>Defaults panel</div> },
  { id: 'remap', label: 'Remap', panel: <div>Remap panel</div> },
] as const;

describe('TabbedPanels', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('links every tab to a unique panel and keeps one roving tab stop', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<TabbedPanels ariaLabel="Content sections" items={items} />);
    });

    const tablist = container.querySelector('[role="tablist"]');
    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

    expect(tablist?.getAttribute('aria-label')).toBe('Content sections');
    expect(tablist?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
    expect(new Set(tabs.map((tab) => tab.id)).size).toBe(items.length);
    expect(new Set(panels.map((panel) => panel.id)).size).toBe(items.length);

    tabs.forEach((tab, index) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[index]?.id);
      expect(panels[index]?.getAttribute('aria-labelledby')).toBe(tab.id);
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('wraps Arrow navigation and supports Home and End with automatic activation', async () => {
    const onSelect = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<TabbedPanels items={items} onSelect={onSelect} />);
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const press = async (tab: HTMLButtonElement, key: string) => {
      await act(async () => {
        tab.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
      });
    };

    tabs[0]?.focus();
    await press(tabs[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);

    await press(tabs[2]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs[0]);
    await press(tabs[0]!, 'End');
    expect(document.activeElement).toBe(tabs[2]);
    await press(tabs[2]!, 'Home');
    expect(document.activeElement).toBe(tabs[0]);
    expect(onSelect.mock.calls.map(([id]) => id)).toEqual(['remap', 'source', 'remap', 'source']);

    const panels = Array.from(container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
    expect(container.textContent).toContain('Source panel');
    expect(container.textContent).not.toContain('Defaults panel');

    await act(async () => {
      root.unmount();
    });
  });

  it('leaves modified arrow keys to the host', async () => {
    const onSelect = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<TabbedPanels items={items} onSelect={onSelect} />);
    });

    const firstTab = container.querySelector<HTMLButtonElement>('[role="tab"]');
    firstTab?.focus();
    await act(async () => {
      firstTab?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          key: 'ArrowRight',
        }),
      );
    });

    expect(document.activeElement).toBe(firstTab);
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });
});
