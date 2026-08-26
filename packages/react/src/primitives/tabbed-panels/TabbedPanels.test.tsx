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
    const consumerStyle = document.createElement('style');
    consumerStyle.textContent =
      '.consumer-panel-layout .ui-tabbed-panels__panel { display: grid; padding: 14px; }';
    document.head.append(consumerStyle);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TabbedPanels
          ariaLabel="Content sections"
          className="consumer-panel-layout"
          items={items}
        />,
      );
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
    expect(window.getComputedStyle(panels[0]!).display).toBe('grid');
    expect(window.getComputedStyle(panels[1]!).display).toBe('none');
    expect(window.getComputedStyle(panels[2]!).display).toBe('none');
    expect(panels.map((panel) => panel.tabIndex)).toEqual([0, -1, -1]);
    expect(new Set(tabs.map((tab) => tab.id)).size).toBe(items.length);
    expect(new Set(panels.map((panel) => panel.id)).size).toBe(items.length);

    tabs.forEach((tab, index) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[index]?.id);
      expect(panels[index]?.getAttribute('aria-labelledby')).toBe(tab.id);
    });

    await act(async () => {
      root.unmount();
    });
    consumerStyle.remove();
  });

  it('keeps relationships unique across instances and hostile item ids', async () => {
    const hostileItems = [
      { id: 'shared source', label: 'Source', panel: <div>Source panel</div> },
      { id: 'shared/source', label: 'Defaults', panel: <div>Defaults panel</div> },
    ] as const;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <TabbedPanels items={hostileItems} />
          <TabbedPanels items={hostileItems} />
        </>,
      );
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    const ids = [...tabs, ...panels].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0 && !id.includes(' '))).toBe(true);

    tabs.forEach((tab) => {
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
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
          shiftKey: true,
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

  it('keeps controlled selection and roving focus coherent while a host defers or declines', async () => {
    const onSelect = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const renderControlled = (activeId: string | undefined) => (
      <TabbedPanels activeId={activeId} items={items} onSelect={onSelect} />
    );

    await act(async () => {
      root.render(renderControlled('source'));
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    tabs[0]?.focus();
    await act(async () => {
      tabs[0]?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
        }),
      );
    });

    expect(onSelect).toHaveBeenLastCalledWith('defaults');
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);

    await act(async () => {
      root.render(renderControlled('source'));
    });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);

    await act(async () => {
      root.render(renderControlled('defaults'));
    });
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);

    await act(async () => {
      root.render(renderControlled(undefined));
    });
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      root.unmount();
    });
  });

  it('returns the roving tab stop to the active tab after focus leaves the tablist', async () => {
    const container = document.createElement('div');
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.append(container, outside);
    const root = createRoot(container);
    const renderControlled = (activeId: string) => (
      <TabbedPanels activeId={activeId} items={items} />
    );

    await act(async () => {
      root.render(renderControlled('source'));
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    tabs[0]?.focus();
    await act(async () => {
      tabs[0]?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
        }),
      );
    });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);

    outside.focus();
    await act(async () => {
      root.render(renderControlled('remap'));
    });

    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);
    tabs.find((tab) => tab.tabIndex === 0)?.focus();
    expect(document.activeElement).toBe(tabs[2]);

    await act(async () => {
      root.unmount();
    });
    outside.remove();
  });

  it('restores focus to the surviving selected tab when the focused item is removed', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<TabbedPanels items={items} />);
    });

    const defaultsTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((tab) => tab.textContent === 'Defaults');
    await act(async () => {
      defaultsTab?.click();
    });
    defaultsTab?.focus();
    expect(document.activeElement).toBe(defaultsTab);

    await act(async () => {
      root.render(<TabbedPanels items={[items[0], items[2]]} />);
    });

    const survivingTabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(document.activeElement).toBe(survivingTabs[0]);
    expect(survivingTabs.map((tab) => tab.tabIndex)).toEqual([0, -1]);
    expect(survivingTabs[0]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      root.unmount();
    });
  });
});
