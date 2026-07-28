/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchQuickOpen, type QuickOpenProvider } from './WorkbenchQuickOpen';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const provider: QuickOpenProvider = {
  id: 'test.files',
  label: 'Files',
  search: (query) => {
    const items = [
      { id: 'a.ts', label: 'a.ts' },
      { id: 'b.ts', label: 'b.ts' },
      { id: 'readme.md', label: 'readme.md' },
    ];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => item.label.includes(normalized));
  },
};

describe('WorkbenchQuickOpen interactions', () => {
  it('debounces provider search and selects with Enter', async () => {
    vi.useFakeTimers();
    const selected: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={50}
          open={true}
          providers={[provider]}
          onClose={() => undefined}
          onSelectItem={(item) => {
            selected.push(item.id);
          }}
        />,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(container.querySelector('[data-active="true"]')?.textContent).toContain('a.ts');

    const input = container.querySelector(
      '.ui-workbench-command-palette__input',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      input!.value = 'readme';
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      // TextInput uses onValueChange via controlled path; drive through React by re-render query.
    });

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={50}
          open={true}
          providers={[provider]}
          query="readme"
          onClose={() => undefined}
          onSelectItem={(item) => {
            selected.push(item.id);
          }}
        />,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(container.querySelector('[data-active="true"]')?.textContent).toContain('readme.md');

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
      );
    });

    expect(selected).toEqual(['readme.md']);

    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('closes on Escape via modal focus trap', async () => {
    let closed = false;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={0}
          open={true}
          providers={[provider]}
          onClose={() => {
            closed = true;
          }}
        />,
      );
    });

    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(closed).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
