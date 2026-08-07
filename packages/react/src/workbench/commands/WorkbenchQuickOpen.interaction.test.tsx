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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

  it('publishes provider results independently in deterministic provider order', async () => {
    const slowResults = createDeferred<Array<{ id: string; label: string }>>();
    const selectedProviders: string[] = [];
    const failedProviders: string[] = [];
    const providers: QuickOpenProvider[] = [
      {
        id: 'slow.symbols',
        label: 'Symbols',
        search: () => slowResults.promise,
      },
      {
        id: 'failed.actions',
        label: 'Actions',
        search: () => Promise.reject(new Error('provider unavailable')),
      },
      {
        id: 'fast.files',
        label: 'Files',
        search: () => [{ detail: 'src', id: 'shared', label: 'fast.ts' }],
      },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={0}
          providers={providers}
          onClose={() => undefined}
          onProviderError={(_error, failedProvider) => failedProviders.push(failedProvider.id)}
          onSelectItem={(_item, context) => selectedProviders.push(context.providerId)}
        />,
      );
    });

    expect(container.textContent).toContain('fast.ts');
    expect(container.textContent).toContain('Files');
    expect(container.textContent).not.toContain('slow.ts');
    expect(failedProviders).toEqual(['failed.actions']);
    expect(container.querySelector('[role="listbox"]')?.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      slowResults.resolve([{ id: 'shared', label: 'slow.ts' }]);
      await slowResults.promise;
    });

    const resultLabels = Array.from(
      container.querySelectorAll('.ui-workbench-command-item__label'),
    ).map((label) => label.textContent);
    expect(resultLabels).toEqual(['slow.ts', 'fast.ts']);
    expect(
      container.querySelector('[data-active="true"] .ui-workbench-command-item__label')
        ?.textContent,
    ).toBe('fast.ts');
    expect(container.querySelector('[role="listbox"]')?.hasAttribute('aria-busy')).toBe(false);

    await act(async () => {
      container
        .querySelectorAll<HTMLButtonElement>('[role="option"]')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(selectedProviders).toEqual(['fast.files']);

    await act(async () => root.unmount());
    container.remove();
  });

  it('aborts stale provider searches and ignores their late results', async () => {
    const staleResults = createDeferred<Array<{ id: string; label: string }>>();
    const signals: AbortSignal[] = [];
    const cancellableProvider: QuickOpenProvider = {
      id: 'cancellable',
      label: 'Cancellable',
      search: (query, context) => {
        signals.push(context!.signal);
        return query === 'stale'
          ? staleResults.promise
          : [{ id: 'current', label: 'current result' }];
      },
    };
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={0}
          providers={[cancellableProvider]}
          query="stale"
          onClose={() => undefined}
        />,
      );
    });
    expect(signals[0]?.aborted).toBe(false);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={0}
          providers={[cancellableProvider]}
          query="current"
          onClose={() => undefined}
        />,
      );
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(container.textContent).toContain('current result');

    await act(async () => {
      staleResults.resolve([{ id: 'stale', label: 'stale result' }]);
      await staleResults.promise;
    });
    expect(container.textContent).not.toContain('stale result');

    await act(async () => root.unmount());
    expect(signals[1]?.aborted).toBe(true);
    container.remove();
  });

  it('can restrict search to one provider', async () => {
    const searchFirst = vi.fn(() => [{ id: 'first', label: 'first result' }]);
    const searchSecond = vi.fn(() => [{ id: 'second', label: 'second result' }]);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchQuickOpen
          debounceMs={0}
          providerId="second"
          providers={[
            { id: 'first', label: 'First', search: searchFirst },
            { id: 'second', label: 'Second', search: searchSecond },
          ]}
          onClose={() => undefined}
        />,
      );
    });

    expect(searchFirst).not.toHaveBeenCalled();
    expect(searchSecond).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('second result');

    await act(async () => root.unmount());
    container.remove();
  });
});
